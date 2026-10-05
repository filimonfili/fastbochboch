import { registerAdminCallbacks } from "./adminCallbacks.js";
import { registerAnnouncementCallbacks } from "./announcementCallbacks.js";

import { registerDepositCallbacks } from "./depositCallbacks.js";
import { registerWithdrawalCallbacks } from "./withdrawalCallbacks.js";

import { depositSessions, withdrawalSessions } from "../sessions/sessions.js";

export const registerCallbacks = (bot) => {
  registerAdminCallbacks(bot);
  registerAnnouncementCallbacks(bot);

  registerDepositCallbacks(bot, depositSessions);
  registerWithdrawalCallbacks(bot);

  console.log("✅ All Telegram callbacks registered");
};
