// bot/commands/admin.js

import { isAdmin } from "../utils/auth.js";
import { sendAdminMenu } from "../menus/adminMenu.js";

export const registerAdminCommand = (bot) => {
  bot.onText(/^\/admin$/, async (msg) => {
    try {
      const telegramId = msg.from?.id;
      const chatId = msg.chat.id;

      console.log("🔐 Admin login attempt:", {
        telegramId,
        username: msg.from?.username,
        isAdmin: isAdmin(telegramId),
      });

      // ------------------------------------------------------
      // ADMIN AUTHENTICATION
      // ------------------------------------------------------

      if (!telegramId || !isAdmin(telegramId)) {
        await bot.sendMessage(
          chatId,
          "❌ You are not authorized to access the admin panel.",
        );

        return;
      }

      // ------------------------------------------------------
      // OPEN ADMIN MENU
      // ------------------------------------------------------

      await sendAdminMenu(bot, chatId);

      console.log("✅ Admin panel opened:", {
        telegramId,
        chatId,
      });
    } catch (error) {
      console.error("❌ /admin error:", error);

      try {
        await bot.sendMessage(
          msg.chat.id,
          "❌ Something went wrong while opening the admin panel.",
        );
      } catch (sendError) {
        console.error("❌ Failed to send admin error message:", sendError);
      }
    }
  });
};
