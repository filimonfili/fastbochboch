import supabase from "../../config/supabase.js";

const miniAppUrl = process.env.TELEGRAM_MINI_APP_URL;

// ============================================================
// MAIN PLAYER MENU
// ============================================================

export const sendMainMenu = async (bot, chatId) => {
  const mainMenuKeyboard = {
    keyboard: [
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

Welcome! Choose an option below 👇

🎮 To play, use /playnow`,
    {
      reply_markup: mainMenuKeyboard,
    },
  );
};

// ============================================================
// PLAY MESSAGE
// ============================================================

export const sendPlayMessage = async (bot, chatId) => {
  console.log("🎮 sendPlayMessage CALLED");
  console.log("🎮 MINI APP URL:", miniAppUrl);

  await bot.sendMessage(
    chatId,
    `🎮 Fast Boch Boch

Ready to play?`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🎮 Play Boch Boch",
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
// CURRENT BALANCE MESSAGE
// ============================================================

export const sendBalanceMessage = async (bot, chatId) => {
  try {
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("telegram_id", chatId)
      .single();

    if (userError) {
      if (userError.code === "PGRST116") {
        await bot.sendMessage(
          chatId,
          `❌ Your account could not be found.

Please use /start first.`,
        );
        return;
      }

      throw userError;
    }

    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (walletError) {
      if (walletError.code === "PGRST116") {
        await bot.sendMessage(
          chatId,
          `💰 Balance

Available Balance:
0 ETB`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🎮 Play Boch Boch",
                    web_app: {
                      url: miniAppUrl,
                    },
                  },
                ],
              ],
            },
          },
        );

        return;
      }

      throw walletError;
    }

    const balance = Number(wallet.balance || 0);

    await bot.sendMessage(
      chatId,
      `💰 Balance

Available Balance:
${balance.toLocaleString()} ETB`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🎮 Play Boch Boch",
                web_app: {
                  url: miniAppUrl,
                },
              },
            ],
          ],
        },
      },
    );
  } catch (error) {
    console.error("❌ Failed to get player balance:", error);

    await bot.sendMessage(
      chatId,
      `❌ Unable to check your balance right now.

Please try again.`,
    );
  }
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
              text: "🎮 Play Boch Boch",
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
