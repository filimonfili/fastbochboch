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

console.log("🚨 TELEGRAM BOT INITIALIZED 🚨");
console.log("🤖 Fast Boch Boch Telegram bot started");

// Register all bot handlers
registerCommands(bot);
registerCallbacks(bot);
registerMessageHandler(bot);

console.log("✅ Telegram commands registered");
console.log("✅ Telegram callbacks registered");
console.log("✅ Telegram message handler registered");

// Telegram polling errors
bot.on("polling_error", (error) => {
  console.error("🤖 Telegram polling error:", error.message);
});

export default bot;
