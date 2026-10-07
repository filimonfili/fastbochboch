import supabase from "../config/supabase.js";

export const drawGame = async (game) => {
  console.log(`Starting draw for Game #${game.game_number}...`);

  const { data, error } = await supabase.rpc("complete_game_draw", {
    p_game_id: game.id,
  });

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Draw returned no result");
  }

  if (!data.winner_id) {
    console.log(`Game #${game.game_number} finished with no winner.`);

    return null;
  }

  console.log(`Winner: Slot #${data.slot_number} → ${data.prize_amount} ETB`);

  console.log(`Prize paid: ${data.prize_amount} ETB → user ${data.user_id}`);

  // --------------------------------------------------
  // GET WINNER USER
  // --------------------------------------------------

  const { data: winner, error: winnerError } = await supabase
    .from("users")
    .select("id, first_name, last_name, username")
    .eq("id", data.user_id)
    .single();

  if (winnerError) {
    throw winnerError;
  }

  // --------------------------------------------------
  // BUILD WINNER DISPLAY NAME
  // --------------------------------------------------

  const winnerName =
    [winner.first_name, winner.last_name].filter(Boolean).join(" ").trim() ||
    winner.username ||
    "Winner";

  console.log(`🏆 Winner name: ${winnerName}`);

  return {
    ...data,

    winnerUserId: winner.id,

    winnerName,
  };
};
