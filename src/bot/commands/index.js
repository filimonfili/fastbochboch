import { registerAdminCommand } from "./admin.js";
import { registerBalanceCommand } from "./balance.js";
import { registerDebugCommands } from "./debug.js";
import { registerDepositCommand } from "./deposit.js";
import { registerPlayNowCommand } from "./playnow.js";
import { registerStartCommand } from "./start.js";
import { registerSupportCommand } from "./support.js";
import { registerWithdrawCommand } from "./withdraw.js";

export const registerCommands = (bot) => {
  registerStartCommand(bot);
  registerPlayNowCommand(bot);
  registerBalanceCommand(bot);
  registerDepositCommand(bot);
  registerWithdrawCommand(bot);
  registerSupportCommand(bot);
  registerAdminCommand(bot);
  registerDebugCommands(bot);

  console.log("✅ All Telegram commands registered");
};
