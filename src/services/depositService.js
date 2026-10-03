import supabase from "../config/supabase.js";

/**
 * =========================================================
 * EXTRACT TELEBIRR TRANSACTION NUMBER
 * =========================================================
 *
 * Supports:
 *
 * 1. Full Telebirr SMS:
 *    "Your transaction number is DIT698QL84."
 *
 * 2. Receiver SMS:
 *    "You have received ETB 400.00 by transaction number DIT..."
 *
 * 3. Transaction number only:
 *    "DIT698QL84"
 *
 * The original message is never modified.
 */

export const extractFTReference = (message) => {
  if (!message) return null;

  const text = message.trim();

  const playerMatch = text.match(
    /your\s+transaction\s+number\s+is\s+([A-Z0-9]+)/i,
  );

  if (playerMatch) {
    return playerMatch[1].toUpperCase();
  }

  const receiverMatch = text.match(/by\s+transaction\s+number\s+([A-Z0-9]+)/i);

  if (receiverMatch) {
    return receiverMatch[1].toUpperCase();
  }

  if (/^[A-Z0-9]+$/i.test(text)) {
    return text.toUpperCase();
  }

  return null;
};

/**
 * =========================================================
 * EXTRACT MERCHANT RECEIVED AMOUNT
 * =========================================================
 *
 * The merchant/receiver SMS is the source of truth
 * for the actual amount received.
 */

export const extractAmount = (message) => {
  if (!message) return null;

  const match = message.match(
    /You\s+have\s+received\s+ETB\s+([\d,]+(?:\.\d{1,2})?)/i,
  );

  if (!match) {
    return null;
  }

  const amount = Number(match[1].replace(/,/g, ""));

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Math.round(amount);
};

/**
 * =========================================================
 * RECONCILE PAYMENT BY FT
 * =========================================================
 *
 * PostgreSQL is the source of truth.
 *
 * This function works regardless of which side arrives first:
 *
 * PLAYER FIRST:
 *   deposits → reconcile → waiting for merchant
 *
 * MERCHANT FIRST:
 *   merchant_payments → reconcile → waiting for player
 *
 * BOTH:
 *   reconcile → verify_and_topup_deposit()
 *
 * PostgreSQL uses an advisory lock per FT reference so
 * simultaneous requests cannot process the same payment
 * at the same time.
 */

const reconcileDepositByFT = async (ftReference) => {
  const normalizedFT = ftReference.trim().toUpperCase();

  const { data, error } = await supabase.rpc("reconcile_deposit_by_ft", {
    p_ft_reference: normalizedFT,
  });

  if (error) {
    throw error;
  }

  return data;
};

/**
 * =========================================================
 * CREATE PLAYER DEPOSIT
 * =========================================================
 *
 * Called when the player sends their Telebirr
 * confirmation SMS to the Telegram bot.
 *
 * The deposit is created as PENDING.
 *
 * Then the backend immediately checks whether the
 * merchant SMS has already arrived.
 */

export const createPendingDeposit = async ({
  telegramId,
  paymentMethod,
  playerMessage,
}) => {
  if (!playerMessage || !playerMessage.trim()) {
    throw new Error("Payment confirmation is required");
  }

  // -------------------------------------------------------
  // 1. Extract player's FT reference
  // -------------------------------------------------------

  const ftReference = extractFTReference(playerMessage);

  if (!ftReference) {
    throw new Error("Telebirr transaction number not found");
  }

  // -------------------------------------------------------
  // 2. Find player
  // -------------------------------------------------------

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("telegram_id", telegramId)
    .single();

  if (userError || !user) {
    throw new Error("User not found");
  }

  // -------------------------------------------------------
  // 3. Check duplicate transaction
  // -------------------------------------------------------

  const { data: existingDeposit, error: existingError } = await supabase
    .from("deposits")
    .select("id, user_id, status, ft_reference")
    .eq("ft_reference", ftReference)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existingDeposit) {
    if (existingDeposit.status === "APPROVED") {
      throw new Error("This transaction has already been processed");
    }

    throw new Error("This transaction has already been submitted");
  }

  // -------------------------------------------------------
  // 4. Create player-side deposit
  // -------------------------------------------------------

  const { data: deposit, error: depositError } = await supabase
    .from("deposits")
    .insert({
      user_id: user.id,
      payment_method: paymentMethod,
      player_sms: playerMessage,
      ft_reference: ftReference,
      status: "PENDING",
    })
    .select()
    .single();

  if (depositError) {
    throw depositError;
  }

  // -------------------------------------------------------
  // 5. Reconcile
  //
  // If merchant SMS already exists, this will approve
  // the deposit immediately.
  //
  // Otherwise it returns WAITING_FOR_MERCHANT.
  // -------------------------------------------------------

  const verification = await reconcileDepositByFT(ftReference);

  return {
    deposit,
    verification,
  };
};

/**
 * =========================================================
 * RECEIVE MERCHANT PAYMENT
 * =========================================================
 *
 * Called by the Android SMS gateway.
 *
 * IMPORTANT:
 *
 * We NEVER reject a merchant SMS just because the player
 * has not submitted their confirmation yet.
 *
 * The merchant payment is saved in merchant_payments.
 *
 * Later, when the player submits their FT, the backend
 * will match both sides.
 */

export const verifyMerchantDeposit = async (merchantMessage) => {
  if (!merchantMessage || !merchantMessage.trim()) {
    throw new Error("Merchant SMS is required");
  }

  // -------------------------------------------------------
  // 1. Extract merchant FT
  // -------------------------------------------------------

  const merchantFT = extractFTReference(merchantMessage);

  if (!merchantFT) {
    throw new Error("Telebirr transaction number not found in merchant SMS");
  }

  // -------------------------------------------------------
  // 2. Extract actual received amount
  //
  // Merchant SMS is the source of truth.
  // -------------------------------------------------------

  const amount = extractAmount(merchantMessage);

  if (!amount || amount <= 0) {
    throw new Error("Could not determine payment amount");
  }

  // -------------------------------------------------------
  // 3. Check whether merchant payment already exists
  // -------------------------------------------------------

  const { data: existingPayment, error: existingError } = await supabase
    .from("merchant_payments")
    .select("id, ft_reference, amount, status, deposit_id")
    .eq("ft_reference", merchantFT)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  // -------------------------------------------------------
  // 4. Save merchant payment
  //
  // UNIQUE(ft_reference) prevents duplicate merchant
  // payments if Android sends the same SMS more than once.
  // -------------------------------------------------------

  if (!existingPayment) {
    const { error: insertError } = await supabase
      .from("merchant_payments")
      .insert({
        ft_reference: merchantFT,
        amount,
        merchant_sms: merchantMessage,
        status: "WAITING_FOR_PLAYER",
      });

    if (insertError) {
      // Another webhook may have inserted the same
      // transaction at almost exactly the same time.
      //
      // PostgreSQL unique constraint:
      // 23505 = duplicate key.
      //
      // That's safe because the payment already exists.
      if (insertError.code !== "23505") {
        throw insertError;
      }
    }
  }

  // -------------------------------------------------------
  // 5. Reconcile both sides
  // -------------------------------------------------------

  const result = await reconcileDepositByFT(merchantFT);

  return result;
};
