import supabase from "../config/supabase.js";
import { sendMainMenu } from "../menus/mainMenu.js";

async function ensureTelegramUser(telegramUser) {
  const telegramId = telegramUser.id;

  // 1. Find existing user
  const { data: existingUser, error: lookupError } = await supabase
    .from("users")
    .select("id")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  let user = existingUser;

  // 2. Register new user if necessary
  if (!user) {
    const { data: newUser, error: createError } = await supabase
      .from("users")
      .insert({
        telegram_id: telegramId,
        username: telegramUser.username ?? null,
        first_name: telegramUser.first_name ?? "Telegram User",
        last_name: telegramUser.last_name ?? null,
      })
      .select("id")
      .single();

    if (createError) {
      // Another request may have registered this user.
      if (createError.code !== "23505") {
        throw createError;
      }

      const { data: existingAfterConflict, error: retryError } = await supabase
        .from("users")
        .select("id")
        .eq("telegram_id", telegramId)
        .single();

      if (retryError) {
        throw retryError;
      }

      user = existingAfterConflict;
    } else {
      user = newUser;
    }
  }

  if (!user) {
    throw new Error("Could not register Telegram user");
  }

  // 3. Ensure the user has a wallet, including existing users
  const { data: existingWallet, error: walletLookupError } = await supabase
    .from("wallets")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (walletLookupError) {
    throw walletLookupError;
  }

  if (!existingWallet) {
    const { error: walletCreateError } = await supabase.from("wallets").insert({
      user_id: user.id,
      balance: 0,
    });

    if (walletCreateError && walletCreateError.code !== "23505") {
      throw walletCreateError;
    }
  }

  return user;
}

export const registerStartCommand = (bot) => {
  bot.onText(/^\/start(?:@\w+)?$/, async (msg) => {
    try {
      const chatId = msg.chat.id;
      const telegramUser = msg.from;

      if (!telegramUser?.id) {
        throw new Error("Telegram user ID is missing");
      }

      const user = await ensureTelegramUser(telegramUser);

      console.log("✅ Telegram user ready:", {
        chatId,
        telegramId: telegramUser.id,
        userId: user.id,
      });

      await sendMainMenu(bot, chatId);
    } catch (error) {
      console.error("❌ /start registration failed:", {
        message: error.message,
        code: error.code,
      });

      await bot.sendMessage(
        msg.chat.id,
        "Registration failed. Please try again shortly.",
      );
    }
  });
};
