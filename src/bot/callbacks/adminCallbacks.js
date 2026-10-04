import supabase from "../../config/supabase.js";

import { isAdmin } from "../utils/auth.js";

import {
  getTelebirrSettings,
  updateTelebirrPhone,
  updateTelebirrAccountName,
} from "../../services/paymentSettingsService.js";

import { getRevenue } from "../../services/revenueService.js";

import {
  getPendingWithdrawals,
  getRecentWithdrawals,
  approveWithdrawal,
} from "../../services/adminWithdrawalService.js";

import { getAllPlayers } from "../../services/announcementService.js";

import {
  sendAdminMenu,
  sendAdminPaymentSettings,
  sendAdminRevenue,
  sendAdminWithdrawals,
  sendPendingWithdrawal,
  sendRecentWithdrawal,
  sendAdminAnnouncements,
} from "../menus/adminMenu.js";

import { adminSessions } from "../sessions/sessions.js";

export const registerAdminCallbacks = (bot) => {
  bot.on("callback_query", async (query) => {
    if (!query.message) {
      return;
    }

    const action = query.data;
    const chatId = query.message.chat.id;
    const telegramId = query.from?.id;

    // =====================================================
    // ONLY HANDLE ADMIN CALLBACKS
    // =====================================================

    const isAdminCallback =
      action === "admin_payment_settings" ||
      action === "admin_change_phone" ||
      action === "admin_change_name" ||
      action === "admin_revenue" ||
      action === "admin_withdrawals" ||
      action === "admin_pending_withdrawals" ||
      action === "admin_recent_withdrawals" ||
      action === "admin_announcements" ||
      action === "admin_create_announcement" ||
      action === "admin_send_announcement" ||
      action === "admin_cancel_announcement" ||
      action === "admin_back" ||
      action?.startsWith("admin_approve_withdrawal:") ||
      action?.startsWith("admin_reject_withdrawal:");

    if (!isAdminCallback) {
      return;
    }

    // =====================================================
    // ADMIN SECURITY CHECK
    // =====================================================

    if (!telegramId || !isAdmin(telegramId)) {
      try {
        await bot.answerCallbackQuery(query.id, {
          text: "❌ Unauthorized",
          show_alert: true,
        });
      } catch (error) {
        console.error("❌ Failed to answer unauthorized callback:", error);
      }

      return;
    }

    try {
      // Answer callback exactly once.
      await bot.answerCallbackQuery(query.id);

      // ===================================================
      // BACK TO ADMIN MENU
      // ===================================================

      if (action === "admin_back") {
        adminSessions.delete(chatId);

        await sendAdminMenu(bot, chatId);

        return;
      }

      // ===================================================
      // PAYMENT SETTINGS
      // ===================================================

      if (action === "admin_payment_settings") {
        const settings = await getTelebirrSettings();

        await sendAdminPaymentSettings(bot, chatId, settings);

        return;
      }

      // ===================================================
      // CHANGE TELEBIRR PHONE
      // ===================================================

      if (action === "admin_change_phone") {
        adminSessions.set(chatId, {
          action: "CHANGE_TELEBIRR_PHONE",
        });

        await bot.sendMessage(
          chatId,
          `📱 Change Telebirr Number

Please send the new Telebirr phone number.

Example:

0912345678

Send /cancel to cancel.`,
        );

        return;
      }

      // ===================================================
      // CHANGE TELEBIRR ACCOUNT NAME
      // ===================================================

      if (action === "admin_change_name") {
        adminSessions.set(chatId, {
          action: "CHANGE_TELEBIRR_NAME",
        });

        await bot.sendMessage(
          chatId,
          `👤 Change Telebirr Account Name

Please send the new account name.

Example:

Filmon Gebremedhin

Send /cancel to cancel.`,
        );

        return;
      }

      // ===================================================
      // REVENUE
      // ===================================================

      if (action === "admin_revenue") {
        try {
          const revenue = await getRevenue();

          await sendAdminRevenue(bot, chatId, revenue);
        } catch (error) {
          console.error("❌ Admin revenue error:", error);

          await bot.sendMessage(
            chatId,
            `❌ Failed to load revenue.

Please try again.`,
          );
        }

        return;
      }

      // ===================================================
      // WITHDRAWALS MAIN MENU
      // ===================================================

      if (action === "admin_withdrawals") {
        const pending = await getPendingWithdrawals();

        await sendAdminWithdrawals(bot, chatId, pending.length);

        return;
      }

      // ===================================================
      // PENDING WITHDRAWALS
      // ===================================================

      if (action === "admin_pending_withdrawals") {
        const pending = await getPendingWithdrawals();

        if (pending.length === 0) {
          await bot.sendMessage(
            chatId,
            `⏳ Pending Withdrawals

There are currently no pending withdrawal requests.`,
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "🔄 Refresh",
                      callback_data: "admin_pending_withdrawals",
                    },
                  ],
                  [
                    {
                      text: "⬅️ Back",
                      callback_data: "admin_withdrawals",
                    },
                  ],
                ],
              },
            },
          );

          return;
        }

        await bot.sendMessage(
          chatId,
          `⏳ Pending Withdrawals

There are ${pending.length} pending request(s).`,
        );

        for (const withdrawal of pending) {
          await sendPendingWithdrawal(bot, chatId, withdrawal);
        }

        return;
      }

      // ===================================================
      // RECENT WITHDRAWALS
      // ===================================================

      if (action === "admin_recent_withdrawals") {
        const withdrawals = await getRecentWithdrawals();

        if (withdrawals.length === 0) {
          await bot.sendMessage(
            chatId,
            `📜 Recent Withdrawals

No withdrawal history yet.`,
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "⬅️ Back",
                      callback_data: "admin_withdrawals",
                    },
                  ],
                ],
              },
            },
          );

          return;
        }

        await bot.sendMessage(
          chatId,
          `📜 Recent Withdrawals

Showing the latest ${withdrawals.length} withdrawal request(s).`,
        );

        for (const withdrawal of withdrawals) {
          await sendRecentWithdrawal(bot, chatId, withdrawal);
        }

        await bot.sendMessage(chatId, "Choose an option 👇", {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🔄 Refresh",
                  callback_data: "admin_recent_withdrawals",
                },
              ],
              [
                {
                  text: "⬅️ Back",
                  callback_data: "admin_withdrawals",
                },
              ],
            ],
          },
        });

        return;
      }

      // ===================================================
      // APPROVE WITHDRAWAL
      // ===================================================

      if (action.startsWith("admin_approve_withdrawal:")) {
        const withdrawalId = action.substring(
          "admin_approve_withdrawal:".length,
        );

        if (!withdrawalId) {
          await bot.sendMessage(chatId, "❌ Invalid withdrawal ID.");

          return;
        }

        try {
          const result = await approveWithdrawal(withdrawalId);

          const paymentName =
            result.payment_method === "TELEBIRR" ? "Telebirr" : "CBE Birr";

          // -------------------------------------------
          // ADMIN CONFIRMATION
          // -------------------------------------------

          await bot.sendMessage(
            chatId,
            `✅ Withdrawal Approved

💰 Amount:
${Number(result.amount).toLocaleString()} ETB

📱 Method:
${paymentName}

📞 Receiving Number:
${result.account_number}

📌 Status:
COMPLETED

The withdrawal has been marked as completed.`,
          );

          // -------------------------------------------
          // FIND PLAYER TELEGRAM ID
          // -------------------------------------------

          const { data: user, error: userError } = await supabase
            .from("users")
            .select("telegram_id")
            .eq("id", result.user_id)
            .single();

          if (userError) {
            console.error("❌ Failed to find withdrawal player:", userError);
          }

          // -------------------------------------------
          // NOTIFY PLAYER
          // -------------------------------------------

          if (user?.telegram_id) {
            try {
              await bot.sendMessage(
                user.telegram_id,
                `✅ Withdrawal Completed

💰 Amount:
${Number(result.amount).toLocaleString()} ETB

📱 Method:
${paymentName}

📞 Sent to:
${result.account_number}

Your withdrawal request has been completed successfully. 🎉`,
              );
            } catch (notificationError) {
              console.error(
                "❌ Failed to notify player about completed withdrawal:",
                notificationError,
              );
            }
          }

          console.log("✅ Withdrawal approved:", result);
        } catch (error) {
          console.error("❌ Approve withdrawal error:", error);

          const message = error?.message || "";

          if (message.includes("WITHDRAWAL_ALREADY_PROCESSED")) {
            await bot.sendMessage(
              chatId,
              `⚠️ This withdrawal has already been processed.

It cannot be approved again.`,
            );

            return;
          }

          if (message.includes("WITHDRAWAL_NOT_FOUND")) {
            await bot.sendMessage(chatId, `❌ Withdrawal not found.`);

            return;
          }

          await bot.sendMessage(
            chatId,
            `❌ Failed to approve withdrawal.

No additional wallet operation was performed.

Please try again.`,
          );
        }

        return;
      }

      // ===================================================
      // REJECT WITHDRAWAL
      // ===================================================

      if (action.startsWith("admin_reject_withdrawal:")) {
        const withdrawalId = action.substring(
          "admin_reject_withdrawal:".length,
        );

        if (!withdrawalId) {
          await bot.sendMessage(chatId, "❌ Invalid withdrawal ID.");

          return;
        }

        adminSessions.set(chatId, {
          action: "REJECT_WITHDRAWAL",
          withdrawalId,
        });

        await bot.sendMessage(
          chatId,
          `❌ Reject Withdrawal

Please enter the reason for rejecting this withdrawal.

Example:

Invalid receiving number

The player's money will be refunded automatically after rejection.

Send /cancel to cancel.`,
        );

        return;
      }

      // ===================================================
      // ANNOUNCEMENTS MENU
      // ===================================================

      if (action === "admin_announcements") {
        await sendAdminAnnouncements(bot, chatId);

        return;
      }

      // ===================================================
      // CREATE ANNOUNCEMENT
      // ===================================================

      if (action === "admin_create_announcement") {
        adminSessions.set(chatId, {
          action: "CREATE_ANNOUNCEMENT",
        });

        await bot.sendMessage(
          chatId,
          `📢 Create Announcement

Send the message you want to broadcast to all players.

You can use text and emojis.

Send /cancel to cancel.`,
        );

        return;
      }

      // ===================================================
      // SEND ANNOUNCEMENT
      // ===================================================

      if (action === "admin_send_announcement") {
        const session = adminSessions.get(chatId);

        if (
          !session ||
          session.action !== "CONFIRM_ANNOUNCEMENT" ||
          !session.announcement
        ) {
          adminSessions.delete(chatId);

          await bot.sendMessage(
            chatId,
            `⚠️ Announcement session expired.

Please create the announcement again.`,
          );

          return;
        }

        const announcement = session.announcement;

        adminSessions.delete(chatId);

        await bot.sendMessage(
          chatId,
          `📢 Sending announcement...

Please wait.`,
        );

        let players;

        try {
          players = await getAllPlayers();
        } catch (error) {
          console.error("❌ Failed to load players:", error);

          await bot.sendMessage(
            chatId,
            `❌ Failed to load players.

The announcement was not sent.`,
          );

          return;
        }

        let sent = 0;
        let failed = 0;

        for (const player of players) {
          if (!player.telegram_id) {
            continue;
          }

          try {
            await bot.sendMessage(
              player.telegram_id,
              `📢 Fast Boch Boch Announcement

${announcement}`,
            );

            sent++;

            // Small delay to reduce
            // Telegram rate-limit risk.
            await new Promise((resolve) => setTimeout(resolve, 50));
          } catch (error) {
            failed++;

            console.error(
              `❌ Failed to send announcement to ${player.telegram_id}:`,
              error.message,
            );
          }
        }

        await bot.sendMessage(
          chatId,
          `✅ Announcement Finished

👥 Total Players:
${players.length}

✅ Successfully Sent:
${sent}

❌ Failed:
${failed}`,
        );

        return;
      }

      // ===================================================
      // CANCEL ANNOUNCEMENT
      // ===================================================

      if (action === "admin_cancel_announcement") {
        adminSessions.delete(chatId);

        await bot.sendMessage(chatId, "❌ Announcement cancelled.");

        return;
      }
    } catch (error) {
      console.error("❌ Admin callback error:", error);

      try {
        await bot.sendMessage(
          chatId,
          `❌ Something went wrong.

Please try again.`,
        );
      } catch (sendError) {
        console.error("❌ Failed to send admin error:", sendError);
      }
    }
  });
};
