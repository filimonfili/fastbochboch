import {
  getTelebirrSettings,
  updateTelebirrPhone,
  updateTelebirrAccountName,
} from "../../services/paymentSettingsService.js";

import { getRevenue } from "../../services/revenueService.js";

import { isAdmin } from "../utils/auth.js";

import {
  sendAdminMenu,
  sendAdminPaymentSettings,
  sendAdminRevenue,
} from "../menus/adminMenu.js";

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
        "admin_announcements",
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
      // REVENUE
      // ======================================================

      if (action === "admin_revenue") {
        const revenue = await getRevenue();

        await sendAdminRevenue(bot, chatId, revenue);

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

      // ======================================================
      // ANNOUNCEMENTS
      // ======================================================

      if (action === "admin_announcements") {
        await bot.sendMessage(
          chatId,
          `📢 Announcements

Announcement management will be added next.`,
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
    } catch (error) {
      console.error("❌ Admin callback error:", error);

      try {
        await bot.answerCallbackQuery(query.id, {
          text: "❌ Something went wrong",
          show_alert: true,
        });
      } catch (callbackError) {
        console.error("❌ Failed to answer admin callback:", callbackError);
      }
    }
  });
};
