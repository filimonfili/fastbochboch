import { registerAdminCommand } from "./admin.js";
import { registerBalanceCommand } from "./balance.js";
import { registerDebugCommands } from "./debug.js";
import { registerDepositCommand } from "./deposit.js";
import { registerPlayNowCommand } from "./playnow.js";
import { registerStartCommand } from "./start.js";
import { registerSupportCommand } from "./support.js";
import { registerWithdrawCommand } from "./withdraw.js";

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

export const registerCommands = async (bot) => {
  // =========================================================
  // REGISTER COMMAND HANDLERS
  // =========================================================

  registerStartCommand(bot);
  registerPlayNowCommand(bot);
  registerBalanceCommand(bot);
  registerDepositCommand(bot);
  registerWithdrawCommand(bot);
  registerSupportCommand(bot);
  registerAdminCommand(bot);
  registerDebugCommands(bot);

  console.log("✅ All Telegram command handlers registered");

  // =========================================================
  // REGISTER COMMAND MENU WITH TELEGRAM
  // =========================================================

  try {
    console.log("🔄 Registering Telegram command menu...");

    await bot.setMyCommands(telegramCommands, {
      scope: {
        type: "all_private_chats",
      },
    });

    console.log("✅ Telegram command menu registered");

    const commands = await bot.getMyCommands({
      scope: {
        type: "all_private_chats",
      },
    });

    console.log("📋 Telegram commands:", commands);
  } catch (error) {
    console.error("❌ Failed to register Telegram commands:", error);
  }
};
