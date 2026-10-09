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
          text: "💰 ቀሪ ሂሳብ",
        },
        {
          text: "➕ ገንዘብ ማስገባት",
        },
      ],
      [
        {
          text: "💸 ገንዘብ ማውጣት",
        },
        {
          text: "🆘 ድጋፍ",
        },
      ],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };

  await bot.sendMessage(
    chatId,
    `🤖 ቦጭ ቦጭ

እንኳን ደህና መጡ! ከዚህ በታች ካሉት አማራጮች አንዱን ይምረጡ።👇

🎮 ለመጫወት, /playnow ይጠቀሙ`,
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
    `🎮 ቦጭ ቦጭ

ለመጫወት ዝግጁ ነዎት?`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🎮 ቦጭ ቦጭን ይጫወቱ",
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
          `❌ መለያዎ ሊገኝ አልቻለም።

እባክዎ በመጀመሪያ /start የሚለውን ይጠቀሙ።`,
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
          `💰 ቀሪ ሂሳብ
ቀሪ ሂሳብ፡
0 ብር`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🎮 ቦጭ ቦጭን ይጫወቱ ",
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
      `💰 ቀሪ ሂሳብ

ሊጠቀምበት የሚቻል ቀሪ ሂሳብ፡
${balance.toLocaleString()} ብር`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🎮 ቦጭ ቦጭን ይጫወቱ ",
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
      `❌ በአሁኑ ወቅት ቀሪ ሂሳብዎን ማረጋገጥ አልተቻለም።

እባክዎ እንደገና ይሞክሩ።`,
    );
  }
};

// ============================================================
// WITHDRAW MESSAGE
// ============================================================

export const sendWithdrawMessage = async (bot, chatId) => {
  await bot.sendMessage(
    chatId,
    `💸 ማውጣት

ገንዘብ የማውጣት አማራጮች እዚህ ይገኛሉ።`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🎮 ቦጭ ቦጭን ይጫወቱ",
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
