import "dotenv/config";

import TelegramBot from "node-telegram-bot-api";

import { createPendingDeposit } from "../services/depositService.js";

import {
  getTelebirrSettings,
  updateTelebirrPhone,
  updateTelebirrAccountName,
} from "../services/paymentSettingsService.js";

console.log("🚨 TELEGRAM BOT INITIALIZED 🚨");

// ============================================================
// ENVIRONMENT
// ============================================================

const token = process.env.TELEGRAM_BOT_TOKEN;
const miniAppUrl = process.env.TELEGRAM_MINI_APP_URL;
const adminTelegramId = process.env.ADMIN_TELEGRAM_ID;

if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is missing");
}

if (!miniAppUrl) {
  throw new Error("TELEGRAM_MINI_APP_URL is missing");
}

if (!adminTelegramId) {
  throw new Error("ADMIN_TELEGRAM_ID is missing");
}

// ============================================================
// HELPERS
// ============================================================

const isValidTelebirrPhone = (phone) => {
  return /^09\d{8}$/.test(phone);
};

const isAdmin = (telegramId) => {
  if (!telegramId) {
    return false;
  }

  return String(telegramId).trim() === String(adminTelegramId).trim();
};

// ============================================================
// BOT
// ============================================================

const bot = new TelegramBot(token, {
  polling: true,
});

console.log("🤖 Telegram bot started");

// ============================================================
// TELEGRAM COMMANDS
// ============================================================

const telegramCommands = [
  {
    command: "start",
    description: "Start Fast Boch Boch",
  },
  {
    command: "playnow",
    description: "Play Boch Boch",
  },
  {
    command: "balance",
    description: "Check wallet balance",
  },
  {
    command: "deposit",
    description: "Deposit money",
  },
  {
    command: "withdraw",
    description: "Withdraw money",
  },
  {
    command: "support",
    description: "Get support",
  },
  {
    command: "admin",
    description: "Open admin panel",
  },
  {
    command: "myid",
    description: "Show Telegram ID",
  },
  {
    command: "checkadmin",
    description: "Check admin access",
  },
];

// ============================================================
// REGISTER TELEGRAM COMMANDS
// ============================================================

const registerTelegramCommands = async () => {
  try {
    console.log("🔄 Registering Telegram commands...");

    // Remove old command list
    await bot.deleteMyCommands();

    console.log("🗑️ Old Telegram commands deleted");

    // Register new commands
    await bot.setMyCommands(telegramCommands, {
      scope: {
        type: "all_private_chats",
      },
    });

    console.log("✅ New Telegram commands registered");

    // Read them back from Telegram
    const registeredCommands = await bot.getMyCommands({
      scope: {
        type: "all_private_chats",
      },
    });

    console.log(
      "📋 Telegram currently has these commands:",
      registeredCommands,
    );
  } catch (error) {
    console.error("❌ Telegram command registration failed:", error);
  }
};

registerTelegramCommands();

// ============================================================
// SESSIONS
// ============================================================

const depositSessions = new Map();
const adminSessions = new Map();

// ============================================================
// MAIN MENU KEYBOARD
// ============================================================

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

// ============================================================
// MAIN MENU
// ============================================================

const sendMainMenu = async (chatId) => {
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
// PAYMENT METHODS
// ============================================================

const sendPaymentMethods = async (chatId) => {
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

// ============================================================
// ADMIN MENU
// ============================================================

const sendAdminMenu = async (chatId) => {
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
// PLAY MESSAGE
// ============================================================

const sendPlayMessage = async (chatId) => {
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
// /CHECKADMIN
// ============================================================

bot.onText(/^\/checkadmin$/, async (msg) => {
  try {
    const telegramId = msg.from?.id;

    const configuredAdminId = String(adminTelegramId).trim();

    const matched = String(telegramId).trim() === configuredAdminId;

    console.log("================================");
    console.log("🔍 ADMIN DEBUG");
    console.log("Telegram ID:", telegramId);
    console.log("Configured Admin ID:", configuredAdminId);
    console.log("Is Admin:", matched);
    console.log("================================");

    await bot.sendMessage(
      msg.chat.id,
      `🔍 Admin Debug

Your Telegram ID:

${telegramId}

Configured Admin ID:

${configuredAdminId}

Is Admin:

${matched ? "YES ✅" : "NO ❌"}`,
    );
  } catch (error) {
    console.error("❌ /checkadmin error:", error);
  }
});

// ============================================================
// /MYID
// ============================================================

bot.onText(/^\/myid$/, async (msg) => {
  try {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id;

    await bot.sendMessage(
      chatId,
      `🆔 Your Telegram ID is:

${telegramId}`,
    );

    console.log("🆔 Telegram ID requested:", {
      telegramId,
      username: msg.from?.username,
    });
  } catch (error) {
    console.error("❌ /myid error:", error);
  }
});

// ============================================================
// /ADMIN
// ============================================================

bot.onText(/^\/admin$/, async (msg) => {
  try {
    const telegramId = msg.from?.id;
    const chatId = msg.chat.id;

    console.log("🔐 Admin login attempt:", {
      telegramId,
      configuredAdminId: adminTelegramId,
      matched: isAdmin(telegramId),
      username: msg.from?.username,
    });

    if (!telegramId || !isAdmin(telegramId)) {
      await bot.sendMessage(
        chatId,
        "❌ You are not authorized to access the admin panel.",
      );

      return;
    }

    adminSessions.delete(chatId);

    await sendAdminMenu(chatId);

    console.log("✅ Admin panel opened:", telegramId);
  } catch (error) {
    console.error("❌ /admin error:", error);
  }
});

// ============================================================
// ADMIN PAYMENT SETTINGS
// ============================================================

const sendAdminPaymentSettings = async (chatId) => {
  const settings = await getTelebirrSettings();

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
// /START
// ============================================================

bot.onText(/^\/start$/, async (msg) => {
  try {
    const chatId = msg.chat.id;

    depositSessions.delete(chatId);
    adminSessions.delete(chatId);

    await sendMainMenu(chatId);

    console.log("▶️ /start:", {
      chatId,
      telegramId: msg.from?.id,
      username: msg.from?.username,
      isAdmin: isAdmin(msg.from?.id),
    });
  } catch (error) {
    console.error("❌ /start error:", error);
  }
});

// ============================================================
// /PLAYNOW
// ============================================================

bot.onText(/^\/playnow$/, async (msg) => {
  try {
    const chatId = msg.chat.id;

    await sendPlayMessage(chatId);

    console.log("🎮 /playnow:", chatId);
  } catch (error) {
    console.error("❌ /playnow error:", error);
  }
});

// ============================================================
// /BALANCE
// ============================================================

bot.onText(/^\/balance$/, async (msg) => {
  try {
    const chatId = msg.chat.id;

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

    console.log("💰 /balance:", chatId);
  } catch (error) {
    console.error("❌ /balance error:", error);
  }
});

// ============================================================
// /DEPOSIT
// ============================================================

bot.onText(/^\/deposit$/, async (msg) => {
  try {
    const chatId = msg.chat.id;

    await sendPaymentMethods(chatId);

    console.log("💰 /deposit:", chatId);
  } catch (error) {
    console.error("❌ /deposit error:", error);
  }
});

// ============================================================
// /WITHDRAW
// ============================================================

bot.onText(/^\/withdraw$/, async (msg) => {
  try {
    const chatId = msg.chat.id;

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

    console.log("💸 /withdraw:", chatId);
  } catch (error) {
    console.error("❌ /withdraw error:", error);
  }
});

// ============================================================
// /SUPPORT
// ============================================================

bot.onText(/^\/support$/, async (msg) => {
  try {
    const chatId = msg.chat.id;

    await bot.sendMessage(
      chatId,
      `🆘 Support

If you have a problem with your account, deposit, withdrawal, or game, please contact support.`,
    );

    console.log("🆘 /support:", chatId);
  } catch (error) {
    console.error("❌ /support error:", error);
  }
});

// ============================================================
// TEXT MESSAGE HANDLER
// ============================================================

bot.on("message", async (msg) => {
  try {
    if (!msg.text) {
      return;
    }

    const chatId = msg.chat.id;
    const text = msg.text.trim();
    const telegramId = msg.from?.id;

    // ========================================================
    // ADMIN SESSION
    // ========================================================

    if (telegramId && isAdmin(telegramId)) {
      const adminSession = adminSessions.get(chatId);

      if (adminSession) {
        // ----------------------------------------------------
        // CANCEL
        // ----------------------------------------------------

        if (text === "/cancel") {
          adminSessions.delete(chatId);

          await bot.sendMessage(chatId, "❌ Admin action cancelled.");

          await sendAdminMenu(chatId);

          return;
        }

        // ----------------------------------------------------
        // CHANGE TELEBIRR PHONE
        // ----------------------------------------------------

        if (adminSession.action === "CHANGE_TELEBIRR_PHONE") {
          if (!isValidTelebirrPhone(text)) {
            await bot.sendMessage(
              chatId,
              `❌ Invalid Telebirr number.

Please send a valid number like:

0912345678`,
            );

            return;
          }

          const settings = await updateTelebirrPhone(text);

          adminSessions.delete(chatId);

          await bot.sendMessage(
            chatId,
            `✅ Telebirr number updated successfully.

📱 New Number:
${settings.phone_number}

👤 Account Name:
${settings.account_name}`,
          );

          console.log("⚙️ Telebirr phone updated:", {
            adminTelegramId: telegramId,
            phoneNumber: settings.phone_number,
          });

          await sendAdminMenu(chatId);

          return;
        }

        // ----------------------------------------------------
        // CHANGE TELEBIRR ACCOUNT NAME
        // ----------------------------------------------------

        if (adminSession.action === "CHANGE_TELEBIRR_NAME") {
          if (text.length < 2 || text.length > 100) {
            await bot.sendMessage(
              chatId,
              `❌ Invalid account name.

Please send a valid account name.`,
            );

            return;
          }

          const settings = await updateTelebirrAccountName(text);

          adminSessions.delete(chatId);

          await bot.sendMessage(
            chatId,
            `✅ Telebirr account name updated successfully.

📱 Number:
${settings.phone_number}

👤 New Account Name:
${settings.account_name}`,
          );

          console.log("⚙️ Telebirr account name updated:", {
            adminTelegramId: telegramId,
            accountName: settings.account_name,
          });

          await sendAdminMenu(chatId);

          return;
        }
      }
    }

    // ========================================================
    // PLAYER MENU
    // ========================================================

    if (text === "🎮 Play Boch Boch") {
      await sendPlayMessage(chatId);
      return;
    }

    if (text === "💰 Balance") {
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

      return;
    }

    if (text === "➕ Deposit") {
      await sendPaymentMethods(chatId);
      return;
    }

    if (text === "💸 Withdraw") {
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

      return;
    }

    if (text === "🆘 Support") {
      await bot.sendMessage(
        chatId,
        `🆘 Support

If you have a problem with your account, deposit, withdrawal, or game, please contact support.`,
      );

      return;
    }

    // ========================================================
    // IGNORE COMMANDS
    // ========================================================

    if (text.startsWith("/")) {
      return;
    }

    // ========================================================
    // DEPOSIT SESSION
    // ========================================================

    const session = depositSessions.get(chatId);

    if (!session) {
      return;
    }

    if (session.paymentMethod !== "TELEBIRR") {
      return;
    }

    console.log("📥 Player Telebirr message received:", {
      chatId,
      telegramId,
      text,
    });

    if (!telegramId) {
      throw new Error("Telegram user ID is missing");
    }

    // ========================================================
    // CREATE / RECONCILE DEPOSIT
    // ========================================================

    const result = await createPendingDeposit({
      telegramId,
      paymentMethod: "TELEBIRR",
      playerMessage: text,
    });

    console.log("💰 Deposit processing result:", result);

    const deposit = result.deposit;
    const verification = result.verification;

    // ========================================================
    // DEPOSIT APPROVED
    // ========================================================

    if (
      verification?.success === true &&
      verification?.reason === "DEPOSIT_APPROVED"
    ) {
      depositSessions.delete(chatId);

      await bot.sendMessage(
        chatId,
        `✅ Deposit Accepted!

💰 Amount: ${verification.amount} ETB

💳 New Balance: ${verification.new_balance} ETB

Your wallet has been credited successfully.`,
      );

      console.log("💰 Deposit approved immediately:", {
        depositId: verification.deposit_id,
        amount: verification.amount,
        userId: verification.user_id,
      });

      return;
    }

    // ========================================================
    // WAITING FOR MERCHANT
    // ========================================================

    if (
      verification?.success === true &&
      verification?.reason === "WAITING_FOR_MERCHANT"
    ) {
      depositSessions.delete(chatId);

      await bot.sendMessage(
        chatId,
        `✅ Payment information received.

💳 FT Reference: ${deposit.ft_reference}

⏳ Status: Waiting for payment verification.

Your wallet will be credited automatically when the merchant payment confirmation is received.

You do not need to send the SMS again.`,
      );

      console.log("⏳ Waiting for merchant SMS:", {
        depositId: deposit.id,
        ftReference: deposit.ft_reference,
      });

      return;
    }

    // ========================================================
    // ALREADY APPROVED
    // ========================================================

    if (verification?.reason === "ALREADY_APPROVED") {
      depositSessions.delete(chatId);

      await bot.sendMessage(
        chatId,
        `✅ This deposit has already been processed.

Please check your wallet balance.`,
      );

      return;
    }

    // ========================================================
    // OTHER SUCCESSFUL WAITING STATE
    // ========================================================

    if (verification?.success === true) {
      depositSessions.delete(chatId);

      await bot.sendMessage(
        chatId,
        `✅ Payment information received.

⏳ Your payment is being verified.

Your wallet will be credited automatically once the merchant confirmation is matched.`,
      );

      return;
    }

    // ========================================================
    // UNEXPECTED RESULT
    // ========================================================

    console.warn("⚠️ Unexpected deposit verification result:", {
      deposit,
      verification,
    });

    await bot.sendMessage(
      chatId,
      `⏳ Your payment information was received.

The payment is still being verified. Please wait for confirmation.`,
    );

    depositSessions.delete(chatId);
  } catch (error) {
    console.error("❌ Failed to process message:", error);

    try {
      await bot.sendMessage(
        msg.chat.id,
        `❌ We couldn't process your payment information.

Please check the SMS or FT reference and try again.`,
      );
    } catch (sendError) {
      console.error("❌ Failed to send error message:", sendError);
    }
  }
});

// ============================================================
// CALLBACK QUERIES
// ============================================================

bot.on("callback_query", async (query) => {
  try {
    if (!query.message) {
      return;
    }

    const chatId = query.message.chat.id;

    const action = query.data;

    const telegramId = query.from?.id;

    // ======================================================
    // ADMIN AUTHENTICATION
    // ======================================================

    const adminActions = [
      "admin_payment_settings",
      "admin_change_phone",
      "admin_change_name",
      "admin_revenue",
      "admin_withdrawals",
      "admin_back",
    ];

    if (adminActions.includes(action)) {
      if (!telegramId || !isAdmin(telegramId)) {
        await bot.answerCallbackQuery(query.id, {
          text: "❌ Unauthorized",
          show_alert: true,
        });

        console.log("🚫 Unauthorized admin callback:", {
          telegramId,
          action,
          configuredAdminId: adminTelegramId,
        });

        return;
      }
    }

    await bot.answerCallbackQuery(query.id);

    // ======================================================
    // ADMIN PAYMENT SETTINGS
    // ======================================================

    if (action === "admin_payment_settings") {
      await sendAdminPaymentSettings(chatId);

      return;
    }

    // ======================================================
    // ADMIN CHANGE PHONE
    // ======================================================

    if (action === "admin_change_phone") {
      adminSessions.set(chatId, {
        action: "CHANGE_TELEBIRR_PHONE",
      });

      await bot.sendMessage(
        chatId,
        `📱 Change Telebirr Number

Send the new Telebirr number.

Example:

0912345678

Send /cancel to cancel.`,
      );

      return;
    }

    // ======================================================
    // ADMIN CHANGE NAME
    // ======================================================

    if (action === "admin_change_name") {
      adminSessions.set(chatId, {
        action: "CHANGE_TELEBIRR_NAME",
      });

      await bot.sendMessage(
        chatId,
        `👤 Change Telebirr Account Name

Send the new account name.

Send /cancel to cancel.`,
      );

      return;
    }

    // ======================================================
    // ADMIN BACK
    // ======================================================

    if (action === "admin_back") {
      adminSessions.delete(chatId);

      await sendAdminMenu(chatId);

      return;
    }

    // ======================================================
    // ADMIN REVENUE
    // ======================================================

    if (action === "admin_revenue") {
      await bot.sendMessage(
        chatId,
        `📊 Revenue

Revenue dashboard will be added next.`,
      );

      return;
    }

    // ======================================================
    // ADMIN WITHDRAWALS
    // ======================================================

    if (action === "admin_withdrawals") {
      await bot.sendMessage(
        chatId,
        `💸 Withdrawals

Withdrawal management will be added next.`,
      );

      return;
    }

    // ======================================================
    // DEPOSIT MENU
    // ======================================================

    if (action === "deposit_menu") {
      await sendPaymentMethods(chatId);

      return;
    }

    // ======================================================
    // TELEBIRR
    // ======================================================

    if (action === "deposit_telebirr") {
      depositSessions.set(chatId, {
        paymentMethod: "TELEBIRR",
      });

      const settings = await getTelebirrSettings();

      await bot.sendMessage(
        chatId,
        `📱 Telebirr Deposit

Send your payment to:

📞 ${settings.phone_number}

👤 ${settings.account_name}

━━━━━━━━━━━━━━━

📋 Deposit Steps

1️⃣ Send your payment to the account above.

2️⃣ After payment, Telebirr will send you an SMS.

3️⃣ Copy and send the SMS here.

You can also send only the FT reference number.

⚡ Send the SMS once after making your payment.

Your wallet will be credited automatically after verification.

━━━━━━━━━━━━━━━

🆘 Need help?

Contact @fastbochboch`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "⬅️ Back",
                  callback_data: "deposit_back",
                },
              ],
            ],
          },
        },
      );

      return;
    }

    // ======================================================
    // CBE BIRR
    // ======================================================

    if (action === "deposit_cbe_birr") {
      depositSessions.delete(chatId);

      await bot.sendMessage(
        chatId,
        `🏦 CBE Birr Deposit

CBE Birr deposit instructions will be added next.`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "⬅️ Back",
                  callback_data: "deposit_back",
                },
              ],
            ],
          },
        },
      );

      return;
    }

    // ======================================================
    // DEPOSIT BACK
    // ======================================================

    if (action === "deposit_back") {
      depositSessions.delete(chatId);

      await sendPaymentMethods(chatId);

      return;
    }
  } catch (error) {
    console.error("❌ Callback error:", error);
  }
});

// ============================================================
// POLLING ERROR
// ============================================================

bot.on("polling_error", (error) => {
  console.error("🤖 Telegram polling error:", error.message);
});

// ============================================================
// EXPORT
// ============================================================

export default bot;
