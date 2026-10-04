import supabase from "../config/supabase.js";

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
