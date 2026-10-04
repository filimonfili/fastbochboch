import supabase from "../../config/supabase.js";

import { getUserWithdrawalBalance } from "../../services/withdrawalService.js";

import { withdrawalSessions } from "../sessions/sessions.js";

// ============================================================
// START WITHDRAWAL
// ============================================================

export const startWithdrawal = async (bot, msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id;

  try {
    if (!telegramId) {
      await bot.sendMessage(
        chatId,
        "❌ Unable to identify your Telegram account.",
      );

      return;
    }

    // --------------------------------------------------------
    // FIND USER
    // --------------------------------------------------------

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("telegram_id", telegramId)
      .single();

    if (userError || !user) {
      console.error("❌ Withdrawal user lookup failed:", userError);

      await bot.sendMessage(chatId, "❌ Your account could not be found.");

      return;
    }

    // --------------------------------------------------------
    // GET BALANCE
    // --------------------------------------------------------

    const balance = await getUserWithdrawalBalance(user.id);

    console.log("💸 Withdrawal balance:", {
      telegramId,
      userId: user.id,
      balance,
    });

    // --------------------------------------------------------
    // ZERO BALANCE
    // --------------------------------------------------------

    if (balance <= 0) {
      await bot.sendMessage(
        chatId,
        `💸 Withdraw

❌ No money in your account.

Your current balance is 0 ETB.

Please deposit money or win a game before withdrawing.`,
      );

      return;
    }

    // --------------------------------------------------------
    // CREATE WITHDRAWAL SESSION
    // --------------------------------------------------------

    withdrawalSessions.set(chatId, {
      userId: user.id,
      telegramId,
      balance,
      step: "PAYMENT_METHOD",
    });

    // --------------------------------------------------------
    // PAYMENT METHOD MENU
    // --------------------------------------------------------

    await bot.sendMessage(
      chatId,
      `💸 Withdraw

💰 Available Balance: ${balance} ETB

Choose your withdrawal method 👇`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📱 Telebirr",
                callback_data: "withdraw_telebirr",
              },
            ],
            [
              {
                text: "🏦 CBE Birr",
                callback_data: "withdraw_cbe_birr",
              },
            ],
            [
              {
                text: "❌ Cancel",
                callback_data: "withdraw_cancel",
              },
            ],
          ],
        },
      },
    );
  } catch (error) {
    console.error("❌ Start withdrawal error:", error);

    await bot.sendMessage(
      chatId,
      "❌ Something went wrong while starting your withdrawal.",
    );
  }
};

// ============================================================
// /withdraw COMMAND
// ============================================================

export const registerWithdrawCommand = (bot) => {
  bot.onText(/^\/withdraw$/, async (msg) => {
    await startWithdrawal(bot, msg);
  });
};
