import express from "express";
import supabase from "../config/supabase.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

const DRAW_PRESENTATION_DURATION = 22;

// --------------------------------------------------
// GET CURRENT GAME
// --------------------------------------------------

router.get("/current", requireAuth, async (req, res) => {
  try {
    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("*")
      .in("status", ["LIVE", "DRAWING"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (gameError) {
      throw gameError;
    }

    if (!game) {
      return res.status(404).json({
        message: "No active game",
      });
    }

    const { count, error: countError } = await supabase
      .from("slots")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("game_id", game.id)
      .eq("is_booked", true);

    if (countError) {
      throw countError;
    }

    res.json({
      game,
      soldSlots: count || 0,
      remainingSlots: game.total_slots - (count || 0),
    });
  } catch (error) {
    console.error("Get current game error:", error);

    res.status(500).json({
      message: "Failed to get current game",
    });
  }
});

// --------------------------------------------------
// GET BOOKED SLOTS
// --------------------------------------------------

router.get("/current/slots", requireAuth, async (req, res) => {
  try {
    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("id")
      .in("status", ["LIVE", "DRAWING"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (gameError) {
      throw gameError;
    }

    if (!game) {
      return res.status(404).json({
        message: "No active game",
      });
    }

    const { data: slots, error: slotsError } = await supabase
      .from("slots")
      .select("slot_number")
      .eq("game_id", game.id)
      .eq("is_booked", true)
      .order("slot_number", {
        ascending: true,
      });

    if (slotsError) {
      throw slotsError;
    }

    res.json({
      bookedSlots: slots.map((slot) => slot.slot_number),
    });
  } catch (error) {
    console.error("Get booked slots error:", error);

    res.status(500).json({
      message: "Failed to get booked slots",
    });
  }
});

// --------------------------------------------------
// GET GAME RESULT
// --------------------------------------------------

router.get("/:gameId/result", requireAuth, async (req, res) => {
  try {
    const { gameId } = req.params;

    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("id, game_number, status, draw_at, drawn_at")
      .eq("id", gameId)
      .maybeSingle();

    if (gameError) {
      throw gameError;
    }

    if (!game) {
      return res.status(404).json({
        message: "Game not found",
      });
    }

    if (game.status !== "FINISHED") {
      return res.status(400).json({
        message: "Game result is not ready",
      });
    }

    // --------------------------------------------------
    // SOLD SLOTS
    // --------------------------------------------------

    const { count: soldSlots, error: soldError } = await supabase
      .from("slots")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("game_id", gameId)
      .eq("is_booked", true);

    if (soldError) {
      throw soldError;
    }

    // --------------------------------------------------
    // WINNER
    // --------------------------------------------------

    const { data: winner, error: winnerError } = await supabase
      .from("winners")
      .select("slot_number, prize_amount, user_id")
      .eq("game_id", gameId)
      .eq("position", 1)
      .maybeSingle();

    if (winnerError) {
      throw winnerError;
    }

    res.json({
      gameNumber: game.game_number,
      startedAt: game.draw_at,
      drawnAt: game.drawn_at,
      soldSlots: soldSlots || 0,
      prizeAmount: winner?.prize_amount || 0,
      winnerSlot: winner?.slot_number || null,
      isWinner: winner?.user_id === req.user.userId,
    });
  } catch (error) {
    console.error("Get game result error:", error);

    res.status(500).json({
      message: "Failed to get game result",
    });
  }
});

// --------------------------------------------------
// CHECK CURRENT DRAW PRESENTATION
// --------------------------------------------------

router.get("/current-draw", requireAuth, async (req, res) => {
  try {
    /*
     * DRAWING must always be recoverable.
     *
     * We do NOT use the 22-second window for DRAWING games.
     * If the backend says DRAWING, the frontend must be able
     * to recover it regardless of when the request arrives.
     */

    const { data: drawingGame, error: drawingError } = await supabase
      .from("games")
      .select("id, game_number, status, draw_at, drawn_at")
      .eq("status", "DRAWING")
      .order("draw_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (drawingError) {
      throw drawingError;
    }

    /*
     * If a game is currently DRAWING, return it immediately.
     */
    if (drawingGame) {
      const drawStartedAt = new Date(drawingGame.draw_at).getTime();

      const elapsed = (Date.now() - drawStartedAt) / 1000;

      const remainingSeconds = Math.max(
        0,
        Math.ceil(DRAW_PRESENTATION_DURATION - elapsed),
      );

      /*
       * Get sold slot count.
       */
      const { count: soldSlots, error: soldError } = await supabase
        .from("slots")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("game_id", drawingGame.id)
        .eq("is_booked", true);

      if (soldError) {
        throw soldError;
      }

      return res.json({
        active: true,

        gameId: drawingGame.id,

        gameNumber: drawingGame.game_number,

        status: "DRAWING",

        startedAt: drawingGame.draw_at,

        drawnAt: drawingGame.drawn_at,

        remainingSeconds,

        soldSlots: soldSlots || 0,

        winnerSlot: null,

        prizeAmount: 0,

        isWinner: false,
      });
    }

    /*
     * ------------------------------------------------------
     * FINISHED DRAW RECOVERY
     * ------------------------------------------------------
     *
     * If the game already finished, keep the 22-second
     * presentation window so a player who briefly leaves
     * the Mini App can still recover the result.
     */

    const windowStart = new Date(
      Date.now() - DRAW_PRESENTATION_DURATION * 1000,
    ).toISOString();

    const { data: finishedGame, error: finishedError } = await supabase
      .from("games")
      .select("id, game_number, status, draw_at, drawn_at")
      .eq("status", "FINISHED")
      .gte("draw_at", windowStart)
      .order("draw_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (finishedError) {
      throw finishedError;
    }

    if (!finishedGame) {
      return res.json({
        active: false,
      });
    }

    const drawStartedAt = new Date(finishedGame.draw_at).getTime();

    const elapsed = (Date.now() - drawStartedAt) / 1000;

    const remainingSeconds = Math.max(
      0,
      Math.ceil(DRAW_PRESENTATION_DURATION - elapsed),
    );

    if (remainingSeconds <= 0) {
      return res.json({
        active: false,
      });
    }

    /*
     * Get winner.
     */
    const { data: winner, error: winnerError } = await supabase
      .from("winners")
      .select("slot_number, prize_amount, user_id")
      .eq("game_id", finishedGame.id)
      .eq("position", 1)
      .maybeSingle();

    if (winnerError) {
      throw winnerError;
    }

    /*
     * Get sold slot count.
     */
    const { count: soldSlots, error: soldError } = await supabase
      .from("slots")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("game_id", finishedGame.id)
      .eq("is_booked", true);

    if (soldError) {
      throw soldError;
    }

    return res.json({
      active: true,

      gameId: finishedGame.id,

      gameNumber: finishedGame.game_number,

      status: "FINISHED",

      startedAt: finishedGame.draw_at,

      drawnAt: finishedGame.drawn_at,

      remainingSeconds,

      soldSlots: soldSlots || 0,

      winnerSlot: winner?.slot_number || null,

      prizeAmount: winner?.prize_amount || 0,

      isWinner: winner?.user_id === req.user.userId,
    });
  } catch (error) {
    console.error("Check current draw error:", error);

    res.status(500).json({
      message: "Failed to check current draw",
    });
  }
});

export default router;
