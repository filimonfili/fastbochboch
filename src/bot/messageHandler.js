import { isAdmin } from "./utils/auth.js";

import {
  depositSessions,
  withdrawalSessions,
  adminSessions,
} from "./sessions/sessions.js";

import {
  updateTelebirrPhone,
  updateTelebirrAccountName,
} from "../services/paymentSettingsService.js";

import { createPendingDeposit } from "../services/depositService.js";

import { rejectWithdrawal } from "../services/adminWithdrawalService.js";

import { sendMainMenu, sendBalanceMessage } from "./menus/mainMenu.js";

import { sendPaymentMethods } from "./menus/depositMenu.js";

import { sendAdminMenu } from "./menus/adminMenu.js";

import { startWithdrawal } from "./commands/withdraw.js";

import supabase from "../config/supabase.js";

export const registerMessageHandler = (bot) => {
  bot.on("message", async (msg) => {
    try {
      console.log("📩 TELEGRAM MESSAGE RECEIVED:", {
        chatId: msg.chat?.id,
        telegramId: msg.from?.id,
        text: msg.text || null,
        hasPhoto: Boolean(msg.photo),
        photoCount: msg.photo?.length || 0,
      });

      const chatId = msg.chat.id;
      const telegramId = msg.from?.id;
      const text = msg.text?.trim() || "";

      // =========================================================
      // ADMIN SESSION
      // =========================================================

      if (telegramId && isAdmin(telegramId)) {
        const adminSession = adminSessions.get(chatId);

        console.log("🔎 ADMIN SESSION:", {
          chatId,
          telegramId,
          isAdmin: isAdmin(telegramId),
          adminSession,
          hasPhoto: Boolean(msg.photo),
        });

        if (adminSession) {
          // -----------------------------------------------------
          // CANCEL ADMIN ACTION
          // -----------------------------------------------------

          if (text === "/cancel") {
            adminSessions.delete(chatId);

            await bot.sendMessage(chatId, "❌ Admin action cancelled.");

            await sendAdminMenu(bot, chatId);

            return;
          }

          // =====================================================
          // ANNOUNCEMENT — WAITING FOR BANNER
          // =====================================================

          if (adminSession.action === "WAITING_FOR_ANNOUNCEMENT_BANNER") {
            console.log("📢 ANNOUNCEMENT BANNER RECEIVED", {
              chatId,
              telegramId,
              hasPhoto: Boolean(msg.photo),
              photoCount: msg.photo?.length || 0,
            });

            if (!msg.photo || msg.photo.length === 0) {
              await bot.sendMessage(
                chatId,
                `❌ Please send an image for the announcement banner.

Send the banner as a photo.

Send /cancel to cancel.`,
              );

              return;
            }

            const largestPhoto = msg.photo[msg.photo.length - 1];
            const bannerFileId = largestPhoto.file_id;

            adminSessions.set(chatId, {
              action: "WAITING_FOR_ANNOUNCEMENT_TEXT",
              bannerFileId,
            });

            await bot.sendMessage(
              chatId,
              `🖼️ Banner received successfully.

Now send the announcement text.

You can use text and emojis.

Maximum: 1000 characters.

Send /cancel to cancel.`,
            );

            return;
          }

          // =====================================================
          // ANNOUNCEMENT — WAITING FOR TEXT
          // =====================================================

          if (adminSession.action === "WAITING_FOR_ANNOUNCEMENT_TEXT") {
            console.log("📢 ANNOUNCEMENT TEXT RECEIVED", {
              chatId,
              telegramId,
              textLength: text.length,
            });

            if (!text) {
              await bot.sendMessage(
                chatId,
                `❌ Announcement text cannot be empty.

Please send the announcement text.

Send /cancel to cancel.`,
              );

              return;
            }

            if (text.length > 1000) {
              await bot.sendMessage(
                chatId,
                `❌ Announcement text is too long.

Please keep it under 1000 characters.`,
              );

              return;
            }

            if (!adminSession.bannerFileId) {
              adminSessions.delete(chatId);

              await bot.sendMessage(
                chatId,
                `❌ Announcement banner is missing.

Please create the announcement again.`,
              );

              return;
            }

            const announcement = text;

            adminSessions.set(chatId, {
              action: "CONFIRM_ANNOUNCEMENT",
              bannerFileId: adminSession.bannerFileId,
              announcement,
            });

            console.log("📢 ANNOUNCEMENT PREVIEW READY", {
              chatId,
              bannerFileId: adminSession.bannerFileId,
              textLength: announcement.length,
            });

            await bot.sendPhoto(chatId, adminSession.bannerFileId, {
              caption: `📢 Fast Boch Boch Announcement\n\n${announcement}`,
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "✅ Send to All Players",
                      callback_data: "admin_send_announcement",
                    },
                  ],
                  [
                    {
                      text: "❌ Cancel",
                      callback_data: "admin_cancel_announcement",
                    },
                  ],
                ],
              },
            });

            return;
          }

          // -----------------------------------------------------
          // CHANGE TELEBIRR PHONE
          // -----------------------------------------------------

          if (adminSession.action === "CHANGE_TELEBIRR_PHONE") {
            if (!/^09\d{8}$/.test(text)) {
              await bot.sendMessage(
                chatId,
                `❌ Invalid Telebirr number.

Please send a valid number like:

0912345678`,
              );

              return;
            }

            const settings = await updateTelebirrPhone(text);

            adminSessions.delete(chatId);

            await bot.sendMessage(
              chatId,
              `✅ Telebirr number updated successfully.

📱 New Number:

${settings.phone_number}

👤 Account Name:

${settings.account_name}`,
            );

            console.log("⚙️ Telebirr phone updated:", {
              adminTelegramId: telegramId,
              phoneNumber: settings.phone_number,
            });

            await sendAdminMenu(bot, chatId);

            return;
          }

          // -----------------------------------------------------
          // CHANGE TELEBIRR ACCOUNT NAME
          // -----------------------------------------------------

          if (adminSession.action === "CHANGE_TELEBIRR_NAME") {
            if (text.length < 2 || text.length > 100) {
              await bot.sendMessage(
                chatId,
                `❌ Invalid account name.

Please send a valid account name.`,
              );

              return;
            }

            const settings = await updateTelebirrAccountName(text);

            adminSessions.delete(chatId);

            await bot.sendMessage(
              chatId,
              `✅ Telebirr account name updated successfully.

📱 Number:

${settings.phone_number}

👤 New Account Name:

${settings.account_name}`,
            );

            console.log("⚙️ Telebirr account name updated:", {
              adminTelegramId: telegramId,
              accountName: settings.account_name,
            });

            await sendAdminMenu(bot, chatId);

            return;
          }

          // -----------------------------------------------------
          // REJECT WITHDRAWAL
          // -----------------------------------------------------

          if (adminSession.action === "REJECT_WITHDRAWAL") {
            const reason = text.trim();

            if (reason.length < 2 || reason.length > 300) {
              await bot.sendMessage(
                chatId,
                `❌ Invalid rejection reason.

Please enter a reason between 2 and 300 characters.

Example:

Invalid receiving number`,
              );

              return;
            }

            const withdrawalId = adminSession.withdrawalId;

            if (!withdrawalId) {
              adminSessions.delete(chatId);

              await bot.sendMessage(
                chatId,
                `❌ Withdrawal session is invalid.

Please open the withdrawal request again.`,
              );

              return;
            }

            try {
              console.log("❌ Rejecting withdrawal:", {
                adminTelegramId: telegramId,
                withdrawalId,
                reason,
              });

              const result = await rejectWithdrawal(withdrawalId, reason);

              adminSessions.delete(chatId);

              await bot.sendMessage(
                chatId,
                `❌ Withdrawal Rejected

💰 Amount:
${Number(result.amount).toLocaleString()} ETB

💸 Refund:
${Number(result.refund_amount).toLocaleString()} ETB

📝 Reason:
${reason}

The player's money has been refunded automatically.`,
              );

              const { data: user, error: userError } = await supabase
                .from("users")
                .select("telegram_id")
                .eq("id", result.user_id)
                .single();

              if (userError) {
                console.error(
                  "❌ Failed to find withdrawal player:",
                  userError,
                );
              }

              if (user?.telegram_id) {
                try {
                  await bot.sendMessage(
                    user.telegram_id,
                    `❌ Withdrawal Rejected

💰 Requested Amount:
${Number(result.amount).toLocaleString()} ETB

📝 Reason:
${reason}

💰 Refund:
${Number(result.refund_amount).toLocaleString()} ETB

The withdrawal amount has been returned to your wallet.

You can submit another withdrawal request if needed.`,
                  );

                  console.log("📨 Player notified about rejected withdrawal:", {
                    telegramId: user.telegram_id,
                    withdrawalId,
                  });
                } catch (notificationError) {
                  console.error(
                    "❌ Failed to notify player about rejected withdrawal:",
                    notificationError,
                  );
                }
              }

              console.log("✅ Withdrawal rejected and refunded:", result);

              await sendAdminMenu(bot, chatId);

              return;
            } catch (error) {
              console.error("❌ Reject withdrawal error:", error);

              const message = error?.message || "";

              if (message.includes("WITHDRAWAL_ALREADY_PROCESSED")) {
                adminSessions.delete(chatId);

                await bot.sendMessage(
                  chatId,
                  `⚠️ This withdrawal has already been processed.

It cannot be rejected again.`,
                );

                return;
              }

              if (message.includes("WITHDRAWAL_NOT_FOUND")) {
                adminSessions.delete(chatId);

                await bot.sendMessage(
                  chatId,
                  `❌ Withdrawal not found.

The request may have already been removed or processed.`,
                );

                return;
              }

              await bot.sendMessage(
                chatId,
                `❌ Failed to reject withdrawal.

The player's balance was not changed.

Please try again.`,
              );

              return;
            }
          }
        }
      }

      // =========================================================
      // PLAYER MENU BUTTONS
      // =========================================================

      // PLAY
      if (text === "🎮 ቦጭ ቦጭን ይጫወቱ" || text === "🎮 ለመጫወት") {
        await sendMainMenu(bot, chatId);
        return;
      }

      // BALANCE
      if (text === "💰 ቀሪ ሂሳብ" || text === "💰 Balance") {
        await sendBalanceMessage(bot, chatId);
        return;
      }

      // DEPOSIT
      if (text === "➕ ገንዘብ ማስገባት" || text === "➕ ተቀማጭ ገንዘብ") {
        console.log("✅ DEPOSIT HANDLER MATCHED");

        try {
          console.log("➡️ Calling sendPaymentMethods");
          await sendPaymentMethods(bot, chatId);
          console.log("✅ sendPaymentMethods completed");
        } catch (error) {
          console.error("❌ DEPOSIT HANDLER ERROR:", error);
          await bot.sendMessage(
            chatId,
            "Deposit error. Please contact support.",
          );
        }

        return;
      }

      // WITHDRAW
      if (text === "💸 ገንዘብ ማውጣት" || text === "💸 ማውጣት") {
        console.log("✅ WITHDRAW HANDLER MATCHED");

        try {
          console.log("➡️ Calling startWithdrawal");
          await startWithdrawal(bot, msg);
          console.log("✅ startWithdrawal completed");
        } catch (error) {
          console.error("❌ WITHDRAW HANDLER ERROR:", error);
          await bot.sendMessage(
            chatId,
            "Withdrawal error. Please contact support.",
          );
        }

        return;
      }

      // SUPPORT
      if (text === "🆘 ድጋፍ" || text === "🆘 አገልግሎት") {
        await bot.sendMessage(
          chatId,
          `🆘 ድጋፍ

በመለያዎ፣ በተቀማጭ ገንዘብ፣ ገንዘብ በማውጣት ወይም በጨዋታ ላይ ችግር ካጋጠመዎት፣ እባክዎ በ @enon28 ያግኙን።`,
        );
        return;
      }

      // =========================================================
      // WITHDRAWAL SESSION
      // =========================================================

      const withdrawalSession = withdrawalSessions.get(chatId);

      if (withdrawalSession) {
        if (text === "/cancel") {
          withdrawalSessions.delete(chatId);

          await bot.sendMessage(chatId, "❌ የገንዘብ ማውጣት ሂደቱ ተሰርዟል።");

          return;
        }

        // =======================================================
        // ENTER WITHDRAWAL AMOUNT
        // =======================================================

        if (withdrawalSession.step === "AMOUNT") {
          const amount = Number(text);

          if (!Number.isInteger(amount) || amount <= 0) {
            await bot.sendMessage(
              chatId,
              `❌ ልክ ያልሆነ መጠን።

እባክዎ ትክክለኛ ሙሉ ቁጥር ያስገቡ።

ለምሳሌ፡
100`,
            );

            return;
          }

          const MIN_WITHDRAWAL = 5;

          if (amount < MIN_WITHDRAWAL) {
            await bot.sendMessage(
              chatId,
              `❌ ዝቅተኛው የማውጣት መጠን ${MIN_WITHDRAWAL} ETB ነው።

እባክዎ ${MIN_WITHDRAWAL} ብር ወይም ከዚያ በላይ የሆነ መጠን ያስገቡ።.`,
            );

            return;
          }

          const currentBalance = withdrawalSession.balance;

          if (amount > currentBalance) {
            await bot.sendMessage(
              chatId,
              `❌ በቂ ቀሪ ሂሳብ የለም

የእርስዎ ቀሪ ሂሳብ፡
${currentBalance} ብር

የተጠየቀው፡
${amount} ብር

እባክዎ እስከ ${currentBalance} ብር የሚደርስ መጠን ያስገቡ።`,
            );

            return;
          }

          withdrawalSessions.set(chatId, {
            ...withdrawalSession,
            amount,
            step: "ACCOUNT_NUMBER",
          });

          const paymentName =
            withdrawalSession.paymentMethod === "TELEBIRR" ? "ቴሌብር" : "CBE ብር";

          await bot.sendMessage(
            chatId,
            `📱 ${paymentName} ገንዘብ ማውጣት

💰 መጠኑ፦
${amount} ብር

አሁን ገንዘቡን መቀበል የሚፈልጉበትን የ ${paymentName} ስልክ ቁጥር ያስገቡ።

ምሳሌ፦

0912345678

ለመሰረዝ cancel ብለው ይላኩ።`,
          );

          return;
        }

        // =======================================================
        // ENTER ACCOUNT NUMBER
        // =======================================================

        if (withdrawalSession.step === "ACCOUNT_NUMBER") {
          const accountNumber = text.replace(/\s+/g, "");

          if (!/^09\d{8}$/.test(accountNumber)) {
            await bot.sendMessage(
              chatId,
              `❌ ልክ ያልሆነ የስልክ ቁጥር።

እባክዎ ትክክለኛ የሞባይል ስልክ ቁጥር ያስገቡ።

ምሳሌ፦

0912345678`,
            );

            return;
          }

          withdrawalSessions.set(chatId, {
            ...withdrawalSession,
            accountNumber,
            step: "አረጋግጥ",
          });

          const paymentName =
            withdrawalSession.paymentMethod === "TELEBIRR" ? "ቴሌብር" : "CBE ብር";

          await bot.sendMessage(
            chatId,
            `🔎 የገንዘብ ማውጣትን ያረጋግጡ

💰 መጠኑ፡
${withdrawalSession.amount} ብር

📱 ዘዴው፡
${paymentName}

📞 ቁጥሩ፡
${accountNumber}

እባክዎ መረጃውን በጥንቃቄ ያረጋግጡ።

መቀጠል ይፈልጋሉ?`,
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "✅ ማውጣትን ያረጋግጡ",
                      callback_data: "withdraw_confirm",
                    },
                  ],
                  [
                    {
                      text: "❌ ሰርዝ",
                      callback_data: "withdraw_cancel",
                    },
                  ],
                ],
              },
            },
          );

          return;
        }

        return;
      }

      // =========================================================
      // DEPOSIT SESSION
      // =========================================================

      const depositSession = depositSessions.get(chatId);

      if (!depositSession) {
        return;
      }

      // ---------------------------------------------------------
      // CANCEL DEPOSIT
      // ---------------------------------------------------------

      if (text === "/cancel") {
        depositSessions.delete(chatId);

        await bot.sendMessage(chatId, "❌ ገንዘብ ማስገባት ተሰርዟል");

        await sendPaymentMethods(bot, chatId);

        return;
      }

      // ---------------------------------------------------------
      // ONLY PROCESS TELEBIRR DEPOSIT
      // ---------------------------------------------------------

      if (depositSession.paymentMethod !== "ቴሌብር") {
        return;
      }

      console.log("💰 ገንዘቡ ተልካል", {
        chatId,
        telegramId,
        text,
      });

      // =========================================================
      // CREATE PENDING DEPOSIT
      // =========================================================

      const result = await createPendingDeposit({
        telegramId,
        paymentMethod: "ቴሌብር",
        playerMessage: text,
      });

      console.log("💰 ገንዘብ ማስገባት ውጤት:", result);

      // =========================================================
      // READ VERIFICATION RESULT
      // =========================================================

      const status = result?.verification?.reason;

      console.log("💰 የተቀማጭ ገንዘብ ማረጋገጫ ሁኔታ:", status);

      // =========================================================
      // DEPOSIT APPROVED
      // =========================================================

      if (status === "DEPOSIT_APPROVED") {
        depositSessions.delete(chatId);

        const amount = Number(result?.verification?.amount || 0);

        await bot.sendMessage(
          chatId,
          `✅ የገንዘብ ማስገባት ፕሮሰስ ተሳክቷል!

💰 መጠኑ:

${amount.toLocaleString()} ብር

የእርስዎ ዋሌት በተሳካ ሁኔታ ተሞልቷል።

🎮 አሁን ቦጭ ቦጭን መጫወት ይችላሉ።`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🎮 ቦጭ ቦጭን ይጫወቱ",
                    web_app: {
                      url: process.env.TELEGRAM_MINI_APP_URL,
                    },
                  },
                ],
              ],
            },
          },
        );

        return;
      }

      // =========================================================
      // WAITING FOR MERCHANT
      // =========================================================

      if (status === "WAITING_FOR_MERCHANT") {
        await bot.sendMessage(
          chatId,
          `⏳ ገንዘብ ተቀምጧል

የክፍያ ማረጋገጫዎ ደርሶናል።

ከአድሚን የሚጠበቀውን የክፍያ ማረጋገጫ በመጠባበቅ ላይ እንገኛለን።

ክፍያው ሲረጋገጥ ዋሌቶን አዉቶማቲክ ይሞላል።

እባክዎ ተመሳሳይ ክፍያ በድጋሚ አያስገቡ።`,
        );

        return;
      }

      // =========================================================
      // ALREADY APPROVED
      // =========================================================

      if (status === "ALREADY_APPROVED") {
        depositSessions.delete(chatId);

        await bot.sendMessage(
          chatId,
          `⚠️ ይህ ግብይት ቀድሞውኑ ተከናውኗል።

ይህ ስህተት ነው ብለው ካመኑ፣ እባክዎ የድጋፍ አገልግሎቱን ያግኙ።`,
        );

        return;
      }

      // =========================================================
      // WAITING FOR PLAYER
      // =========================================================

      if (status === "WAITING_FOR_PLAYER") {
        await bot.sendMessage(
          chatId,
          `⏳ ክፍያ ተገኝቷል

የተጫዋች ክፍያ ተገኝቷል፤ ነገር ግን አሁንም የክፍያ ማረጋገጫዎ ያስፈልገናል።

እባክዎ የቴሌብር የኤስኤምኤስ መልእክት ወይም የFT ማጣቀሻ ቁጥር ይላኩልን።`,
        );

        return;
      }

      // =========================================================
      // DUPLICATE / ALREADY SUBMITTED
      // =========================================================

      if (status === "DUPLICATE" || status === "ALREADY_PENDING") {
        await bot.sendMessage(
          chatId,
          `⚠️ ይህ ግብይት ቀድሞውኑ ተከናውኗል።

እባክዎ ለማረጋገጫ ይጠብቁ።

ተመሳሳይ የFT ማጣቀሻ (reference) ቁጥር ​​እንደገና አያስገቡ።`,
        );

        return;
      }

      // =========================================================
      // UNKNOWN RESULT
      // =========================================================

      console.error("❌ ያልታወቀ የተቀማጭ ገንዘብ ማረጋገጫ ሁኔታ፡-", {
        status,
        result,
      });

      await bot.sendMessage(
        chatId,
        `⏳ ተቀማጭ ገንዘብ ደርሷል

ክፍያዎ እየተረጋገጠ ነው።

እንደገና ከማስገባትዎ በፊት የማረጋገጫ መልእክት ይጠብቁ።`,
      );
    } catch (error) {
      console.error("❌ Message handler error:", error);

      try {
        await bot.sendMessage(
          msg.chat.id,
          `❌ ችግር ተፈጥሯል።

እባክዎ እንደገና ይሞክሩ ወይም የድጋፍ አገልግሎትን ያግኙ።`,
        );
      } catch (sendError) {
        console.error("❌ Failed to send error message:", sendError);
      }
    }
  });
};
