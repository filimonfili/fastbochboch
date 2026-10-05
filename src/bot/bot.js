import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  throw new Error("❌ TELEGRAM_BOT_TOKEN is missing");
}

console.log("🤖 BOT PROCESS STARTING");
console.log("🤖 PID:", process.pid);
console.log("🤖 BOT TOKEN EXISTS:", !!token);

const bot = new TelegramBot(token, {
  polling: true,
});

bot.on("polling_error", (error) => {
  console.error("🚨 POLLING ERROR:", error.message);
});

bot.on("error", (error) => {
  console.error("🚨 BOT ERROR:", error.message);
});

console.log("🤖 TELEGRAM BOT CREATED");
console.log("🤖 PID:", process.pid);

export default bot;
