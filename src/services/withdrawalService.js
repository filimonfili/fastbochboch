import supabase from "../config/supabase.js";

// =========================================================
// CREATE WITHDRAWAL
// =========================================================

export const createWithdrawal = async ({
  userId,
  amount,
  paymentMethod,
  accountNumber,
}) => {
  console.log("🔥 createWithdrawal() CALLED");

  console.log("📦 Withdrawal data:", {
    userId,
    amount,
    paymentMethod,
    accountNumber,
  });

  try {
    const { data, error } = await supabase.rpc("create_withdrawal", {
      p_user_id: userId,
      p_amount: Number(amount),
      p_payment_method: paymentMethod,
      p_account_number: accountNumber,
    });

    console.log("📥 RPC RESPONSE:", {
      data,
      error,
    });

    if (error) {
      console.error("❌ RPC ERROR:", error);
      throw error;
    }

    console.log("✅ Withdrawal RPC SUCCESS:", data);

    return data;
  } catch (error) {
    console.error("🔥 createWithdrawal() FAILED");

    console.error("ERROR:", error);
    console.error("MESSAGE:", error?.message);
    console.error("DETAILS:", error?.details);
    console.error("HINT:", error?.hint);
    console.error("CODE:", error?.code);

    throw error;
  }
};

// =========================================================
// GET USER WITHDRAWALS
// =========================================================

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

// =========================================================
// GET USER WITHDRAWAL BALANCE
// =========================================================

export const getUserWithdrawalBalance = async (userId) => {
  console.log("💰 Getting withdrawal balance:", userId);

  const { data, error } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("❌ Failed to get wallet balance:", error);

    throw error;
  }

  const balance = Number(data.balance);

  console.log("💰 Current withdrawal balance:", balance);

  return balance;
};
