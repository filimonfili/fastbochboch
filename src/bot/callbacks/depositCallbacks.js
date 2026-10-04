import { getTelebirrSettings } from "../../services/paymentSettingsService.js";
import { sendPaymentMethods } from "../menus/depositMenu.js";

export const registerDepositCallbacks = (bot, depositSessions) => {
  bot.on("callback_query", async (query) => {
    try {
      if (!query.message) return;

      const action = query.data;
      const chatId = query.message.chat.id;

      // =========================================================
      // TELEBIRR DEPOSIT
      // =========================================================

      if (action === "deposit_telebirr") {
        depositSessions.set(chatId, {
          paymentMethod: "TELEBIRR",
        });

        const settings = await getTelebirrSettings();

        await bot.answerCallbackQuery(query.id);

        await bot.sendMessage(
          chatId,
          `📱 Telebirr Deposit

Send your payment to:

📞 ${settings.phone_number}

👤 ${settings.account_name}

━━━━━━━━━━━━━━━

📋 Deposit Steps

1️⃣ Send your payment to the account above.

2️⃣ After payment, Telebirr will send you an SMS.

3️⃣ Copy and send the SMS here.

You can also send only the FT reference number.

⚡ Send the SMS once after making your payment.

Your wallet will be credited automatically after verification.

━━━━━━━━━━━━━━━

🆘 Need help?

Contact @fastbochboch`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "⬅️ Back",
                    callback_data: "deposit_back",
                  },
                ],
              ],
            },
          },
        );

        console.log("💰 Telebirr deposit session started:", {
          chatId,
          telegramId: query.from?.id,
        });

        return;
      }

      // =========================================================
      // CBE BIRR
      // =========================================================

      if (action === "deposit_cbe_birr") {
        depositSessions.delete(chatId);

        await bot.answerCallbackQuery(query.id);

        await bot.sendMessage(
          chatId,
          `🏦 CBE Birr Deposit

CBE Birr deposit instructions will be added next.`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "⬅️ Back",
                    callback_data: "deposit_back",
                  },
                ],
              ],
            },
          },
        );

        return;
      }

      // =========================================================
      // BACK
      // =========================================================

      if (action === "deposit_back") {
        depositSessions.delete(chatId);

        await bot.answerCallbackQuery(query.id);

        await sendPaymentMethods(bot, chatId);

        return;
      }
    } catch (error) {
      console.error("❌ Deposit callback error:", error);

      try {
        await bot.answerCallbackQuery(query.id, {
          text: "❌ Something went wrong",
          show_alert: true,
        });
      } catch (callbackError) {
        console.error("❌ Failed to answer callback:", callbackError);
      }
    }
  });
};
