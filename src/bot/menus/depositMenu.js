// bot/menus/depositMenu.js

// ============================================================
// PAYMENT METHODS MENU
// ============================================================

export const sendPaymentMethods = async (bot, chatId) => {
  await bot.sendMessage(
    chatId,
    `💰 Deposit

Choose your payment method 👇`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "📱 Telebirr",
              callback_data: "deposit_telebirr",
            },
          ],
        ],
      },
    },
  );
};
