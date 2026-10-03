import supabase from "../config/supabase.js";

import { drawGame } from "./drawService.js";
import { createGame } from "./gameService.js";

import { getIO } from "../socket/index.js";

let isRunning = false;

export const startGameScheduler = () => {
  console.log("Game scheduler started.");

  setInterval(async () => {
    if (isRunning) return;

    isRunning = true;

    try {
      const now = new Date().toISOString();

      /*
       * --------------------------------------------------
       * 1. RECOVER A GAME THAT IS ALREADY DRAWING
       * --------------------------------------------------
       *
       * This is important after a backend restart.
       *
       * Example:
       *
       * Server changes LIVE -> DRAWING
       * Server crashes/restarts
       * Game remains DRAWING
       *
       * The old scheduler only searched for LIVE games,
       * so that game could remain stuck forever.
       *
       * If a DRAWING game exists, complete it now.
       *
       * The frontend uses draw_at as the official animation
       * start timestamp, so the backend does not need to
       * wait for the 22-second presentation.
       */

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

        const io = getIO();

        /*
         * Tell connected players that the draw is active.
         */
        console.log("🔥 EMITTING recovered draw:start:", {
          gameId: drawingGame.id,
          gameNumber: drawingGame.game_number,
          startedAt: drawingGame.draw_at,
        });

        io.to(`game:${drawingGame.id}`).emit("draw:start", {
          gameId: drawingGame.id,
          gameNumber: drawingGame.game_number,
          startedAt: drawingGame.draw_at,
        });

        /*
         * Complete the actual database draw.
         */
        const result = await drawGame(drawingGame);

        /*
         * Tell connected players the official result.
         */
        console.log("🔥 EMITTING recovered draw:result:", {
          gameId: drawingGame.id,
          gameNumber: drawingGame.game_number,
          winnerSlot: result?.slot_number ?? null,
          prizeAmount: result?.prize_amount ?? 0,
          soldSlots: result?.sold_count ?? 0,
          startedAt: drawingGame.draw_at,
        });

        io.to(`game:${drawingGame.id}`).emit("draw:result", {
          gameId: drawingGame.id,
          gameNumber: drawingGame.game_number,
          winnerSlot: result?.slot_number ?? null,
          prizeAmount: result?.prize_amount ?? 0,
          soldSlots: result?.sold_count ?? 0,
          startedAt: drawingGame.draw_at,
        });

        console.log(
          `🔥 Recovered Game #${drawingGame.game_number} successfully.`,
        );

        /*
         * Create the next game.
         */
        const nextGame = await createGame();

        io.emit("game:new", {
          gameId: nextGame.id,
          gameNumber: nextGame.game_number,
        });

        console.log(`🔥 Next game created: #${nextGame.game_number}`);

        return;
      }

      /*
       * --------------------------------------------------
       * 2. FIND A LIVE GAME WHOSE COUNTDOWN FINISHED
       * --------------------------------------------------
       */

      const { data: games, error } = await supabase
        .from("games")
        .select("*")
        .eq("status", "LIVE")
        .lte("draw_at", now)
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

      /*
       * --------------------------------------------------
       * 3. CLAIM THE LIVE GAME
       * --------------------------------------------------
       */

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

      /*
       * Another scheduler/server already claimed it.
       */
      if (!lockedGame) {
        return;
      }

      const io = getIO();

      /*
       * draw_at is the authoritative draw-start time.
       */
      const drawStartedAt = lockedGame.draw_at;

      /*
       * --------------------------------------------------
       * 4. EMIT DRAW START
       * --------------------------------------------------
       */

      console.log("🔥 EMITTING draw:start:", {
        gameId: lockedGame.id,
        gameNumber: lockedGame.game_number,
        startedAt: drawStartedAt,
      });

      io.to(`game:${lockedGame.id}`).emit("draw:start", {
        gameId: lockedGame.id,
        gameNumber: lockedGame.game_number,
        startedAt: drawStartedAt,
      });

      console.log(
        `🔥 Draw started for Game #${lockedGame.game_number} at ${drawStartedAt}`,
      );

      /*
       * --------------------------------------------------
       * 5. DETERMINE WINNER + PAYOUT
       * --------------------------------------------------
       */

      const result = await drawGame(lockedGame);

      /*
       * --------------------------------------------------
       * 6. EMIT OFFICIAL RESULT
       * --------------------------------------------------
       */

      console.log("🔥 EMITTING draw:result:", {
        gameId: lockedGame.id,
        gameNumber: lockedGame.game_number,
        winnerSlot: result?.slot_number ?? null,
        prizeAmount: result?.prize_amount ?? 0,
        soldSlots: result?.sold_count ?? 0,
        startedAt: drawStartedAt,
      });

      io.to(`game:${lockedGame.id}`).emit("draw:result", {
        gameId: lockedGame.id,
        gameNumber: lockedGame.game_number,
        winnerSlot: result?.slot_number ?? null,
        prizeAmount: result?.prize_amount ?? 0,
        soldSlots: result?.sold_count ?? 0,
        startedAt: drawStartedAt,
      });

      console.log(`Game #${lockedGame.game_number} finished.`);

      /*
       * --------------------------------------------------
       * 7. CREATE NEXT GAME
       * --------------------------------------------------
       */

      const nextGame = await createGame();

      io.emit("game:new", {
        gameId: nextGame.id,
        gameNumber: nextGame.game_number,
      });

      console.log(`Next game created: #${nextGame.game_number}`);
    } catch (error) {
      console.error("Game scheduler error:", error);
    } finally {
      isRunning = false;
    }
  }, 1000);
};
