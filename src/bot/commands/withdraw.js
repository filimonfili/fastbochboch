import { getUserWithdrawalBalance } from "../../services/withdrawalService.js";

import { withdrawalSessions } from "../sessions/sessions.js";

export const registerWithdrawCommand = (bot) => {
  bot.onText(/^\/withdraw$/, async (msg) => {
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
      // GET USER
      // --------------------------------------------------------

      const { data: user, error: userError } =
        await import("../../config/supabase.js").then(
          async ({ default: supabase }) => {
            return await supabase
              .from("users")
              .select("id")
              .eq("telegram_id", telegramId)
              .single();
          },
        );

      if (userError || !user) {
        await bot.sendMessage(chatId, "❌ Your account could not be found.");

        return;
      }

      // --------------------------------------------------------
      // GET BALANCE
      // --------------------------------------------------------

      const balance = await getUserWithdrawalBalance(user.id);

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
      // START SESSION
      // --------------------------------------------------------

      withdrawalSessions.set(chatId, {
        userId: user.id,
        telegramId,
        step: "PAYMENT_METHOD",
      });

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
      console.error("❌ /withdraw error:", error);

      await bot.sendMessage(
        chatId,
        "❌ Something went wrong while starting your withdrawal.",
      );
    }
  });
};
