import supabase from "../config/supabase.js";

// =========================================================
// GET ALL PLAYERS
// =========================================================

export const getAllPlayers = async () => {
  console.log("📢 Loading players for announcement...");

  const { data, error } = await supabase
    .from("users")
    .select("id, telegram_id")
    .not("telegram_id", "is", null);

  if (error) {
    console.error("❌ Failed to get players for announcement:", error);

    throw error;
  }

  console.log(`📢 Players found: ${data?.length || 0}`);

  console.log(
    "📢 Player Telegram IDs:",
    data?.map((player) => player.telegram_id),
  );

  return data || [];
};
