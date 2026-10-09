import supabase from "../../config/supabase.js";

import { getUserWithdrawalBalance } from "../../services/withdrawalService.js";

import { withdrawalSessions } from "../sessions/sessions.js";

// ============================================================
// START WITHDRAWAL
// ============================================================

export const startWithdrawal = async (bot, msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id;

  try {
    if (!telegramId) {
      await bot.sendMessage(chatId, "❌ የእርስዎን የቴሌግራም አካውንት መለየት አልተቻለም።");

      return;
    }

    // --------------------------------------------------------
    // FIND USER
    // --------------------------------------------------------

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("telegram_id", telegramId)
      .single();

    if (userError || !user) {
      console.error("❌ Withdrawal user lookup failed:", userError);

      await bot.sendMessage(chatId, "❌ መለያዎ ሊገኝ አልቻለም።");

      return;
    }

    // --------------------------------------------------------
    // GET BALANCE
    // --------------------------------------------------------

    const balance = await getUserWithdrawalBalance(user.id);

    console.log("💸 Withdrawal balance:", {
      telegramId,
      userId: user.id,
      balance,
    });

    // --------------------------------------------------------
    // ZERO BALANCE
    // --------------------------------------------------------

    if (balance <= 0) {
      await bot.sendMessage(
        chatId,
        `💸 ገንዘብ ማውጣት

❌ በሂሳብዎ ውስጥ ገንዘብ የለም።

የአሁኑ ቀሪ ሂሳብዎ 0 ETB ነው።

እባክዎ ገንዘብ ከማውጣትዎ በፊት ገንዘብ ያስገቡ ወይም ጨዋታ ያሸንፉ።`,
      );

      return;
    }

    // --------------------------------------------------------
    // CREATE WITHDRAWAL SESSION
    // --------------------------------------------------------

    withdrawalSessions.set(chatId, {
      userId: user.id,
      telegramId,
      balance,
      step: "PAYMENT_METHOD",
    });

    // --------------------------------------------------------
    // PAYMENT METHOD MENU
    // --------------------------------------------------------

    await bot.sendMessage(
      chatId,
      `💸 ገንዘብ ያውጡ

💰 የሚገኝ ቀሪ ሂሳብ፡ ${balance} ብር

የማውጣት ዘዴዎን ይምረጡ 👇`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📱 ቴሌብር",
                callback_data: "withdraw_telebirr",
              },
            ],
            [
              {
                text: "🏦 CBE ብር",
                callback_data: "withdraw_cbe_birr",
              },
            ],
            [
              {
                text: "❌ ሰርዝ",
                callback_data: "withdraw_cancel",
              },
            ],
          ],
        },
      },
    );
  } catch (error) {
    console.error("❌ Start withdrawal error:", error);

    await bot.sendMessage(chatId, "❌ ገንዘብ የማውጣት ሂደቱን ሲጀምሩ ችግር አጋጥሟል።");
  }
};

// ============================================================
// /withdraw COMMAND
// ============================================================

export const registerWithdrawCommand = (bot) => {
  bot.onText(/^\/withdraw$/, async (msg) => {
    await startWithdrawal(bot, msg);
  });
};
