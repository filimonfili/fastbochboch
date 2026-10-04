import { isAdmin } from "./utils/auth.js";

import { depositSessions, adminSessions } from "./sessions/sessions.js";

import {
  getTelebirrSettings,
  updateTelebirrPhone,
  updateTelebirrAccountName,
} from "../services/paymentSettingsService.js";

import { createPendingDeposit } from "../services/depositService.js";

import { sendMainMenu } from "./menus/mainMenu.js";

import { sendPaymentMethods } from "./menus/depositMenu.js";

import { sendAdminMenu } from "./menus/adminMenu.js";

export const registerMessageHandler = (bot) => {
  bot.on("message", async (msg) => {
    try {
      if (!msg.text) return;

      const chatId = msg.chat.id;
      const telegramId = msg.from?.id;
      const text = msg.text.trim();

      // =========================================================
      // ADMIN SESSION
      // =========================================================

      if (telegramId && isAdmin(telegramId)) {
        const adminSession = adminSessions.get(chatId);

        if (adminSession) {
          // Cancel current admin action
          if (text === "/cancel") {
            adminSessions.delete(chatId);

            await bot.sendMessage(chatId, "❌ Admin action cancelled.");

            await sendAdminMenu(bot, chatId);
            return;
          }

          // -----------------------------------------------------
          // CHANGE TELEBIRR PHONE
          // -----------------------------------------------------

          if (adminSession.action === "CHANGE_TELEBIRR_PHONE") {
            if (!/^09\d{8}$/.test(text)) {
              await bot.sendMessage(
                chatId,
                `❌ Invalid Telebirr number.

Please send a valid number like:

0912345678`,
              );

              return;
            }

            const settings = await updateTelebirrPhone(text);

            adminSessions.delete(chatId);

            await bot.sendMessage(
              chatId,
              `✅ Telebirr number updated successfully.

📱 New Number:

${settings.phone_number}

👤 Account Name:

${settings.account_name}`,
            );

            console.log("⚙️ Telebirr phone updated:", {
              adminTelegramId: telegramId,
              phoneNumber: settings.phone_number,
            });

            await sendAdminMenu(bot, chatId);

            return;
          }

          // -----------------------------------------------------
          // CHANGE TELEBIRR ACCOUNT NAME
          // -----------------------------------------------------

          if (adminSession.action === "CHANGE_TELEBIRR_NAME") {
            if (text.length < 2 || text.length > 100) {
              await bot.sendMessage(
                chatId,
                `❌ Invalid account name.

Please send a valid account name.`,
              );

              return;
            }

            const settings = await updateTelebirrAccountName(text);

            adminSessions.delete(chatId);

            await bot.sendMessage(
              chatId,
              `✅ Telebirr account name updated successfully.

📱 Number:

${settings.phone_number}

👤 New Account Name:

${settings.account_name}`,
            );

            console.log("⚙️ Telebirr account name updated:", {
              adminTelegramId: telegramId,
              accountName: settings.account_name,
            });

            await sendAdminMenu(bot, chatId);

            return;
          }
        }
      }

      // =========================================================
      // PLAYER MENU BUTTONS
      // =========================================================

      if (text === "🎮 Play Boch Boch") {
        await sendMainMenu(bot, chatId);
        return;
      }

      if (text === "💰 Balance") {
        await bot.sendMessage(
          chatId,
          `💰 Balance

Your wallet balance is available inside Boch Boch.`,
        );

        return;
      }

      if (text === "➕ Deposit") {
        await sendPaymentMethods(bot, chatId);
        return;
      }

      if (text === "💸 Withdraw") {
        await bot.sendMessage(
          chatId,
          `💸 Withdraw

Withdrawal options will be available here.`,
        );

        return;
      }

      if (text === "🆘 Support") {
        await bot.sendMessage(
          chatId,
          `🆘 Support

If you have a problem with your account, deposit, withdrawal, or game, please contact support.`,
        );

        return;
      }

      // =========================================================
      // DEPOSIT SESSION
      // =========================================================

      const depositSession = depositSessions.get(chatId);

      if (!depositSession) {
        return;
      }

      if (text === "/cancel") {
        depositSessions.delete(chatId);

        await bot.sendMessage(chatId, "❌ Deposit cancelled.");

        await sendPaymentMethods(bot, chatId);

        return;
      }

      // Only process deposit input for Telebirr
      if (depositSession.paymentMethod !== "TELEBIRR") {
        return;
      }

      console.log("💰 Deposit submission received:", {
        chatId,
        telegramId,
        text,
      });

      // =========================================================
      // CREATE PENDING DEPOSIT
      // =========================================================

      const result = await createPendingDeposit({
        telegramId,
        paymentMethod: "TELEBIRR",
        playerSms: text,
      });

      console.log("💰 Deposit result:", result);

      // =========================================================
      // DEPOSIT APPROVED
      // =========================================================

      if (result.status === "DEPOSIT_APPROVED") {
        depositSessions.delete(chatId);

        await bot.sendMessage(
          chatId,
          `✅ Deposit Successful!

💰 Amount:

${result.amount} ETB

Your wallet has been credited successfully.

🎮 You can now play Boch Boch.`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🎮 Play Boch Boch",
                    web_app: {
                      url: process.env.TELEGRAM_MINI_APP_URL,
                    },
                  },
                ],
              ],
            },
          },
        );

        return;
      }

      // =========================================================
      // WAITING FOR MERCHANT
      // =========================================================

      if (result.status === "WAITING_FOR_MERCHANT") {
        await bot.sendMessage(
          chatId,
          `⏳ Deposit Received

Your payment confirmation was received.

We are waiting for the merchant payment confirmation.

Your wallet will be credited automatically once the payment is verified.

Please do not submit the same payment again.`,
        );

        return;
      }

      // =========================================================
      // ALREADY APPROVED
      // =========================================================

      if (result.status === "ALREADY_APPROVED") {
        depositSessions.delete(chatId);

        await bot.sendMessage(
          chatId,
          `⚠️ This transaction has already been processed.

If you believe this is an error, please contact support.`,
        );

        return;
      }

      // =========================================================
      // WAITING FOR PLAYER
      // =========================================================

      if (result.status === "WAITING_FOR_PLAYER") {
        await bot.sendMessage(
          chatId,
          `⏳ Payment Found

The merchant payment was found, but we still need your payment confirmation.

Please send your Telebirr SMS or FT reference number.`,
        );

        return;
      }

      // =========================================================
      // DUPLICATE / ALREADY SUBMITTED
      // =========================================================

      if (
        result.status === "DUPLICATE" ||
        result.status === "ALREADY_PENDING"
      ) {
        await bot.sendMessage(
          chatId,
          `⚠️ This transaction is already being processed.

Please wait for verification.

Do not submit the same FT reference again.`,
        );

        return;
      }

      // =========================================================
      // UNKNOWN RESULT
      // =========================================================

      await bot.sendMessage(
        chatId,
        `⏳ Deposit Received

Your payment is being verified.

Please wait for confirmation before submitting again.`,
      );
    } catch (error) {
      console.error("❌ Message handler error:", error);

      try {
        await bot.sendMessage(
          msg.chat.id,
          `❌ Something went wrong.

Please try again or contact support.`,
        );
      } catch (sendError) {
        console.error("❌ Failed to send error message:", sendError);
      }
    }
  });
};
