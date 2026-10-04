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
          [
            {
              text: "📢 Announcements",
              callback_data: "admin_announcements",
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

// ============================================================
// ADMIN REVENUE
// ============================================================

export const sendAdminRevenue = async (bot, chatId, revenue) => {
  await bot.sendMessage(
    chatId,
    `📊 Revenue

📅 Today

💰 Bets:
${revenue.today.bets.toLocaleString()} ETB

🏆 Prizes:
${revenue.today.prizes.toLocaleString()} ETB

📈 Platform Revenue:
${revenue.today.revenue.toLocaleString()} ETB

━━━━━━━━━━━━━━━

📊 All Time

💰 Bets:
${revenue.allTime.bets.toLocaleString()} ETB

🏆 Prizes:
${revenue.allTime.prizes.toLocaleString()} ETB

📈 Platform Revenue:
${revenue.allTime.revenue.toLocaleString()} ETB`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🔄 Refresh",
              callback_data: "admin_revenue",
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
