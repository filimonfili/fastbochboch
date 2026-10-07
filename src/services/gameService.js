import supabase from "../config/supabase.js";

const TOTAL_SLOTS = 400;
const SLOT_PRICE = 20;

export const createGame = async () => {
  // Check whether an active game already exists
  const existingGame = await getActiveGame();

  if (existingGame) {
    console.log(`Active game already exists: #${existingGame.game_number}`);

    return existingGame;
  }

  // =========================================================
  // CREATE GAME IN WAITING STATE
  // =========================================================
  //
  // The 40-second countdown does NOT start here.
  //
  // Countdown starts only when 3 slots have been confirmed.
  // =========================================================

  const { data: game, error: gameError } = await supabase
    .from("games")
    .insert({
      total_slots: TOTAL_SLOTS,
      slot_price: SLOT_PRICE,
      status: "WAITING",
      countdown_started_at: null,
      draw_at: null,
    })
    .select()
    .single();

  if (gameError) {
    // Another process may have created the game
    // between our check and insert.
    if (gameError.code === "23505") {
      const activeGame = await getActiveGame();

      if (activeGame) {
        console.log(`Another process created Game #${activeGame.game_number}`);

        return activeGame;
      }
    }

    throw gameError;
  }

  // =========================================================
  // CREATE 400 SLOTS
  // =========================================================

  const slots = Array.from({ length: TOTAL_SLOTS }, (_, index) => ({
    game_id: game.id,
    slot_number: index + 1,
  }));

  const { error: slotsError } = await supabase.from("slots").insert(slots);

  if (slotsError) {
    await supabase.from("games").delete().eq("id", game.id);

    throw slotsError;
  }

  console.log(
    `Game #${game.game_number} created — WAITING for 3 booked slots.`,
  );

  return game;
};

// =========================================================
// GET ACTIVE GAME
// =========================================================

export const getActiveGame = async () => {
  const { data: game, error } = await supabase
    .from("games")
    .select("*")
    .in("status", ["WAITING", "LIVE", "DRAWING"])
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return game;
};

// =========================================================
// GET OR CREATE ACTIVE GAME
// =========================================================

export const getOrCreateActiveGame = async () => {
  const existingGame = await getActiveGame();

  if (existingGame) {
    console.log(
      `Active game found: #${existingGame.game_number} (${existingGame.status})`,
    );

    return existingGame;
  }

  console.log("No active game found. Creating one...");

  return await createGame();
};
