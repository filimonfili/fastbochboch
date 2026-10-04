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

  // ============================================================
  // NO FINISHED GAMES
  // ============================================================

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
  // 2. GET ALL SLOTS
  // ============================================================
  // Keep this query simple.
  // We filter booked slots in JavaScript.

  const { data: allSlots, error: slotsError } = await supabase
    .from("slots")
    .select("game_id, is_booked");

  if (slotsError) {
    console.error("🔥 Revenue slots query failed:", slotsError);

    throw new Error(`Slots query failed: ${slotsError.message}`);
  }

  console.log(`📊 Revenue: found ${allSlots?.length || 0} total slots`);

  // Only booked slots
  const bookedSlots = (allSlots || []).filter(
    (slot) => slot.is_booked === true,
  );

  console.log(`📊 Revenue: found ${bookedSlots.length} booked slots`);

  // ============================================================
  // 3. GET ALL WINNERS
  // ============================================================
  // Keep this query simple too.
  // We filter winners belonging to finished games below.

  const { data: allWinners, error: winnersError } = await supabase
    .from("winners")
    .select("game_id, prize_amount");

  if (winnersError) {
    console.error("🔥 Revenue winners query failed:", winnersError);

    throw new Error(`Winners query failed: ${winnersError.message}`);
  }

  console.log(`📊 Revenue: found ${allWinners?.length || 0} total winners`);

  // Only winners from finished games
  const winners = (allWinners || []).filter((winner) =>
    finishedGameIds.has(winner.game_id),
  );

  console.log(`📊 Revenue: found ${winners.length} winners for finished games`);

  // ============================================================
  // 4. COUNT BOOKED SLOTS PER FINISHED GAME
  // ============================================================

  const bookedCountByGame = new Map();

  for (const slot of bookedSlots) {
    // Ignore slots belonging to unfinished games
    if (!finishedGameIds.has(slot.game_id)) {
      continue;
    }

    const currentCount = bookedCountByGame.get(slot.game_id) || 0;

    bookedCountByGame.set(slot.game_id, currentCount + 1);
  }

  // ============================================================
  // 5. TOTAL PRIZE PER FINISHED GAME
  // ============================================================

  const prizeByGame = new Map();

  for (const winner of winners) {
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

    // Bets = sold slots × slot price
    const bets = soldSlots * Number(game.slot_price);

    // Actual prize from winners table
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

    console.log("📊 Game revenue:", {
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
