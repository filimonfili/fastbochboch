import supabase from "../config/supabase.js";

// ============================================================
// CREATE WITHDRAWAL
// ============================================================

export const createWithdrawal = async ({
  userId,
  amount,
  paymentMethod,
  accountNumber,
}) => {
  const { data, error } = await supabase.rpc("create_withdrawal", {
    p_user_id: userId,
    p_amount: amount,
    p_payment_method: paymentMethod,
    p_account_number: accountNumber,
  });

  if (error) {
    console.error("❌ Create withdrawal RPC failed:", error);

    throw error;
  }

  return data;
};

// ============================================================
// GET USER WITHDRAWALS
// ============================================================

export const getUserWithdrawals = async (userId) => {
  const { data, error } = await supabase
    .from("withdrawals")
    .select(
      `
      id,
      amount,
      payment_method,
      account_number,
      status,
      rejection_reason,
      processed_at,
      created_at
    `,
    )
    .eq("user_id", userId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error("❌ Failed to get user withdrawals:", error);

    throw error;
  }

  return data || [];
};

// ============================================================
// GET USER BALANCE
// ============================================================

export const getUserWithdrawalBalance = async (userId) => {
  const { data, error } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("❌ Failed to get wallet balance:", error);

    throw error;
  }

  return Number(data.balance);
};
