import { registerAdminCallbacks } from "./adminCallbacks.js";
import { registerDepositCallbacks } from "./depositCallbacks.js";
import { registerWithdrawalCallbacks } from "./withdrawalCallbacks.js";

import {
  depositSessions,
  withdrawalSessions,
  adminSessions,
} from "../sessions/sessions.js";

export const registerCallbacks = (bot) => {
  registerAdminCallbacks(bot, adminSessions);

  registerDepositCallbacks(bot, depositSessions);

  registerWithdrawalCallbacks(bot);

  console.log("✅ All Telegram callbacks registered");
};
