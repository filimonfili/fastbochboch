import supabase from "../config/supabase.js";

export const getPlayerBalance = async (telegramId) => {
  if (!telegramId) {
    throw new Error("TELEGRAM_ID_REQUIRED");
  }

  // Find the player
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("telegram_id", telegramId)
    .single();

  if (userError) {
    if (userError.code === "PGRST116") {
      throw new Error("PLAYER_NOT_FOUND");
    }

    throw userError;
  }

  // Get wallet
  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", user.id)
    .single();

  if (walletError) {
    if (walletError.code === "PGRST116") {
      return 0;
    }

    throw walletError;
  }

  return Number(wallet.balance || 0);
};
