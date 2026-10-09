// bot/menus/depositMenu.js

// ============================================================
// PAYMENT METHODS MENU
// ============================================================

export const sendPaymentMethods = async (bot, chatId) => {
  await bot.sendMessage(
    chatId,
    `💰 ተቀማጭ ገንዘብ

የክፍያ ዘዴዎን ይምረጡ 👇`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "📱 ቴሌብር",
              callback_data: "deposit_telebirr",
            },
          ],
        ],
      },
    },
  );
};
