import { isAdmin } from "./utils/auth.js";

import {
  depositSessions,
  withdrawalSessions,
  adminSessions,
} from "./sessions/sessions.js";
import { getAllPlayers } from "../services/announcementService.js";
import {
  updateTelebirrPhone,
  updateTelebirrAccountName,
} from "../services/paymentSettingsService.js";

import { createPendingDeposit } from "../services/depositService.js";

import { rejectWithdrawal } from "../services/adminWithdrawalService.js";

import { sendMainMenu } from "./menus/mainMenu.js";

import { sendPaymentMethods } from "./menus/depositMenu.js";

import { sendAdminMenu } from "./menus/adminMenu.js";

import { startWithdrawal } from "./commands/withdraw.js";

import supabase from "../config/supabase.js";

export const registerMessageHandler = (bot) => {
  bot.on("message", async (msg) => {
    try {
      if (!msg.text) return;

      const chatId = msg.chat.id;
      const telegramId = msg.from?.id;
      const text = msg.text.trim();

      // =========================================================
      // ADMIN SESSION
      // =========================================================

      if (telegramId && isAdmin(telegramId)) {
        const adminSession = adminSessions.get(chatId);

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

              // -------------------------------------------------
              // ADMIN CONFIRMATION
              // -------------------------------------------------

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

              // -------------------------------------------------
              // FIND PLAYER
              // -------------------------------------------------

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

              // -------------------------------------------------
              // NOTIFY PLAYER
              // -------------------------------------------------

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

              // -----------------------------------------------
              // ALREADY PROCESSED
              // -----------------------------------------------

              if (message.includes("WITHDRAWAL_ALREADY_PROCESSED")) {
                adminSessions.delete(chatId);

                await bot.sendMessage(
                  chatId,
                  `⚠️ This withdrawal has already been processed.

It cannot be rejected again.`,
                );

                return;
              }
              // ========================================================
              // CREATE ANNOUNCEMENT
              // ========================================================

              if (adminSession.action === "CREATE_ANNOUNCEMENT") {
                const announcement = text.trim();

                if (!announcement) {
                  await bot.sendMessage(
                    chatId,
                    `❌ Announcement cannot be empty.

Please send the announcement text.`,
                  );

                  return;
                }

                if (announcement.length > 4000) {
                  await bot.sendMessage(
                    chatId,
                    `❌ Announcement is too long.

Please keep it under 4000 characters.`,
                  );

                  return;
                }

                adminSessions.set(chatId, {
                  action: "CONFIRM_ANNOUNCEMENT",
                  announcement,
                });

                await bot.sendMessage(
                  chatId,
                  `📢 Announcement Preview

━━━━━━━━━━━━━━━

${announcement}

━━━━━━━━━━━━━━━

Send this announcement to all players?`,
                  {
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
                  },
                );

                return;
              }
              // -----------------------------------------------
              // NOT FOUND
              // -----------------------------------------------

              if (message.includes("WITHDRAWAL_NOT_FOUND")) {
                adminSessions.delete(chatId);

                await bot.sendMessage(
                  chatId,
                  `❌ Withdrawal not found.

The request may have already been removed or processed.`,
                );

                return;
              }

              // -----------------------------------------------
              // UNKNOWN ERROR
              // -----------------------------------------------

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

      // ---------------------------------------------------------
      // PLAY
      // ---------------------------------------------------------

      if (text === "🎮 Play Boch Boch") {
        await sendMainMenu(bot, chatId);

        return;
      }

      // ---------------------------------------------------------
      // BALANCE
      // ---------------------------------------------------------

      if (text === "💰 Balance") {
        await bot.sendMessage(
          chatId,
          `💰 Balance

Your wallet balance is available inside Boch Boch.`,
        );

        return;
      }

      // ---------------------------------------------------------
      // DEPOSIT
      // ---------------------------------------------------------

      if (text === "➕ Deposit") {
        await sendPaymentMethods(bot, chatId);

        return;
      }

      // ---------------------------------------------------------
      // WITHDRAW
      // ---------------------------------------------------------

      if (text === "💸 Withdraw") {
        await startWithdrawal(bot, msg);

        return;
      }

      // ---------------------------------------------------------
      // SUPPORT
      // ---------------------------------------------------------

      if (text === "🆘 Support") {
        await bot.sendMessage(
          chatId,
          `🆘 Support

If you have a problem with your account, deposit, withdrawal, or game, please contact support.`,
        );

        return;
      }

      // =========================================================
      // WITHDRAWAL SESSION
      // =========================================================

      const withdrawalSession = withdrawalSessions.get(chatId);

      if (withdrawalSession) {
        // -------------------------------------------------------
        // CANCEL
        // -------------------------------------------------------

        if (text === "/cancel") {
          withdrawalSessions.delete(chatId);

          await bot.sendMessage(chatId, "❌ Withdrawal cancelled.");

          return;
        }

        // =======================================================
        // ENTER WITHDRAWAL AMOUNT
        // =======================================================

        if (withdrawalSession.step === "AMOUNT") {
          const amount = Number(text);

          // -----------------------------------------------------
          // INVALID NUMBER
          // -----------------------------------------------------

          if (!Number.isInteger(amount) || amount <= 0) {
            await bot.sendMessage(
              chatId,
              `❌ Invalid amount.

Please enter a valid whole number.

Example:

100`,
            );

            return;
          }

          // -----------------------------------------------------
          // MINIMUM WITHDRAWAL
          // -----------------------------------------------------

          const MIN_WITHDRAWAL = 5;

          if (amount < MIN_WITHDRAWAL) {
            await bot.sendMessage(
              chatId,
              `❌ Minimum withdrawal is ${MIN_WITHDRAWAL} ETB.

Please enter an amount of ${MIN_WITHDRAWAL} ETB or more.`,
            );

            return;
          }

          // -----------------------------------------------------
          // CHECK BALANCE
          // -----------------------------------------------------

          const currentBalance = withdrawalSession.balance;

          // -----------------------------------------------------
          // INSUFFICIENT BALANCE
          // -----------------------------------------------------

          if (amount > currentBalance) {
            await bot.sendMessage(
              chatId,
              `❌ Insufficient Balance

Your balance:
${currentBalance} ETB

Requested:
${amount} ETB

Please enter an amount up to ${currentBalance} ETB.`,
            );

            return;
          }

          // -----------------------------------------------------
          // SAVE AMOUNT
          // -----------------------------------------------------

          withdrawalSessions.set(chatId, {
            ...withdrawalSession,
            amount,
            step: "ACCOUNT_NUMBER",
          });

          // -----------------------------------------------------
          // ASK FOR ACCOUNT NUMBER
          // -----------------------------------------------------

          const paymentName =
            withdrawalSession.paymentMethod === "TELEBIRR"
              ? "Telebirr"
              : "CBE Birr";

          await bot.sendMessage(
            chatId,
            `📱 ${paymentName} Withdrawal

💰 Amount:
${amount} ETB

Now enter the ${paymentName} phone number where you want to receive the money.

Example:

0912345678

Send /cancel to cancel.`,
          );

          return;
        }

        // =======================================================
        // ENTER ACCOUNT NUMBER
        // =======================================================

        if (withdrawalSession.step === "ACCOUNT_NUMBER") {
          const accountNumber = text.replace(/\s+/g, "");

          // -----------------------------------------------------
          // VALIDATE ETHIOPIAN PHONE
          // -----------------------------------------------------

          if (!/^09\d{8}$/.test(accountNumber)) {
            await bot.sendMessage(
              chatId,
              `❌ Invalid phone number.

Please enter a valid Ethiopian mobile number.

Example:

0912345678`,
            );

            return;
          }

          // -----------------------------------------------------
          // SAVE ACCOUNT NUMBER
          // -----------------------------------------------------

          withdrawalSessions.set(chatId, {
            ...withdrawalSession,
            accountNumber,
            step: "CONFIRM",
          });

          const paymentName =
            withdrawalSession.paymentMethod === "TELEBIRR"
              ? "Telebirr"
              : "CBE Birr";

          // -----------------------------------------------------
          // CONFIRMATION
          // -----------------------------------------------------

          await bot.sendMessage(
            chatId,
            `🔎 Confirm Withdrawal

💰 Amount:
${withdrawalSession.amount} ETB

📱 Method:
${paymentName}

📞 Number:
${accountNumber}

Please check the information carefully.

Do you want to continue?`,
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "✅ Confirm Withdrawal",
                      callback_data: "withdraw_confirm",
                    },
                  ],
                  [
                    {
                      text: "❌ Cancel",
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

        await bot.sendMessage(chatId, "❌ Deposit cancelled.");

        await sendPaymentMethods(bot, chatId);

        return;
      }

      // ---------------------------------------------------------
      // ONLY PROCESS TELEBIRR DEPOSIT
      // ---------------------------------------------------------

      if (depositSession.paymentMethod !== "TELEBIRR") {
        return;
      }

      console.log("💰 Deposit submission received:", {
        chatId,
        telegramId,
        text,
      });

      // =========================================================
      // CREATE PENDING DEPOSIT
      // =========================================================

      const result = await createPendingDeposit({
        telegramId,
        paymentMethod: "TELEBIRR",
        playerSms: text,
      });

      console.log("💰 Deposit result:", result);

      // =========================================================
      // DEPOSIT APPROVED
      // =========================================================

      if (result.status === "DEPOSIT_APPROVED") {
        depositSessions.delete(chatId);

        await bot.sendMessage(
          chatId,
          `✅ Deposit Successful!

💰 Amount:

${result.amount} ETB

Your wallet has been credited successfully.

🎮 You can now play Boch Boch.`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🎮 Play Boch Boch",
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

      if (result.status === "WAITING_FOR_MERCHANT") {
        await bot.sendMessage(
          chatId,
          `⏳ Deposit Received

Your payment confirmation was received.

We are waiting for the merchant payment confirmation.

Your wallet will be credited automatically once the payment is verified.

Please do not submit the same payment again.`,
        );

        return;
      }

      // =========================================================
      // ALREADY APPROVED
      // =========================================================

      if (result.status === "ALREADY_APPROVED") {
        depositSessions.delete(chatId);

        await bot.sendMessage(
          chatId,
          `⚠️ This transaction has already been processed.

If you believe this is an error, please contact support.`,
        );

        return;
      }

      // =========================================================
      // WAITING FOR PLAYER
      // =========================================================

      if (result.status === "WAITING_FOR_PLAYER") {
        await bot.sendMessage(
          chatId,
          `⏳ Payment Found

The merchant payment was found, but we still need your payment confirmation.

Please send your Telebirr SMS or FT reference number.`,
        );

        return;
      }

      // =========================================================
      // DUPLICATE / ALREADY SUBMITTED
      // =========================================================

      if (
        result.status === "DUPLICATE" ||
        result.status === "ALREADY_PENDING"
      ) {
        await bot.sendMessage(
          chatId,
          `⚠️ This transaction is already being processed.

Please wait for verification.

Do not submit the same FT reference again.`,
        );

        return;
      }

      // =========================================================
      // UNKNOWN RESULT
      // =========================================================

      await bot.sendMessage(
        chatId,
        `⏳ Deposit Received

Your payment is being verified.

Please wait for confirmation before submitting again.`,
      );
    } catch (error) {
      console.error("❌ Message handler error:", error);

      try {
        await bot.sendMessage(
          msg.chat.id,
          `❌ Something went wrong.

Please try again or contact support.`,
        );
      } catch (sendError) {
        console.error("❌ Failed to send error message:", sendError);
      }
    }
  });
};
