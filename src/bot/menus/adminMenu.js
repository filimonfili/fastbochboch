// ============================================================
// ADMIN MAIN MENU
// ============================================================

export const sendAdminMenu = async (bot, chatId) => {
  await bot.sendMessage(
    chatId,
    `🔐 Fast Boch Boch Admin

Choose an option below 👇`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "⚙️ Payment Settings",
              callback_data: "admin_payment_settings",
            },
          ],
          [
            {
              text: "📊 Revenue",
              callback_data: "admin_revenue",
            },
          ],
          [
            {
              text: "💸 Withdrawals",
              callback_data: "admin_withdrawals",
            },
          ],
        ],
      },
    },
  );
};

// ============================================================
// ADMIN PAYMENT SETTINGS
// ============================================================

export const sendAdminPaymentSettings = async (bot, chatId, settings) => {
  await bot.sendMessage(
    chatId,
    `⚙️ Payment Settings

📱 Telebirr Number:

${settings.phone_number}

👤 Account Name:

${settings.account_name}

Choose what you want to change 👇`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "📱 Change Number",
              callback_data: "admin_change_phone",
            },
          ],
          [
            {
              text: "👤 Change Name",
              callback_data: "admin_change_name",
            },
          ],
          [
            {
              text: "⬅️ Back",
              callback_data: "admin_back",
            },
          ],
        ],
      },
    },
  );
};
