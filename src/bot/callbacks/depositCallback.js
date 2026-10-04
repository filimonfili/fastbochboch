// bot/callbacks/adminCallbacks.js

import {
  getTelebirrSettings,
  updateTelebirrPhone,
  updateTelebirrAccountName,
} from "../../services/paymentSettingsService.js";

import { isAdmin } from "../utils/auth.js";

import { sendAdminMenu, sendAdminPaymentSettings } from "../menus/adminMenu.js";

export const registerAdminCallbacks = (bot, adminSessions) => {
  bot.on("callback_query", async (query) => {
    try {
      if (!query.message) {
        return;
      }

      const action = query.data;
      const chatId = query.message.chat.id;
      const telegramId = query.from?.id;

      // ======================================================
      // ONLY HANDLE ADMIN CALLBACKS
      // ======================================================

      const adminActions = [
        "admin_payment_settings",
        "admin_change_phone",
        "admin_change_name",
        "admin_revenue",
        "admin_withdrawals",
        "admin_back",
      ];

      if (!adminActions.includes(action)) {
        return;
      }

      // ======================================================
      // ADMIN AUTHENTICATION
      // ======================================================

      if (!telegramId || !isAdmin(telegramId)) {
        await bot.answerCallbackQuery(query.id, {
          text: "❌ Unauthorized",
          show_alert: true,
        });

        console.log("🚫 Unauthorized admin callback:", {
          telegramId,
          action,
        });

        return;
      }

      await bot.answerCallbackQuery(query.id);

      // ======================================================
      // PAYMENT SETTINGS
      // ======================================================

      if (action === "admin_payment_settings") {
        const settings = await getTelebirrSettings();

        await sendAdminPaymentSettings(bot, chatId, settings);

        return;
      }

      // ======================================================
      // CHANGE PHONE
      // ======================================================

      if (action === "admin_change_phone") {
        adminSessions.set(chatId, {
          action: "CHANGE_TELEBIRR_PHONE",
        });

        await bot.sendMessage(
          chatId,
          `📱 Change Telebirr Number

Send the new Telebirr number.

Example:

0912345678

Send /cancel to cancel.`,
        );

        return;
      }

      // ======================================================
      // CHANGE ACCOUNT NAME
      // ======================================================

      if (action === "admin_change_name") {
        adminSessions.set(chatId, {
          action: "CHANGE_TELEBIRR_NAME",
        });

        await bot.sendMessage(
          chatId,
          `👤 Change Telebirr Account Name

Send the new account name.

Send /cancel to cancel.`,
        );

        return;
      }

      // ======================================================
      // BACK
      // ======================================================

      if (action === "admin_back") {
        adminSessions.delete(chatId);

        await sendAdminMenu(bot, chatId);

        return;
      }

      // ======================================================
      // REVENUE
      // ======================================================

      if (action === "admin_revenue") {
        await bot.sendMessage(
          chatId,
          `📊 Revenue

Revenue dashboard will be added next.`,
        );

        return;
      }

      // ======================================================
      // WITHDRAWALS
      // ======================================================

      if (action === "admin_withdrawals") {
        await bot.sendMessage(
          chatId,
          `💸 Withdrawals

Withdrawal management will be added next.`,
        );

        return;
      }
    } catch (error) {
      console.error("❌ Admin callback error:", error);
    }
  });
};

// ============================================================
// ADMIN TEXT SESSION HANDLER
// ============================================================

export const registerAdminSessionHandler = (bot, adminSessions) => {
  bot.on("message", async (msg) => {
    try {
      if (!msg.text) {
        return;
      }

      const chatId = msg.chat.id;
      const telegramId = msg.from?.id;
      const text = msg.text.trim();

      // Not admin
      if (!telegramId || !isAdmin(telegramId)) {
        return;
      }

      const session = adminSessions.get(chatId);

      if (!session) {
        return;
      }

      // ======================================================
      // CANCEL
      // ======================================================

      if (text === "/cancel") {
        adminSessions.delete(chatId);

        await bot.sendMessage(chatId, "❌ Admin action cancelled.");

        await sendAdminMenu(bot, chatId);

        return;
      }

      // ======================================================
      // CHANGE PHONE
      // ======================================================

      if (session.action === "CHANGE_TELEBIRR_PHONE") {
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

      // ======================================================
      // CHANGE ACCOUNT NAME
      // ======================================================

      if (session.action === "CHANGE_TELEBIRR_NAME") {
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
    } catch (error) {
      console.error("❌ Admin session error:", error);
    }
  });
};
