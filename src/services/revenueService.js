import supabase from "../config/supabase.js";

export const getRevenue = async () => {
  console.log("📊 Revenue: starting...");

  // ============================================================
  // 1. GET FINISHED GAMES
  // ============================================================

  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select("id, slot_price, created_at, drawn_at")
    .eq("status", "FINISHED");

  if (gamesError) {
    console.error("🔥 Revenue games query failed:", gamesError);
    throw new Error(`Games query failed: ${gamesError.message}`);
  }

  console.log(`📊 Revenue: found ${games?.length || 0} finished games`);

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

  // ============================================================
  // CREATE SET OF FINISHED GAME IDS
  // ============================================================

  const finishedGameIds = new Set(games.map((game) => game.id));

  // ============================================================
  // 2. GET BOOKED SLOTS
  // ============================================================
  // We intentionally do NOT use .in("game_id", gameIds).
  // This avoids Supabase/PostgREST request problems when
  // there are many games.

  const { data: bookedSlots, error: slotsError } = await supabase
    .from("slots")
    .select("game_id")
    .eq("is_booked", true);

  if (slotsError) {
    console.error("🔥 Revenue slots query failed:", slotsError);

    throw new Error(`Slots query failed: ${slotsError.message}`);
  }

  console.log(`📊 Revenue: found ${bookedSlots?.length || 0} booked slots`);

  // ============================================================
  // 3. GET WINNERS
  // ============================================================

  const { data: winners, error: winnersError } = await supabase
    .from("winners")
    .select("game_id, prize_amount")
    .in(
      "game_id",
      games.map((game) => game.id),
    );

  if (winnersError) {
    console.error("🔥 Revenue winners query failed:", winnersError);

    throw new Error(`Winners query failed: ${winnersError.message}`);
  }

  console.log(`📊 Revenue: found ${winners?.length || 0} winners`);

  // ============================================================
  // 4. COUNT BOOKED SLOTS PER FINISHED GAME
  // ============================================================

  const bookedCountByGame = new Map();

  for (const slot of bookedSlots || []) {
    // Ignore slots belonging to unfinished games
    if (!finishedGameIds.has(slot.game_id)) {
      continue;
    }

    const currentCount = bookedCountByGame.get(slot.game_id) || 0;

    bookedCountByGame.set(slot.game_id, currentCount + 1);
  }

  // ============================================================
  // 5. TOTAL PRIZE PER GAME
  // ============================================================

  const prizeByGame = new Map();

  for (const winner of winners || []) {
    const currentPrize = prizeByGame.get(winner.game_id) || 0;

    prizeByGame.set(winner.game_id, currentPrize + Number(winner.prize_amount));
  }

  // ============================================================
  // 6. ETHIOPIA TODAY
  // ============================================================

  const now = new Date();

  // Ethiopia = UTC+3
  const ethiopiaOffsetMs = 3 * 60 * 60 * 1000;

  const ethiopiaNow = new Date(now.getTime() + ethiopiaOffsetMs);

  ethiopiaNow.setUTCHours(0, 0, 0, 0);

  const startOfTodayUTC = new Date(ethiopiaNow.getTime() - ethiopiaOffsetMs);

  console.log("📅 Today starts:", startOfTodayUTC.toISOString());

  // ============================================================
  // 7. CALCULATE REVENUE
  // ============================================================

  let todayBets = 0;
  let todayPrizes = 0;

  let allTimeBets = 0;
  let allTimePrizes = 0;

  for (const game of games) {
    const soldSlots = bookedCountByGame.get(game.id) || 0;

    const bets = soldSlots * Number(game.slot_price);

    const prizes = prizeByGame.get(game.id) || 0;

    allTimeBets += bets;
    allTimePrizes += prizes;

    const dateToUse = game.drawn_at || game.created_at;

    const gameDate = new Date(dateToUse);

    if (gameDate >= startOfTodayUTC) {
      todayBets += bets;
      todayPrizes += prizes;
    }

    console.log("📊 Game:", {
      id: game.id,
      soldSlots,
      slotPrice: game.slot_price,
      bets,
      prizes,
      date: dateToUse,
    });
  }

  // ============================================================
  // 8. FINAL RESULT
  // ============================================================

  const result = {
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

  console.log("✅ Revenue calculation complete:", result);

  return result;
};
