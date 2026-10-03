import express from "express";
import supabase from "../config/supabase.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();
router.get("/", requireAuth, async (req, res) => {
  try {
    const { data: wallet, error } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", req.user.userId)
      .single();

    if (error) {
      throw error;
    }

    res.json({
      balance: wallet.balance,
    });
  } catch (error) {
    console.error("Get wallet error:", error);

    res.status(500).json({
      message: "Failed to get wallet balance",
    });
  }
});

router.post("/test-deposit", requireAuth, async (req, res) => {
  try {
    const amount = Number(req.body.amount);

    if (!Number.isInteger(amount) || amount <= 0) {
      return res.status(400).json({
        message: "Amount must be a positive integer",
      });
    }

    const userId = req.user.userId;

    // Add money to wallet
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", userId)
      .single();

    if (walletError) {
      throw walletError;
    }

    const newBalance = wallet.balance + amount;

    const { error: updateError } = await supabase
      .from("wallets")
      .update({
        balance: newBalance,
      })
      .eq("user_id", userId);

    if (updateError) {
      throw updateError;
    }

    // Record deposit transaction
    const { data: transaction, error: transactionError } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        type: "DEPOSIT",
        amount,
        status: "COMPLETED",
        reference: "TEST-DEPOSIT",
      })
      .select()
      .single();

    if (transactionError) {
      throw transactionError;
    }

    res.json({
      message: "Test deposit successful",
      deposited: amount,
      balance: newBalance,
      transaction,
    });
  } catch (error) {
    console.error("Test deposit error:", error);

    res.status(500).json({
      message: "Failed to create test deposit",
    });
  }
});

export default router;
