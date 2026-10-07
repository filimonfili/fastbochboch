import express from "express";
import supabase from "../config/supabase.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

const SHAKE_DURATION_MS = 5 * 1000;
const REVEAL_DURATION_MS = 5 * 1000;
const RESULT_DURATION_MS = 10 * 1000;

const DRAW_PRESENTATION_DURATION_MS =
  SHAKE_DURATION_MS + REVEAL_DURATION_MS + RESULT_DURATION_MS;

// ============================================================
// BUILD SERVER AUTHORITATIVE DRAW TIMELINE
// ============================================================

const buildDrawTimeline = (drawAt) => {
  const startedAt = new Date(drawAt).getTime();

  if (Number.isNaN(startedAt)) {
    throw new Error(`Invalid draw_at: ${drawAt}`);
  }

  const shakeEndsAt = startedAt + SHAKE_DURATION_MS;

  const revealEndsAt = shakeEndsAt + REVEAL_DURATION_MS;

  const resultEndsAt = revealEndsAt + RESULT_DURATION_MS;

  return {
    startedAt: new Date(startedAt).toISOString(),

    shakeEndsAt: new Date(shakeEndsAt).toISOString(),

    revealEndsAt: new Date(revealEndsAt).toISOString(),

    resultEndsAt: new Date(resultEndsAt).toISOString(),
  };
};

// ============================================================
// RECOVER EXPIRED LIVE GAME
// ============================================================
//
// This is important for Render cold starts.
//
// If Render was sleeping when draw_at passed:
//
// LIVE
//   ↓
// draw_at expires while server is asleep
//   ↓
// player opens the app
//   ↓
// this function changes LIVE → DRAWING
//
// The draw presentation starts NOW because the original
// draw_at may be hours in the past.
//
// The scheduler will then see DRAWING and perform drawGame().
// ============================================================

const recoverExpiredLiveGame = async () => {
  const now = new Date();

  const { data: expiredGame, error: findError } = await supabase
    .from("games")
    .select("*")
    .eq("status", "LIVE")
    .not("draw_at", "is", null)
    .lte("draw_at", now.toISOString())
    .order("draw_at", {
      ascending: true,
    })
    .limit(1)
    .maybeSingle();

  if (findError) {
    throw findError;
  }

  if (!expiredGame) {
    return null;
  }

  // ----------------------------------------------------------
  // IMPORTANT:
  // Use NOW as the new draw start time.
  // ----------------------------------------------------------

  const recoveryDrawAt = now.toISOString();

  const { data: recoveredGame, error: recoverError } = await supabase
    .from("games")
    .update({
      status: "DRAWING",
      draw_at: recoveryDrawAt,
      countdown_started_at: recoveryDrawAt,
    })
    .eq("id", expiredGame.id)
    .eq("status", "LIVE")
    .select()
    .maybeSingle();

  if (recoverError) {
    throw recoverError;
  }

  // Another request/server already recovered it.
  if (!recoveredGame) {
    return null;
  }

  console.log(`🔥 RECOVERED Game #${recoveredGame.game_number}`);

  console.log(`🔥 LIVE → DRAWING`);

  console.log(`🔥 Recovery draw started at ${recoveryDrawAt}`);

  return recoveredGame;
};

// ============================================================
// GET CURRENT GAME
// ============================================================

router.get("/current", requireAuth, async (req, res) => {
  try {
    // --------------------------------------------------------
    // RECOVER EXPIRED GAME FIRST
    // --------------------------------------------------------

    await recoverExpiredLiveGame();

    // --------------------------------------------------------
    // GET CURRENT ACTIVE GAME
    // --------------------------------------------------------

    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("*")
      .in("status", ["WAITING", "LIVE", "DRAWING"])
      .order("created_at", {
        ascending: false,
      })
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

    // --------------------------------------------------------
    // COUNT SOLD SLOTS
    // --------------------------------------------------------

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

    return res.json({
      game,

      soldSlots: count || 0,

      remainingSlots: game.total_slots - (count || 0),

      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get current game error:", error);

    return res.status(500).json({
      message: "Failed to get current game",
    });
  }
});

// ============================================================
// GET BOOKED SLOTS
// ============================================================

router.get("/current/slots", requireAuth, async (req, res) => {
  try {
    // ------------------------------------------------------
    // ALSO RECOVER HERE
    // ------------------------------------------------------

    await recoverExpiredLiveGame();

    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("id")
      .in("status", ["WAITING", "LIVE", "DRAWING"])
      .order("created_at", {
        ascending: false,
      })
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

    return res.json({
      bookedSlots: slots.map((slot) => slot.slot_number),
    });
  } catch (error) {
    console.error("Get booked slots error:", error);

    return res.status(500).json({
      message: "Failed to get booked slots",
    });
  }
});

// ============================================================
// GET GAME RESULT
// ============================================================

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

    // ------------------------------------------------------
    // TIMELINE
    // ------------------------------------------------------

    const timeline = buildDrawTimeline(game.draw_at);

    // ------------------------------------------------------
    // SOLD SLOTS
    // ------------------------------------------------------

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

    // ------------------------------------------------------
    // WINNER
    // ------------------------------------------------------

    const { data: winner, error: winnerError } = await supabase
      .from("winners")
      .select("slot_number, prize_amount, user_id")
      .eq("game_id", gameId)
      .eq("position", 1)
      .maybeSingle();

    if (winnerError) {
      throw winnerError;
    }

    return res.json({
      active: true,

      gameId: game.id,

      gameNumber: game.game_number,

      status: "FINISHED",

      ...timeline,

      serverTime: new Date().toISOString(),

      drawnAt: game.drawn_at,

      soldSlots: soldSlots || 0,

      winnerSlot: winner?.slot_number || null,

      prizeAmount: winner?.prize_amount || 0,

      isWinner: winner?.user_id === req.user.userId,
    });
  } catch (error) {
    console.error("Get game result error:", error);

    return res.status(500).json({
      message: "Failed to get game result",
    });
  }
});

// ============================================================
// CHECK CURRENT DRAW
// ============================================================

router.get("/current-draw", requireAuth, async (req, res) => {
  try {
    // ======================================================
    // FIRST: RECOVER EXPIRED LIVE GAME
    // ======================================================

    await recoverExpiredLiveGame();

    // ======================================================
    // CURRENT DRAWING GAME
    // ======================================================

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

    // ======================================================
    // DRAWING FOUND
    // ======================================================

    if (drawingGame) {
      const timeline = buildDrawTimeline(drawingGame.draw_at);

      // ----------------------------------------------------
      // SOLD SLOTS
      // ----------------------------------------------------

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

      // ----------------------------------------------------
      // WINNER
      // ----------------------------------------------------

      const { data: winner, error: winnerError } = await supabase
        .from("winners")
        .select("slot_number, prize_amount, user_id")
        .eq("game_id", drawingGame.id)
        .eq("position", 1)
        .maybeSingle();

      if (winnerError) {
        throw winnerError;
      }

      return res.json({
        active: true,

        gameId: drawingGame.id,

        gameNumber: drawingGame.game_number,

        status: "DRAWING",

        ...timeline,

        serverTime: new Date().toISOString(),

        drawnAt: drawingGame.drawn_at,

        soldSlots: soldSlots || 0,

        winnerSlot: winner?.slot_number || null,

        prizeAmount: winner?.prize_amount || 0,

        isWinner: winner?.user_id === req.user.userId,
      });
    }

    // ======================================================
    // RECOVER RECENT FINISHED DRAW
    // ======================================================

    const recoveryWindowStart = new Date(
      Date.now() - DRAW_PRESENTATION_DURATION_MS,
    ).toISOString();

    const { data: finishedGame, error: finishedError } = await supabase
      .from("games")
      .select("id, game_number, status, draw_at, drawn_at")
      .eq("status", "FINISHED")
      .gte("draw_at", recoveryWindowStart)
      .order("draw_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (finishedError) {
      throw finishedError;
    }

    // ======================================================
    // NO ACTIVE OR RECENT DRAW
    // ======================================================

    if (!finishedGame) {
      return res.json({
        active: false,

        serverTime: new Date().toISOString(),
      });
    }

    // ======================================================
    // BUILD TIMELINE
    // ======================================================

    const timeline = buildDrawTimeline(finishedGame.draw_at);

    const now = Date.now();

    const resultEndsAt = new Date(timeline.resultEndsAt).getTime();

    // ======================================================
    // PRESENTATION FINISHED
    // ======================================================

    if (now >= resultEndsAt) {
      return res.json({
        active: false,

        serverTime: new Date().toISOString(),
      });
    }

    // ======================================================
    // WINNER
    // ======================================================

    const { data: winner, error: winnerError } = await supabase
      .from("winners")
      .select("slot_number, prize_amount, user_id")
      .eq("game_id", finishedGame.id)
      .eq("position", 1)
      .maybeSingle();

    if (winnerError) {
      throw winnerError;
    }

    // ======================================================
    // SOLD SLOTS
    // ======================================================

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

    // ======================================================
    // RESPONSE
    // ======================================================

    return res.json({
      active: true,

      gameId: finishedGame.id,

      gameNumber: finishedGame.game_number,

      status: "FINISHED",

      ...timeline,

      serverTime: new Date().toISOString(),

      drawnAt: finishedGame.drawn_at,

      soldSlots: soldSlots || 0,

      winnerSlot: winner?.slot_number || null,

      prizeAmount: winner?.prize_amount || 0,

      isWinner: winner?.user_id === req.user.userId,
    });
  } catch (error) {
    console.error("Check current draw error:", error);

    return res.status(500).json({
      message: "Failed to check current draw",
    });
  }
});

export default router;
