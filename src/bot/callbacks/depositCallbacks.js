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
          paymentMethod: "ቴሌብር",
        });

        const settings = await getTelebirrSettings();

        await bot.answerCallbackQuery(query.id);

        await bot.sendMessage(
          chatId,
          `📱 ቴሌብር ገንዘብ ማስገባት

ክፍያዎን ወደዚህ ይላኩ:

📞 ${settings.phone_number}

👤 ${settings.account_name}

━━━━━━━━━━━━━━━

📋 ገንዘብ ስያስገቡ የሚከተሉት ደረጃዎች ፡

1️⃣ ክፍያዎን ከላይ ወዳለው ስልክ ቁጥር ይላኩ።

2️⃣ ክፍያውን ከፈጸሙ በኋላ፣ ቴሌብር (Telebirr) የጽሑፍ መልእክት (SMS) ይልክልዎታል።

3️⃣ ኤስኤምኤስ (SMS) መልእክቱን ኮፒ አድርገው እዚህ ይላኩ።

የFT ቁጥሩን ብቻም መላክ ይችላሉ።

⚡ ክፍያዎን ከፈጸሙ በኋላ የጽሑፍ መልእክቱን (SMS) አንድ ጊዜ ይላኩ።

ማረጋገጫው ከተከናወነ በኋላ ዋሌትዎ አዉቶማቲክ ይሞላል።.

━━━━━━━━━━━━━━━

🆘 እገዛ ይፈልጋሉ?

Contact @fastbochboch`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "⬅️ ተመለስ",
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
