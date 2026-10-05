import express from "express";

import { verifyMerchantDeposit } from "../services/depositService.js";
import supabase from "../config/supabase.js";

const router = express.Router();

router.post("/verify-merchant", async (req, res) => {
  try {
    // =========================================================
    // 1. Verify webhook secret from HTTP header
    // =========================================================

    const configuredSecret = process.env.DEPOSIT_WEBHOOK_SECRET;
    const providedSecret = req.headers["x-deposit-secret"];

    if (!configuredSecret) {
      console.error(
        "❌ DEPOSIT_WEBHOOK_SECRET is not configured on the server",
      );

      return res.status(500).json({
        success: false,
        message: "Deposit webhook is not configured",
      });
    }

    if (!providedSecret || providedSecret !== configuredSecret) {
      console.warn("🚨 Unauthorized merchant webhook request:", {
        ip: req.ip,
        userAgent: req.get("user-agent"),
      });

      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // =========================================================
    // 2. Accept SMS gateway or manual/test payload
    // =========================================================

    const message =
      req.body?.message || req.body?.originalBody || req.body?.transformedBody;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Merchant SMS is required",
      });
    }

    console.log("📩 Merchant SMS received:", {
      provider: req.body?.provider || "UNKNOWN",
      sender: req.body?.sender || "UNKNOWN",
      receivedAt: req.body?.receivedAt || null,
      idempotencyKey: req.body?.idempotencyKey || null,
      message,
    });

    // =========================================================
    // 3. Store merchant payment + reconcile with player
    // =========================================================

    const result = await verifyMerchantDeposit(message);

    console.log("🔄 Merchant reconciliation result:", result);

    // =========================================================
    // 4. PLAYER HAS NOT SUBMITTED PAYMENT INFORMATION YET
    // =========================================================

    if (result.success === true && result.reason === "WAITING_FOR_PLAYER") {
      console.log("⏳ Merchant payment saved. Waiting for player:", {
        ftReference: result.ft_reference,
        amount: result.amount,
      });

      return res.status(200).json({
        ...result,
        notification_sent: false,
        notification_reason: "WAITING_FOR_PLAYER",
      });
    }

    // =========================================================
    // 5. PLAYER DEPOSIT EXISTS BUT MERCHANT IS STILL NEEDED
    // =========================================================

    if (result.success === true && result.reason === "WAITING_FOR_MERCHANT") {
      console.log("⏳ Deposit exists. Waiting for merchant:", {
        depositId: result.deposit_id,
        ftReference: result.ft_reference,
      });

      return res.status(200).json({
        ...result,
        notification_sent: false,
        notification_reason: "WAITING_FOR_MERCHANT",
      });
    }

    // =========================================================
    // 6. ALREADY APPROVED
    // =========================================================

    if (result.reason === "ALREADY_APPROVED") {
      console.log("ℹ️ Deposit already approved:", {
        depositId: result.deposit_id,
        ftReference: result.ft_reference,
      });

      // Duplicate merchant SMS is not a server failure.
      // Wallet was already credited previously.

      return res.status(200).json({
        ...result,
        notification_sent: false,
        notification_reason: "ALREADY_APPROVED",
      });
    }

    // =========================================================
    // 7. OTHER UNSUCCESSFUL RESULT
    // =========================================================

    if (!result.success) {
      console.warn("⚠️ Merchant deposit was not approved:", result);

      return res.status(400).json(result);
    }

    // =========================================================
    // 8. ONLY CONTINUE IF DEPOSIT WAS ACTUALLY APPROVED
    // =========================================================

    if (result.reason !== "DEPOSIT_APPROVED") {
      console.warn("⚠️ Unexpected successful deposit result:", result);

      return res.status(200).json({
        ...result,
        notification_sent: false,
        notification_reason: "NO_NOTIFICATION_REQUIRED",
      });
    }

    // =========================================================
    // 9. Find player's Telegram ID
    // =========================================================

    if (!result.user_id) {
      console.error("⚠️ Deposit approved but user_id is missing:", result);

      return res.status(200).json({
        ...result,
        notification_sent: false,
        notification_reason: "USER_ID_MISSING",
      });
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("telegram_id")
      .eq("id", result.user_id)
      .single();

    if (userError || !user) {
      console.error("⚠️ Deposit approved, but user was not found:", userError);

      return res.status(200).json({
        ...result,
        notification_sent: false,
        notification_reason: "USER_NOT_FOUND",
      });
    }

    // =========================================================
    // 10. Check Telegram ID
    // =========================================================

    if (
      user.telegram_id === null ||
      user.telegram_id === undefined ||
      String(user.telegram_id).trim() === ""
    ) {
      console.error(
        "⚠️ Deposit approved, but Telegram ID is missing:",
        result.user_id,
      );

      return res.status(200).json({
        ...result,
        notification_sent: false,
        notification_reason: "TELEGRAM_ID_MISSING",
      });
    }

    // =========================================================
    // 11. Send Telegram confirmation
    // =========================================================

    try {
      await bot.sendMessage(
        user.telegram_id,
        `✅ Deposit Accepted!

💰 Amount: ${result.amount} ETB
💳 New Balance: ${result.new_balance} ETB

Your deposit has been verified successfully and your wallet has been credited.`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "⬅️ Back to Deposit",
                  callback_data: "deposit_back",
                },
              ],
            ],
          },
        },
      );

      console.log("📨 Deposit acceptance notification sent:", {
        depositId: result.deposit_id,
        telegramId: user.telegram_id,
      });

      return res.status(200).json({
        ...result,
        notification_sent: true,
        notification_reason: "SENT",
      });
    } catch (notificationError) {
      console.error(
        "⚠️ Deposit approved, but Telegram notification failed:",
        notificationError,
      );

      // Deposit is already approved and wallet is already credited.
      // Telegram failure must NOT reverse the deposit.

      return res.status(200).json({
        ...result,
        notification_sent: false,
        notification_reason: "TELEGRAM_SEND_FAILED",
      });
    }
  } catch (error) {
    console.error("❌ Merchant verification error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
