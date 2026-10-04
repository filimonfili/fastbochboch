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

await registerCommands(bot);
registerCallbacks(bot);
registerMessageHandler(bot);

console.log("✅ Telegram commands registered");
console.log("✅ Telegram callbacks registered");
console.log("✅ Telegram message handler registered");

bot.on("polling_error", (error) => {
  console.error("🤖 Telegram polling error:", error.message);
});

bot.on("error", (error) => {
  console.error("🤖 Telegram bot error:", error);
});

console.log("====================================");
console.log("🤖 Fast Boch Boch bot is running");
console.log("====================================");

export default bot;
