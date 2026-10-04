import supabase from "../config/supabase.js";

// =========================================================
// GET ALL PLAYERS
// =========================================================

export const getAllPlayers = async () => {
  const { data, error } = await supabase
    .from("users")
    .select("id, telegram_id")
    .not("telegram_id", "is", null);

  if (error) {
    console.error("❌ Failed to get players for announcement:", error);

    throw error;
  }

  return data || [];
};
