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

// =========================================================
// PAYMENT SETTINGS
// =========================================================

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

// =========================================================
// REVENUE
// =========================================================

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

// =========================================================
// WITHDRAWALS MENU
// =========================================================

export const sendAdminWithdrawals = async (bot, chatId, pendingCount) => {
  await bot.sendMessage(
    chatId,
    `💸 Withdrawals

⏳ Pending Withdrawals:
${pendingCount}

Choose an option below 👇`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: `⏳ Pending Withdrawals (${pendingCount})`,
              callback_data: "admin_pending_withdrawals",
            },
          ],
          [
            {
              text: "📜 Recent Withdrawals",
              callback_data: "admin_recent_withdrawals",
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

// =========================================================
// SINGLE PENDING WITHDRAWAL
// =========================================================

export const sendPendingWithdrawal = async (bot, chatId, withdrawal) => {
  const player = withdrawal.users;

  const playerName =
    player?.display_name || player?.username || "Unknown Player";

  const telegramId = player?.telegram_id || "Unknown";

  const paymentName =
    withdrawal.payment_method === "TELEBIRR" ? "Telebirr" : "CBE Birr";

  const createdAt = new Date(withdrawal.created_at).toLocaleString("en-ET", {
    timeZone: "Africa/Addis_Ababa",
    dateStyle: "medium",
    timeStyle: "short",
  });

  await bot.sendMessage(
    chatId,
    `💸 Withdrawal Request

👤 Player:
${playerName}

🆔 Telegram ID:
${telegramId}

💰 Amount:
${Number(withdrawal.amount).toLocaleString()} ETB

📱 Method:
${paymentName}

📞 Receiving Number:
${withdrawal.account_number}

⏳ Status:
${withdrawal.status}

🕐 Requested:
${createdAt}

🆔 Withdrawal ID:
${withdrawal.id}`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "✅ Approve",
              callback_data: `admin_approve_withdrawal:${withdrawal.id}`,
            },
          ],
          [
            {
              text: "❌ Reject",
              callback_data: `admin_reject_withdrawal:${withdrawal.id}`,
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
};

// =========================================================
// RECENT WITHDRAWAL
// =========================================================

export const sendRecentWithdrawal = async (bot, chatId, withdrawal) => {
  const player = withdrawal.users;

  const playerName =
    player?.display_name || player?.username || "Unknown Player";

  const paymentName =
    withdrawal.payment_method === "TELEBIRR" ? "Telebirr" : "CBE Birr";

  const createdAt = new Date(withdrawal.created_at).toLocaleString("en-ET", {
    timeZone: "Africa/Addis_Ababa",
    dateStyle: "medium",
    timeStyle: "short",
  });

  let message = `📜 Withdrawal

👤 Player:
${playerName}

💰 Amount:
${Number(withdrawal.amount).toLocaleString()} ETB

📱 Method:
${paymentName}

📞 Number:
${withdrawal.account_number}

📌 Status:
${withdrawal.status}

🕐 Requested:
${createdAt}`;

  if (withdrawal.processed_at) {
    const processedAt = new Date(withdrawal.processed_at).toLocaleString(
      "en-ET",
      {
        timeZone: "Africa/Addis_Ababa",
        dateStyle: "medium",
        timeStyle: "short",
      },
    );

    message += `

🕐 Processed:
${processedAt}`;
  }

  if (withdrawal.rejection_reason) {
    message += `

❌ Rejection Reason:
${withdrawal.rejection_reason}`;
  }

  await bot.sendMessage(chatId, message);
};

// =========================================================
// ANNOUNCEMENTS
// =========================================================

export const sendAdminAnnouncements = async (bot, chatId) => {
  await bot.sendMessage(
    chatId,
    `📢 Announcements

Announcement management will be available here.`,
    {
      reply_markup: {
        inline_keyboard: [
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
