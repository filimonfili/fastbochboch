import "dotenv/config";

import TelegramBot from "node-telegram-bot-api";

import { registerCommands } from "./commands/index.js";
import { registerCallbacks } from "./callbacks/index.js";
import { registerMessageHandler } from "./messageHandler.js";

// ============================================================
// TELEGRAM BOT CONFIG
// ============================================================

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  throw new Error("❌ TELEGRAM_BOT_TOKEN is missing");
}

// ============================================================
// CREATE TELEGRAM BOT
// ============================================================
// IMPORTANT:
// polling MUST be false because we are using a webhook.
// ============================================================

console.log("====================================");
console.log("🚀 STARTING FAST BOCH BOCH BOT");
console.log("====================================");

const bot = new TelegramBot(token, {
  polling: false,
});

console.log("✅ Telegram bot instance created");
console.log("🆔 Process ID:", process.pid);

// ============================================================
// BOT IDENTITY
// ============================================================

try {
  const me = await bot.getMe();

  console.log("====================================");
  console.log("🤖 TELEGRAM BOT CONNECTED");
  console.log("====================================");

  console.log("Bot ID:", me.id);
  console.log("Bot username:", me.username);
  console.log("Bot name:", me.first_name);
  console.log("Process ID:", process.pid);
} catch (error) {
  console.error("❌ Failed to connect to Telegram:");
  console.error(error?.message || error);
}

// ============================================================
// REGISTER COMMANDS
// ============================================================

try {
  await registerCommands(bot);

  console.log("✅ Telegram commands registered");
} catch (error) {
  console.error("❌ Failed to register Telegram commands:");
  console.error(error?.message || error);
}

// ============================================================
// REGISTER CALLBACKS
// ============================================================

try {
  registerCallbacks(bot);

  console.log("✅ Telegram callbacks registered");
} catch (error) {
  console.error("❌ Failed to register Telegram callbacks:");
  console.error(error?.message || error);
}

// ============================================================
// REGISTER MESSAGE HANDLER
// ============================================================

try {
  registerMessageHandler(bot);

  console.log("✅ Telegram message handler registered");
} catch (error) {
  console.error("❌ Failed to register Telegram message handler:");
  console.error(error?.message || error);
}

// ============================================================
// READY
// ============================================================

console.log("====================================");
console.log("🤖 FAST BOCH BOCH BOT IS READY");
console.log("====================================");

export default bot;
