import { isAdmin } from "../utils/auth.js";

import { getAllPlayers } from "../../services/announcementService.js";

import { adminSessions } from "../sessions/sessions.js";

export const registerAnnouncementCallbacks = (bot) => {
  bot.on("callback_query", async (query) => {
    if (!query.message) {
      return;
    }

    const action = query.data;
    const chatId = query.message.chat.id;
    const telegramId = query.from?.id;

    // =====================================================
    // ONLY HANDLE ANNOUNCEMENT CALLBACKS
    // =====================================================

    const announcementActions = [
      "admin_create_announcement",
      "admin_send_announcement",
      "admin_cancel_announcement",
    ];

    if (!announcementActions.includes(action)) {
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
        console.error(
          "❌ Failed to answer unauthorized announcement callback:",
          error,
        );
      }

      return;
    }

    try {
      await bot.answerCallbackQuery(query.id);

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
      // CANCEL ANNOUNCEMENT
      // ===================================================

      if (action === "admin_cancel_announcement") {
        adminSessions.delete(chatId);

        await bot.sendMessage(chatId, "❌ Announcement cancelled.");

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

        // Clear session before broadcasting.
        adminSessions.delete(chatId);

        await bot.sendMessage(
          chatId,
          `📢 Sending announcement...

Please wait.`,
        );

        // =================================================
        // GET ALL PLAYERS
        // =================================================

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

        console.log("====================================");

        console.log("📢 ANNOUNCEMENT BROADCAST STARTED");

        console.log("📢 Total players found:", players.length);

        console.log(
          "📢 Telegram IDs:",
          players.map((player) => player.telegram_id),
        );

        console.log("====================================");

        // =================================================
        // BROADCAST
        // =================================================

        let sent = 0;
        let failed = 0;
        let skipped = 0;

        for (const player of players) {
          const playerTelegramId = player.telegram_id;

          // -------------------------------------------------
          // NO TELEGRAM ID
          // -------------------------------------------------

          if (!playerTelegramId) {
            skipped++;

            console.log("⚠️ Skipping player without Telegram ID:", player.id);

            continue;
          }

          // -------------------------------------------------
          // SEND MESSAGE
          // -------------------------------------------------

          try {
            console.log(`📤 Sending announcement to ${playerTelegramId}...`);

            await bot.sendMessage(
              playerTelegramId,
              `📢 Fast Boch Boch Announcement

${announcement}`,
            );

            sent++;

            console.log(`✅ Announcement sent to ${playerTelegramId}`);

            // Small delay between messages.
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (error) {
            failed++;

            console.error(
              `❌ Failed to send announcement to ${playerTelegramId}`,
            );

            console.error("❌ Error message:", error?.message);

            console.error("❌ Telegram response:", error?.response?.body);
          }
        }

        // =================================================
        // FINAL REPORT
        // =================================================

        console.log("====================================");

        console.log("📢 ANNOUNCEMENT BROADCAST COMPLETE");

        console.log("📢 Total players:", players.length);

        console.log("📢 Successfully sent:", sent);

        console.log("📢 Failed:", failed);

        console.log("📢 Skipped:", skipped);

        console.log("====================================");

        await bot.sendMessage(
          chatId,
          `✅ Announcement Finished

👥 Total Players:
${players.length}

✅ Successfully Sent:
${sent}

❌ Failed:
${failed}

⚠️ Skipped:
${skipped}`,
        );

        return;
      }
    } catch (error) {
      console.error("❌ Announcement callback error:", error);

      try {
        await bot.sendMessage(
          chatId,
          `❌ Something went wrong with the announcement.

Please try again.`,
        );
      } catch (sendError) {
        console.error("❌ Failed to send announcement error:", sendError);
      }
    }
  });
};
