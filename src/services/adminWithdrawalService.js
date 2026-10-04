import supabase from "../config/supabase.js";

// =========================================================
// GET PENDING WITHDRAWALS
// =========================================================

export const getPendingWithdrawals = async () => {
  const { data, error } = await supabase
    .from("withdrawals")
    .select(
      `
      id,
      user_id,
      amount,
      payment_method,
      account_number,
      status,
      created_at,
      users (
        telegram_id,
        display_name,
        username
      )
    `,
    )
    .eq("status", "PENDING")
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    console.error("❌ Failed to get pending withdrawals:", error);

    throw error;
  }

  return data || [];
};

// =========================================================
// GET RECENT WITHDRAWALS
// =========================================================

export const getRecentWithdrawals = async () => {
  const { data, error } = await supabase
    .from("withdrawals")
    .select(
      `
      id,
      user_id,
      amount,
      payment_method,
      account_number,
      status,
      rejection_reason,
      processed_at,
      created_at,
      users (
        telegram_id,
        display_name,
        username
      )
    `,
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(20);

  if (error) {
    console.error("❌ Failed to get recent withdrawals:", error);

    throw error;
  }

  return data || [];
};

// =========================================================
// APPROVE WITHDRAWAL
// =========================================================

export const approveWithdrawal = async (withdrawalId) => {
  const { data, error } = await supabase.rpc("approve_withdrawal", {
    p_withdrawal_id: withdrawalId,
  });

  if (error) {
    console.error("❌ Approve withdrawal RPC failed:", error);

    throw error;
  }

  return data;
};

// =========================================================
// REJECT WITHDRAWAL
// =========================================================

export const rejectWithdrawal = async (withdrawalId, rejectionReason) => {
  const { data, error } = await supabase.rpc("reject_withdrawal", {
    p_withdrawal_id: withdrawalId,
    p_rejection_reason: rejectionReason,
  });

  if (error) {
    console.error("❌ Reject withdrawal RPC failed:", error);

    throw error;
  }

  return data;
};
