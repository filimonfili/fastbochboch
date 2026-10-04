import { withdrawalSessions } from "../sessions/sessions.js";

import { createWithdrawal } from "../../services/withdrawalService.js";

export const registerWithdrawalCallbacks = (bot) => {
  bot.on("callback_query", async (query) => {
    if (!query.message) {
      return;
    }

    const action = query.data;
    const chatId = query.message.chat.id;

    const withdrawalActions = [
      "withdraw_telebirr",
      "withdraw_cbe_birr",
      "withdraw_cancel",
      "withdraw_confirm",
    ];

    if (!withdrawalActions.includes(action)) {
      return;
    }

    try {
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

      // ========================================================
      // CONFIRM WITHDRAWAL
      // ========================================================

      if (action === "withdraw_confirm") {
        // ------------------------------------------------------
        // SESSION VALIDATION
        // ------------------------------------------------------

        if (
          session.step !== "CONFIRM" ||
          !session.userId ||
          !session.amount ||
          !session.paymentMethod ||
          !session.accountNumber
        ) {
          withdrawalSessions.delete(chatId);

          await bot.sendMessage(
            chatId,
            `⚠️ Your withdrawal session is invalid or expired.

Please start the withdrawal again.`,
          );

          return;
        }

        // ------------------------------------------------------
        // CREATE WITHDRAWAL
        // ------------------------------------------------------

        console.log("💸 Creating withdrawal:", {
          chatId,
          userId: session.userId,
          amount: session.amount,
          paymentMethod: session.paymentMethod,
          accountNumber: session.accountNumber,
        });

        let result;

        try {
          result = await createWithdrawal({
            userId: session.userId,
            amount: session.amount,
            paymentMethod: session.paymentMethod,
            accountNumber: session.accountNumber,
          });
        } catch (error) {
          console.error("❌ Withdrawal creation failed:", error);

          const errorMessage = error?.message || "";

          // ----------------------------------------------------
          // ZERO BALANCE
          // ----------------------------------------------------

          if (errorMessage.includes("NO_BALANCE")) {
            withdrawalSessions.delete(chatId);

            await bot.sendMessage(
              chatId,
              `❌ No money in your account.

Your withdrawal could not be submitted because your balance is 0 ETB.`,
            );

            return;
          }

          // ----------------------------------------------------
          // INSUFFICIENT BALANCE
          // ----------------------------------------------------

          if (errorMessage.includes("INSUFFICIENT_BALANCE")) {
            withdrawalSessions.delete(chatId);

            await bot.sendMessage(
              chatId,
              `❌ Insufficient Balance

Your available balance is no longer enough for this withdrawal.

Please start the withdrawal again.`,
            );

            return;
          }

          // ----------------------------------------------------
          // OTHER ERROR
          // ----------------------------------------------------

          await bot.sendMessage(
            chatId,
            `❌ We couldn't submit your withdrawal.

Your money has not been withdrawn.

Please try again.`,
          );

          return;
        }

        // ------------------------------------------------------
        // CLEAR SESSION
        // ------------------------------------------------------

        withdrawalSessions.delete(chatId);

        // ------------------------------------------------------
        // PAYMENT NAME
        // ------------------------------------------------------

        const paymentName =
          session.paymentMethod === "TELEBIRR" ? "Telebirr" : "CBE Birr";

        // ------------------------------------------------------
        // WITHDRAWAL ID
        // ------------------------------------------------------

        const withdrawalId = result?.withdrawal_id;

        // ------------------------------------------------------
        // PLAYER CONFIRMATION
        // ------------------------------------------------------

        await bot.sendMessage(
          chatId,
          `✅ Withdrawal Request Submitted

💰 Amount:
${session.amount} ETB

📱 Method:
${paymentName}

📞 Number:
${session.accountNumber}

⏳ Status:
Pending

🆔 Request:
${withdrawalId}

Your withdrawal request has been sent for processing.

Please wait for confirmation from the admin.`,
        );

        console.log("✅ Withdrawal created successfully:", result);

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
