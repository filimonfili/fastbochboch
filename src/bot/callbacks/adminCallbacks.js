import { getTelebirrSettings } from "../../services/paymentSettingsService.js";
import { getRevenue } from "../../services/revenueService.js";

import { isAdmin } from "../utils/auth.js";

import {
  sendAdminMenu,
  sendAdminPaymentSettings,
  sendAdminRevenue,
} from "../menus/adminMenu.js";

export const registerAdminCallbacks = (bot, adminSessions) => {
  bot.on("callback_query", async (query) => {
    if (!query.message) {
      return;
    }

    const action = query.data;
    const chatId = query.message.chat.id;
    const telegramId = query.from?.id;

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

    // ============================================================
    // ADMIN AUTH CHECK
    // ============================================================

    if (!telegramId || !isAdmin(telegramId)) {
      try {
        await bot.answerCallbackQuery(query.id, {
          text: "❌ Unauthorized",
          show_alert: true,
        });
      } catch (error) {
        console.error("❌ Failed to answer unauthorized callback:", error);
      }

      console.log("🚫 Unauthorized admin callback:", {
        telegramId,
        action,
      });

      return;
    }

    // ============================================================
    // ANSWER CALLBACK ONCE
    // ============================================================

    try {
      await bot.answerCallbackQuery(query.id);
    } catch (error) {
      console.error("❌ Failed to answer callback:", error);
    }

    // ============================================================
    // HANDLE ADMIN ACTION
    // ============================================================

    try {
      // ----------------------------------------------------------
      // PAYMENT SETTINGS
      // ----------------------------------------------------------

      if (action === "admin_payment_settings") {
        const settings = await getTelebirrSettings();

        await sendAdminPaymentSettings(bot, chatId, settings);

        return;
      }

      // ----------------------------------------------------------
      // CHANGE TELEBIRR PHONE
      // ----------------------------------------------------------

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

      // ----------------------------------------------------------
      // CHANGE TELEBIRR NAME
      // ----------------------------------------------------------

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

      // ----------------------------------------------------------
      // REVENUE
      // ----------------------------------------------------------

      if (action === "admin_revenue") {
        console.log("📊 Loading admin revenue...");

        const revenue = await getRevenue();

        console.log("📊 Revenue result:", revenue);

        await sendAdminRevenue(bot, chatId, revenue);

        console.log("✅ Revenue sent to admin");

        return;
      }

      // ----------------------------------------------------------
      // WITHDRAWALS
      // ----------------------------------------------------------

      if (action === "admin_withdrawals") {
        await bot.sendMessage(
          chatId,
          `💸 Withdrawals

Withdrawal management will be added next.`,
        );

        return;
      }

      // ----------------------------------------------------------
      // ANNOUNCEMENTS
      // ----------------------------------------------------------

      if (action === "admin_announcements") {
        await bot.sendMessage(
          chatId,
          `📢 Announcements

Announcement management will be added next.`,
        );

        return;
      }

      // ----------------------------------------------------------
      // BACK
      // ----------------------------------------------------------

      if (action === "admin_back") {
        adminSessions.delete(chatId);

        await sendAdminMenu(bot, chatId);

        return;
      }
    } catch (error) {
      // IMPORTANT:
      // Do NOT call answerCallbackQuery here again.
      // The callback was already answered above.

      console.error("❌ Admin callback action failed:", {
        action,
        telegramId,
        chatId,
        error,
      });

      try {
        await bot.sendMessage(
          chatId,
          "❌ Something went wrong. Please try again.",
        );
      } catch (sendError) {
        console.error("❌ Failed to send admin error message:", sendError);
      }
    }
  });
};
