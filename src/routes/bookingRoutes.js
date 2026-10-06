import express from "express";
import supabase from "../config/supabase.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { getIO } from "../socket/index.js";

const router = express.Router();

router.post("/", requireAuth, async (req, res) => {
  try {
    const { gameId, slotNumbers } = req.body;

    // Validate game ID
    if (!gameId) {
      return res.status(400).json({
        message: "gameId is required",
      });
    }

    // Validate slot array
    if (!Array.isArray(slotNumbers) || slotNumbers.length === 0) {
      return res.status(400).json({
        message: "slotNumbers must be a non-empty array",
      });
    }

    // Convert values to numbers
    const slots = slotNumbers.map(Number);

    // Make sure every value is an integer
    if (slots.some((slot) => !Number.isInteger(slot))) {
      return res.status(400).json({
        message: "Invalid slot numbers",
      });
    }

    // Make sure slots are between 1 and 400
    if (slots.some((slot) => slot < 1 || slot > 400)) {
      return res.status(400).json({
        message: "Slot numbers must be between 1 and 400",
      });
    }

    // Prevent duplicate slots
    const uniqueSlots = [...new Set(slots)];

    if (uniqueSlots.length !== slots.length) {
      return res.status(400).json({
        message: "Duplicate slots are not allowed",
      });
    }

    // ==========================================
    // BOOK ALL SELECTED SLOTS ATOMICALLY
    // ==========================================

    const { data, error } = await supabase.rpc("book_slots", {
      p_user_id: req.user.userId,
      p_game_id: gameId,
      p_slot_numbers: uniqueSlots,
    });

    if (error) {
      console.error("Booking error:", error);

      return res.status(400).json({
        message: error.message,
      });
    }

    // ==========================================
    // GET UPDATED GAME TOTALS
    // ==========================================

    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("id, total_slots, slot_price")
      .eq("id", gameId)
      .single();

    if (gameError || !game) {
      console.error("Failed to get game after booking:", gameError);

      return res.status(500).json({
        message: "Slots were booked, but failed to get updated game state",
      });
    }

    // Count all booked slots for this game
    const { count: soldSlots, error: countError } = await supabase
      .from("bookings")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("game_id", gameId);

    if (countError) {
      console.error("Failed to count sold slots:", countError);

      return res.status(500).json({
        message: "Slots were booked, but failed to calculate game totals",
      });
    }

    const totalSoldSlots = soldSlots || 0;

    // Prize = sold slots × 16 ETB
    const totalPrize = totalSoldSlots * 16;

    // ==========================================
    // SOCKET: BROADCAST UPDATED GAME STATE
    // ==========================================

    const io = getIO();

    io.to(`game:${gameId}`).emit("slot:booked", {
      gameId,
      slotNumbers: uniqueSlots,
      soldSlots: totalSoldSlots,
      totalPrize,
    });

    console.log("🔥 SLOT BOOKED EVENT EMITTED:", {
      gameId,
      slotNumbers: uniqueSlots,
      soldSlots: totalSoldSlots,
      totalPrize,
    });

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(201).json({
      message: "Slots booked successfully",
      booking: data,
      soldSlots: totalSoldSlots,
      totalPrize,
    });
  } catch (error) {
    console.error("Create booking error:", error);

    return res.status(500).json({
      message: "Failed to book slots",
    });
  }
});

export default router;
