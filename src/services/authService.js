import crypto from "crypto";
import supabase from "../config/supabase.js";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const verifyTelegramInitData = (initData) => {
  const params = new URLSearchParams(initData);

  const hash = params.get("hash");

  if (!hash) {
    throw new Error("Telegram hash is missing");
  }

  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  // Telegram Web App authentication:
  // secret_key = HMAC-SHA256("WebAppData", bot_token)
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(BOT_TOKEN)
    .digest();

  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (calculatedHash !== hash) {
    throw new Error("Invalid Telegram initData");
  }

  const user = params.get("user");

  if (!user) {
    throw new Error("Telegram user data is missing");
  }

  return JSON.parse(user);
};

export const authenticateTelegramUser = async (initData) => {
  const telegramUser = verifyTelegramInitData(initData);

  const telegramId = telegramUser.id;

  // Check if user already exists
  let { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  // Create user only if they don't exist
  if (!user) {
    const { data: newUser, error: createError } = await supabase
      .from("users")
      .insert({
        telegram_id: telegramId,
        username: telegramUser.username ?? null,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name ?? null,
      })
      .select()
      .single();

    if (createError) {
      // Another request may have created the user
      // between our SELECT and INSERT.
      if (createError.code === "23505") {
        const { data: existingUser, error: existingError } = await supabase
          .from("users")
          .select("*")
          .eq("telegram_id", telegramId)
          .single();

        if (existingError) {
          throw existingError;
        }

        user = existingUser;
      } else {
        throw createError;
      }
    } else {
      user = newUser;

      // Create wallet for newly created user
      const { error: walletError } = await supabase.from("wallets").insert({
        user_id: user.id,
        balance: 0,
      });

      if (walletError) {
        throw walletError;
      }
    }
  }

  return user;
};
