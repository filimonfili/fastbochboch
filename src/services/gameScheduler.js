import supabase from "../config/supabase.js";

import { drawGame } from "./drawService.js";
import { createGame } from "./gameService.js";

import { getIO } from "../socket/index.js";

const SHAKE_DURATION_MS = 5 * 1000;
const REVEAL_DURATION_MS = 3 * 1000;
const RESULT_DURATION_MS = 10 * 1000;

const TOTAL_DRAW_DURATION_MS =
  SHAKE_DURATION_MS + REVEAL_DURATION_MS + RESULT_DURATION_MS;

let isRunning = false;

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const startGameScheduler = () => {
  console.log("Game scheduler started.");

  setInterval(async () => {
    if (isRunning) return;

    isRunning = true;

    try {
      // =========================================================
      // RECOVER DRAWING GAME AFTER SERVER RESTART
      // =========================================================

      const { data: drawingGame, error: drawingError } = await supabase
        .from("games")
        .select("*")
        .eq("status", "DRAWING")
        .order("draw_at", {
          ascending: true,
        })
        .limit(1)
        .maybeSingle();

      if (drawingError) {
        throw drawingError;
      }

      if (drawingGame) {
        console.log(
          `🔥 Recovering DRAWING Game #${drawingGame.game_number}...`,
        );

        await processDrawingGame(drawingGame);

        return;
      }

      // =========================================================
      // FIND LIVE GAME THAT HAS REACHED DRAW TIME
      // =========================================================

      const nowISO = new Date().toISOString();

      const { data: games, error } = await supabase
        .from("games")
        .select("*")
        .eq("status", "LIVE")
        .lte("draw_at", nowISO)
        .order("draw_at", {
          ascending: true,
        })
        .limit(1);

      if (error) {
        throw error;
      }

      if (!games || games.length === 0) {
        return;
      }

      const game = games[0];

      // =========================================================
      // LOCK GAME
      // LIVE → DRAWING
      // =========================================================

      const { data: lockedGame, error: lockError } = await supabase
        .from("games")
        .update({
          status: "DRAWING",
        })
        .eq("id", game.id)
        .eq("status", "LIVE")
        .select()
        .maybeSingle();

      if (lockError) {
        throw lockError;
      }

      if (!lockedGame) {
        return;
      }

      console.log(`🔥 Game #${lockedGame.game_number} changed LIVE → DRAWING`);

      await processDrawingGame(lockedGame);
    } catch (error) {
      console.error("Game scheduler error:", error);
    } finally {
      isRunning = false;
    }
  }, 1000);
};

// =========================================================
// PROCESS DRAWING GAME
// =========================================================

const processDrawingGame = async (game) => {
  const io = getIO();

  const drawStartedAt = new Date(game.draw_at).getTime();

  if (Number.isNaN(drawStartedAt)) {
    throw new Error(
      `Invalid draw_at for Game #${game.game_number}: ${game.draw_at}`,
    );
  }

  // =========================================================
  // DRAW TIMELINE
  // =========================================================

  const shakeEndsAt = drawStartedAt + SHAKE_DURATION_MS;

  const revealEndsAt = shakeEndsAt + REVEAL_DURATION_MS;

  const resultEndsAt = revealEndsAt + RESULT_DURATION_MS;

  const timeline = {
    startedAt: new Date(drawStartedAt).toISOString(),

    shakeEndsAt: new Date(shakeEndsAt).toISOString(),

    revealEndsAt: new Date(revealEndsAt).toISOString(),

    resultEndsAt: new Date(resultEndsAt).toISOString(),

    totalDurationMs: TOTAL_DRAW_DURATION_MS,
  };

  console.log("🔥 SERVER DRAW TIMELINE:", {
    gameId: game.id,
    gameNumber: game.game_number,
    ...timeline,
  });

  // =========================================================
  // DRAW START
  // =========================================================

  console.log("🔥 EMITTING draw:start");

  io.to(`game:${game.id}`).emit("draw:start", {
    gameId: game.id,
    gameNumber: game.game_number,

    ...timeline,

    serverTime: new Date().toISOString(),
  });

  // =========================================================
  // WAIT FOR SHAKE TO FINISH
  // =========================================================

  await waitUntil(shakeEndsAt);

  // =========================================================
  // ACTUAL DRAW
  // =========================================================

  console.log(`🎯 Performing actual draw for Game #${game.game_number}`);

  let result = null;

  try {
    result = await drawGame(game);
  } catch (error) {
    console.error(
      `❌ Failed to complete draw for Game #${game.game_number}:`,
      error,
    );

    throw error;
  }

  // =========================================================
  // SEND WINNER RESULT
  // =========================================================

  console.log("🔥 EMITTING draw:result:", {
    gameId: game.id,
    gameNumber: game.game_number,
    winnerSlot: result?.slot_number ?? null,
    prizeAmount: result?.prize_amount ?? 0,
    soldSlots: result?.sold_count ?? 0,
  });

  io.to(`game:${game.id}`).emit("draw:result", {
    gameId: game.id,
    gameNumber: game.game_number,

    winnerSlot: result?.slot_number ?? null,
    winnerUserId: result?.winnerUserId ?? null,
    winnerName: result?.winnerName ?? null,

    prizeAmount: result?.prize_amount ?? 0,
    soldSlots: result?.sold_count ?? 0,

    ...timeline,

    serverTime: new Date().toISOString(),
  });

  // =========================================================
  // WAIT FOR RESULT PRESENTATION TO FINISH
  // =========================================================

  await waitUntil(resultEndsAt);

  // =========================================================
  // FINISH GAME
  // =========================================================

  const { error: finishError } = await supabase
    .from("games")
    .update({
      status: "FINISHED",
    })
    .eq("id", game.id)
    .eq("status", "DRAWING");

  if (finishError) {
    throw finishError;
  }

  console.log(
    `🏁 Game #${game.game_number} finished after 20s draw presentation.`,
  );

  // =========================================================
  // CLEAN TEMPORARY GAME DATA
  // =========================================================
  //
  // slots.game_id -> games.id ON DELETE CASCADE
  //
  // bookings.slot_id -> slots.id ON DELETE CASCADE
  //
  // Therefore deleting the slots automatically deletes
  // their related bookings.
  //
  // We keep:
  // - games
  // - users
  // - wallets
  // - transactions
  // - deposits
  //
  // We delete:
  // - slots
  // - related bookings
  // =========================================================

  await cleanupFinishedGame(game.id, game.game_number);

  // =========================================================
  // CREATE NEXT GAME
  // =========================================================

  const nextGame = await createGame();

  console.log(`🔥 Next game created: #${nextGame.game_number}`);

  // =========================================================
  // NOTIFY ALL CONNECTED PLAYERS
  // =========================================================

  io.emit("game:new", {
    gameId: nextGame.id,
    gameNumber: nextGame.game_number,

    serverTime: new Date().toISOString(),
  });
};

// =========================================================
// CLEAN FINISHED GAME TEMPORARY DATA
// =========================================================

const cleanupFinishedGame = async (gameId, gameNumber) => {
  console.log(`🧹 Cleaning temporary data for Game #${gameNumber}...`);

  const { error } = await supabase.from("slots").delete().eq("game_id", gameId);

  if (error) {
    console.error(`❌ Failed to clean slots for Game #${gameNumber}:`, error);

    throw error;
  }

  console.log(`🧹 Game #${gameNumber} temporary slot data cleaned.`);
};

// =========================================================
// WAIT UNTIL SERVER TIME REACHES TARGET
// =========================================================

const waitUntil = async (targetTime) => {
  while (true) {
    const remaining = targetTime - Date.now();

    if (remaining <= 0) {
      return;
    }

    await sleep(Math.min(remaining, 1000));
  }
};
