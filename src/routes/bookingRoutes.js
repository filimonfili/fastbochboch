import express from "express";
import supabase from "../config/supabase.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { getIO } from "../socket/index.js";

const router = express.Router();

const MIN_BOOKED_SLOTS = 3;
const GAME_DURATION_SECONDS = 40;

router.post("/", requireAuth, async (req, res) => {
  try {
    const { gameId, slotNumbers } = req.body;

    // ==========================================
    // VALIDATE GAME ID
    // ==========================================

    if (!gameId) {
      return res.status(400).json({
        message: "gameId is required",
      });
    }

    // ==========================================
    // VALIDATE SLOT ARRAY
    // ==========================================

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

    // ==========================================
    // PREVENT DUPLICATE SLOTS
    // ==========================================

    const uniqueSlots = [...new Set(slots)];

    if (uniqueSlots.length !== slots.length) {
      return res.status(400).json({
        message: "Duplicate slots are not allowed",
      });
    }

    // ==========================================
    // GET GAME
    // ==========================================

    const { data: currentGame, error: currentGameError } = await supabase
      .from("games")
      .select(
        "id, game_number, status, total_slots, slot_price, countdown_started_at, draw_at",
      )
      .eq("id", gameId)
      .single();

    if (currentGameError || !currentGame) {
      console.error("Failed to get game before booking:", currentGameError);

      return res.status(404).json({
        message: "Game not found",
      });
    }

    // ==========================================
    // ONLY WAITING AND LIVE GAMES CAN BE BOOKED
    // ==========================================

    if (!["WAITING", "LIVE"].includes(currentGame.status)) {
      return res.status(400).json({
        message: "This game is no longer accepting bookings",
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
    // COUNT CONFIRMED BOOKED SLOTS
    // ==========================================

    const { count: soldSlots, error: countError } = await supabase
      .from("bookings")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("game_id", gameId)
      .eq("status", "CONFIRMED");

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
    // START COUNTDOWN WHEN 3 SLOTS ARE BOOKED
    // ==========================================

    let gameStarted = false;
    let countdownStartedAt = currentGame.countdown_started_at;
    let drawAt = currentGame.draw_at;

    if (
      currentGame.status === "WAITING" &&
      totalSoldSlots >= MIN_BOOKED_SLOTS
    ) {
      const startTime = new Date();

      const newDrawAt = new Date(
        startTime.getTime() + GAME_DURATION_SECONDS * 1000,
      );

      // IMPORTANT:
      // Only one request can successfully change
      // WAITING → LIVE.
      //
      // This protects us if multiple players book
      // at almost exactly the same time.

      const { data: startedGame, error: startError } = await supabase
        .from("games")
        .update({
          status: "LIVE",
          countdown_started_at: startTime.toISOString(),
          draw_at: newDrawAt.toISOString(),
        })
        .eq("id", gameId)
        .eq("status", "WAITING")
        .select("id, game_number, status, countdown_started_at, draw_at")
        .maybeSingle();

      if (startError) {
        console.error("Failed to start game countdown:", startError);

        return res.status(500).json({
          message: "Slots were booked, but failed to start the game",
        });
      }

      // Only the request that actually changed
      // WAITING → LIVE gets to broadcast game:start.
      if (startedGame) {
        gameStarted = true;

        countdownStartedAt = startedGame.countdown_started_at;

        drawAt = startedGame.draw_at;

        const io = getIO();

        io.to(`game:${gameId}`).emit("game:start", {
          gameId: startedGame.id,
          gameNumber: startedGame.game_number,

          status: "LIVE",

          countdownStartedAt,
          drawAt,

          serverTime: new Date().toISOString(),
        });

        console.log(
          `🔥 Game #${startedGame.game_number} started — ${totalSoldSlots} slots booked`,
        );

        console.log("🔥 GAME START EVENT EMITTED:", {
          gameId,
          gameNumber: startedGame.game_number,
          countdownStartedAt,
          drawAt,
        });
      }
    }

    // ==========================================
    // SOCKET: BROADCAST BOOKED SLOTS
    // ==========================================

    const io = getIO();

    io.to(`game:${gameId}`).emit("slot:booked", {
      gameId,
      slotNumbers: uniqueSlots,
      soldSlots: totalSoldSlots,
      totalPrize,

      status: gameStarted ? "LIVE" : currentGame.status,

      countdownStartedAt,
      drawAt,
    });

    console.log("🔥 SLOT BOOKED EVENT EMITTED:", {
      gameId,
      slotNumbers: uniqueSlots,
      soldSlots: totalSoldSlots,
      totalPrize,
      status: gameStarted ? "LIVE" : currentGame.status,
    });

    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(201).json({
      message: "Slots booked successfully",

      booking: data,

      soldSlots: totalSoldSlots,
      totalPrize,

      status: gameStarted ? "LIVE" : currentGame.status,

      countdownStartedAt,
      drawAt,
    });
  } catch (error) {
    console.error("Create booking error:", error);

    return res.status(500).json({
      message: "Failed to book slots",
    });
  }
});

export default router;
