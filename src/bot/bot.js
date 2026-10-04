import "dotenv/config";

import TelegramBot from "node-telegram-bot-api";

import { registerCommands } from "./commands/index.js";
import { registerCallbacks } from "./callbacks/index.js";
import { registerMessageHandler } from "./messageHandler.js";

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  throw new Error("❌ TELEGRAM_BOT_TOKEN is missing");
}

const bot = new TelegramBot(token, {
  polling: true,
});

console.log("====================================");
console.log("🚨 FAST BOCH BOCH BOT INITIALIZED 🚨");
console.log("====================================");

// =========================================================
// REGISTER COMMANDS
// =========================================================

try {
  registerCommands(bot);
  console.log("✅ Telegram commands registered");
} catch (error) {
  console.error("❌ Failed to register commands:", error);
}

// =========================================================
// REGISTER CALLBACKS
// =========================================================

try {
  registerCallbacks(bot);
  console.log("✅ Telegram callbacks registered");
} catch (error) {
  console.error("❌ Failed to register callbacks:", error);
}

// =========================================================
// REGISTER MESSAGE HANDLER
// =========================================================

try {
  registerMessageHandler(bot);
  console.log("✅ Telegram message handler registered");
} catch (error) {
  console.error("❌ Failed to register message handler:", error);
}

// =========================================================
// POLLING ERROR
// =========================================================

bot.on("polling_error", (error) => {
  console.error("🤖 Telegram polling error:", error.message);
});

// =========================================================
// BOT ERROR
// =========================================================

bot.on("error", (error) => {
  console.error("🤖 Telegram bot error:", error);
});

console.log("====================================");
console.log("🤖 Fast Boch Boch bot is running");
console.log("====================================");

export default bot;
