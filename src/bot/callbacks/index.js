import { registerAdminCallbacks } from "./adminCallbacks.js";
import { registerDepositCallbacks } from "./depositCallbacks.js";

import { depositSessions, adminSessions } from "../sessions/sessions.js";

export const registerCallbacks = (bot) => {
  registerAdminCallbacks(bot, adminSessions);
  registerDepositCallbacks(bot, depositSessions);

  console.log("✅ All Telegram callbacks registered");
};
