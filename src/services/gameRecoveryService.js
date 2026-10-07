import supabase from "../config/supabase.js";

export const reconcileExpiredGame = async () => {
  const now = new Date().toISOString();

  // Find an expired LIVE game.
  const { data: game, error: findError } = await supabase
    .from("games")
    .select("*")
    .eq("status", "LIVE")
    .not("draw_at", "is", null)
    .lte("draw_at", now)
    .order("draw_at", {
      ascending: true,
    })
    .limit(1)
    .maybeSingle();

  if (findError) {
    throw findError;
  }

  if (!game) {
    return null;
  }

  // Atomically change LIVE → DRAWING.
  //
  // Only one server/process can successfully
  // perform this transition.
  const { data: drawingGame, error: updateError } = await supabase
    .from("games")
    .update({
      status: "DRAWING",
    })
    .eq("id", game.id)
    .eq("status", "LIVE")
    .select()
    .maybeSingle();

  if (updateError) {
    throw updateError;
  }

  if (!drawingGame) {
    // Another scheduler/request already changed it.
    return null;
  }

  console.log(
    `🔥 Recovered expired Game #${drawingGame.game_number}: LIVE → DRAWING`,
  );

  return drawingGame;
};
