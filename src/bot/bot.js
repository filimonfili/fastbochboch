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
// CREATE BOT
// ============================================================

console.log("====================================");
console.log("🚀 STARTING FAST BOCH BOCH BOT");
console.log("====================================");

const bot = new TelegramBot(token, {
  polling: true,
});

console.log("✅ Telegram bot instance created");
console.log("🆔 Process ID:", process.pid);

// ============================================================
// BOT IDENTITY CHECK
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
// TELEGRAM POLLING EVENTS
// ============================================================

bot.on("polling_error", (error) => {
  console.error("====================================");
  console.error("🚨 TELEGRAM POLLING ERROR");
  console.error("====================================");
  console.error("Message:", error?.message);
  console.error("Code:", error?.code);
  console.error("Response:", error?.response?.body);
  console.error("Process ID:", process.pid);
});

bot.on("error", (error) => {
  console.error("====================================");
  console.error("🚨 TELEGRAM BOT ERROR");
  console.error("====================================");
  console.error(error?.message || error);
});

// ============================================================
// READY
// ============================================================

console.log("====================================");
console.log("🤖 FAST BOCH BOCH BOT IS RUNNING");
console.log("====================================");
console.log("Process ID:", process.pid);

// ============================================================
// EXPORT
// ============================================================

export default bot;
