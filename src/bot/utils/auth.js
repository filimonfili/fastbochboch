// bot/utils/auth.js

const adminTelegramId = process.env.ADMIN_TELEGRAM_ID;

export const isAdmin = (telegramId) => {
  if (!telegramId || !adminTelegramId) {
    return false;
  }

  return String(telegramId).trim() === String(adminTelegramId).trim();
};
