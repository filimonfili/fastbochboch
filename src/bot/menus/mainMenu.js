const miniAppUrl = process.env.TELEGRAM_MINI_APP_URL;

// ============================================================
// MAIN PLAYER MENU
// ============================================================

export const sendMainMenu = async (bot, chatId) => {
  const mainMenuKeyboard = {
    keyboard: [
      [
        {
          text: "🎮 Play Boch Boch",
          web_app: {
            url: miniAppUrl,
          },
        },
      ],
      [
        {
          text: "💰 Balance",
        },
        {
          text: "➕ Deposit",
        },
      ],
      [
        {
          text: "💸 Withdraw",
        },
        {
          text: "🆘 Support",
        },
      ],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };

  await bot.sendMessage(
    chatId,
    `🤖 Fast Boch Boch

Welcome! Choose an option below 👇`,
    {
      reply_markup: mainMenuKeyboard,
    },
  );
};

// ============================================================
// PLAY MESSAGE
// ============================================================

export const sendPlayMessage = async (bot, chatId) => {
  await bot.sendMessage(
    chatId,
    `🎮 Fast Boch Boch

Ready to play?`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🎮 Open Boch Boch",
              web_app: {
                url: miniAppUrl,
              },
            },
          ],
        ],
      },
    },
  );
};

// ============================================================
// BALANCE MESSAGE
// ============================================================

export const sendBalanceMessage = async (bot, chatId) => {
  await bot.sendMessage(
    chatId,
    `💰 Balance

Your wallet balance is available inside Boch Boch.`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🎮 Open Boch Boch",
              web_app: {
                url: miniAppUrl,
              },
            },
          ],
        ],
      },
    },
  );
};

// ============================================================
// WITHDRAW MESSAGE
// ============================================================

export const sendWithdrawMessage = async (bot, chatId) => {
  await bot.sendMessage(
    chatId,
    `💸 Withdraw

Withdrawal options will be available here.`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🎮 Open Boch Boch",
              web_app: {
                url: miniAppUrl,
              },
            },
          ],
        ],
      },
    },
  );
};
