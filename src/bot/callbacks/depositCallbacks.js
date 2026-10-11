import { getTelebirrSettings } from "../../services/paymentSettingsService.js";
import { sendPaymentMethods } from "../menus/depositMenu.js";

export const registerDepositCallbacks = (bot, depositSessions) => {
  bot.on("callback_query", async (query) => {
    if (!query.message) return;

    const action = query.data;
    const chatId = query.message.chat.id;

    const depositActions = [
      "deposit_telebirr",
      "deposit_cbe_birr",
      "deposit_back",
    ];

    if (!depositActions.includes(action)) return;

    try {
      await bot.answerCallbackQuery(query.id);

      // =========================================================
      // TELEBIRR DEPOSIT
      // =========================================================

      if (action === "deposit_telebirr") {
        const settings = await getTelebirrSettings();

        if (!settings?.phone_number || !settings?.account_name) {
          await bot.sendMessage(
            chatId,
            "❌ የቴሌብር ክፍያ መረጃ አልተገኘም። እባክዎ ቆይተው እንደገና ይሞክሩ።",
          );

          return;
        }

        // Keep this value consistent with registerMessageHandler.js.
        depositSessions.set(chatId, {
          paymentMethod: "TELEBIRR",
        });

        await bot.sendMessage(
          chatId,
          `📱 ቴሌብር ገንዘብ ማስገባት

ክፍያዎን ወደዚህ ይላኩ፦

📞 ${settings.phone_number}

👤 ${settings.account_name}

━━━━━━━━━━━━━━━

📋 የክፍያ ሂደት

1️⃣ ገንዘቡን ከላይ ወዳለው ስልክ ቁጥር ይላኩ።

2️⃣ ክፍያውን ከፈጸሙ በኋላ ከቴሌብር የሚመጣውን SMS ይጠብቁ።

3️⃣ የSMS መልእክቱን ኮፒ አድርገው እዚህ ይላኩ።

ወይም የFT ቁጥሩን ብቻ ይላኩ።

⚠️ የክፍያ መልእክቱን ወይም FT ቁጥሩን አንድ ጊዜ ብቻ ይላኩ።

✅ ክፍያው ከተረጋገጠ በኋላ ዋሌትዎ በራስ-ሰር ይሞላል።

━━━━━━━━━━━━━━━

🆘 እገዛ ከፈለጉ @fastbochboch ያነጋግሩ።`,
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
      // CBE BIRR — NOT IMPLEMENTED YET
      // =========================================================

      if (action === "deposit_cbe_birr") {
        depositSessions.delete(chatId);

        await bot.sendMessage(
          chatId,
          `🏦 CBE Birr

የCBE Birr ገንዘብ ማስገቢያ አገልግሎት ገና አልተዘጋጀም።

እባክዎ ለጊዜው ቴሌብርን ይጠቀሙ።`,
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

        return;
      }

      // =========================================================
      // BACK TO PAYMENT METHODS
      // =========================================================

      if (action === "deposit_back") {
        depositSessions.delete(chatId);

        await sendPaymentMethods(bot, chatId);

        return;
      }
    } catch (error) {
      console.error("❌ Deposit callback error:", error);

      try {
        await bot.sendMessage(chatId, "❌ ችግር ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።");
      } catch (sendError) {
        console.error("❌ Failed to send deposit error:", sendError);
      }
    }
  });
};
