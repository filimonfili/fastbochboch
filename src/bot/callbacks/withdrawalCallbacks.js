import { withdrawalSessions } from "../sessions/sessions.js";

export const registerWithdrawalCallbacks = (bot) => {
  bot.on("callback_query", async (query) => {
    if (!query.message) {
      return;
    }

    const action = query.data;
    const chatId = query.message.chat.id;
    const telegramId = query.from?.id;

    const withdrawalActions = [
      "withdraw_telebirr",
      "withdraw_cbe_birr",
      "withdraw_cancel",
    ];

    if (!withdrawalActions.includes(action)) {
      return;
    }

    try {
      // ========================================================
      // ANSWER CALLBACK
      // ========================================================

      await bot.answerCallbackQuery(query.id);

      // ========================================================
      // CANCEL
      // ========================================================

      if (action === "withdraw_cancel") {
        withdrawalSessions.delete(chatId);

        await bot.sendMessage(chatId, "❌ Withdrawal cancelled.");

        return;
      }

      // ========================================================
      // GET SESSION
      // ========================================================

      const session = withdrawalSessions.get(chatId);

      if (!session) {
        await bot.sendMessage(
          chatId,
          `⚠️ Your withdrawal session has expired.

Please press 💸 Withdraw again.`,
        );

        return;
      }

      // ========================================================
      // TELEBIRR
      // ========================================================

      if (action === "withdraw_telebirr") {
        withdrawalSessions.set(chatId, {
          ...session,
          paymentMethod: "TELEBIRR",
          step: "AMOUNT",
        });

        await bot.sendMessage(
          chatId,
          `📱 Telebirr Withdrawal

💰 Available Balance:
${session.balance} ETB

Enter the amount you want to withdraw.

Example:

100

Send /cancel to cancel.`,
        );

        return;
      }

      // ========================================================
      // CBE BIRR
      // ========================================================

      if (action === "withdraw_cbe_birr") {
        withdrawalSessions.set(chatId, {
          ...session,
          paymentMethod: "CBEBIRR",
          step: "AMOUNT",
        });

        await bot.sendMessage(
          chatId,
          `🏦 CBE Birr Withdrawal

💰 Available Balance:
${session.balance} ETB

Enter the amount you want to withdraw.

Example:

100

Send /cancel to cancel.`,
        );

        return;
      }
    } catch (error) {
      console.error("❌ Withdrawal callback error:", error);

      try {
        await bot.sendMessage(
          chatId,
          "❌ Something went wrong. Please try again.",
        );
      } catch (sendError) {
        console.error("❌ Failed to send withdrawal error:", sendError);
      }
    }
  });
};
