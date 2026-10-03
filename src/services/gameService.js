import supabase from "../config/supabase.js";

const GAME_DURATION_SECONDS = 40;
const TOTAL_SLOTS = 400;
const SLOT_PRICE = 20;

export const createGame = async () => {
  // Check whether an active game already exists
  const existingGame = await getActiveGame();

  if (existingGame) {
    console.log(`Active game already exists: #${existingGame.game_number}`);

    return existingGame;
  }

  const now = new Date();

  const drawAt = new Date(now.getTime() + GAME_DURATION_SECONDS * 1000);

  const { data: game, error: gameError } = await supabase
    .from("games")
    .insert({
      total_slots: TOTAL_SLOTS,
      slot_price: SLOT_PRICE,
      status: "LIVE",
      countdown_started_at: now.toISOString(),
      draw_at: drawAt.toISOString(),
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
    `Game #${game.game_number} created — draw in ${GAME_DURATION_SECONDS}s`,
  );

  return game;
};

export const getActiveGame = async () => {
  const { data: game, error } = await supabase
    .from("games")
    .select("*")
    .in("status", ["LIVE", "DRAWING"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return game;
};

export const getOrCreateActiveGame = async () => {
  const existingGame = await getActiveGame();

  if (existingGame) {
    console.log(`Active game found: #${existingGame.game_number}`);

    return existingGame;
  }

  console.log("No active game found. Creating one...");

  return await createGame();
};
