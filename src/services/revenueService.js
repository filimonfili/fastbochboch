import supabase from "../config/supabase.js";

/**
 * =========================================================
 * GET REVENUE
 * =========================================================
 *
 * Bets:
 *   booked slots × game.slot_price
 *
 * Prizes:
 *   actual prize_amount from winners table
 *
 * Platform Revenue:
 *   bets - prizes
 *
 * Only FINISHED games are included.
 */

export const getRevenue = async () => {
  // =======================================================
  // 1. GET FINISHED GAMES
  // =======================================================

  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select("id, slot_price, created_at, drawn_at")
    .eq("status", "FINISHED");

  if (gamesError) {
    throw gamesError;
  }

  if (!games || games.length === 0) {
    return {
      today: {
        bets: 0,
        prizes: 0,
        revenue: 0,
      },
      allTime: {
        bets: 0,
        prizes: 0,
        revenue: 0,
      },
    };
  }

  const gameIds = games.map((game) => game.id);

  // =======================================================
  // 2. GET BOOKED SLOTS
  // =======================================================

  const { data: bookedSlots, error: slotsError } = await supabase
    .from("slots")
    .select("game_id")
    .in("game_id", gameIds)
    .eq("is_booked", true);

  if (slotsError) {
    throw slotsError;
  }

  // =======================================================
  // 3. GET WINNERS
  // =======================================================

  const { data: winners, error: winnersError } = await supabase
    .from("winners")
    .select("game_id, prize_amount, created_at")
    .in("game_id", gameIds);

  if (winnersError) {
    throw winnersError;
  }

  // =======================================================
  // 4. COUNT BOOKED SLOTS PER GAME
  // =======================================================

  const bookedCountByGame = new Map();

  for (const slot of bookedSlots || []) {
    const currentCount = bookedCountByGame.get(slot.game_id) || 0;

    bookedCountByGame.set(slot.game_id, currentCount + 1);
  }

  // =======================================================
  // 5. SUM PRIZES PER GAME
  // =======================================================

  const prizeByGame = new Map();

  for (const winner of winners || []) {
    const currentPrize = prizeByGame.get(winner.game_id) || 0;

    prizeByGame.set(winner.game_id, currentPrize + Number(winner.prize_amount));
  }

  // =======================================================
  // 6. START TOTALS
  // =======================================================

  let todayBets = 0;
  let todayPrizes = 0;

  let allTimeBets = 0;
  let allTimePrizes = 0;

  // =======================================================
  // 7. ETHIOPIA TODAY
  // =======================================================

  const now = new Date();

  const ethiopiaOffsetMs = 3 * 60 * 60 * 1000;

  const ethiopiaNow = new Date(now.getTime() + ethiopiaOffsetMs);

  ethiopiaNow.setUTCHours(0, 0, 0, 0);

  const startOfTodayUTC = new Date(ethiopiaNow.getTime() - ethiopiaOffsetMs);

  // =======================================================
  // 8. CALCULATE
  // =======================================================

  for (const game of games) {
    const soldSlots = bookedCountByGame.get(game.id) || 0;

    const bets = soldSlots * Number(game.slot_price);

    const prizes = prizeByGame.get(game.id) || 0;

    // All time
    allTimeBets += bets;
    allTimePrizes += prizes;

    // Today
    const dateToUse = game.drawn_at || game.created_at;

    const gameDate = new Date(dateToUse);

    if (gameDate >= startOfTodayUTC) {
      todayBets += bets;
      todayPrizes += prizes;
    }
  }

  // =======================================================
  // 9. RETURN
  // =======================================================

  return {
    today: {
      bets: todayBets,
      prizes: todayPrizes,
      revenue: todayBets - todayPrizes,
    },

    allTime: {
      bets: allTimeBets,
      prizes: allTimePrizes,
      revenue: allTimeBets - allTimePrizes,
    },
  };
};
