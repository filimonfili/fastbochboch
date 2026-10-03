import express from "express";
import jwt from "jsonwebtoken";
import supabase from "../config/supabase.js";
import { authenticateTelegramUser } from "../services/authService.js";
import { requireAuth } from "../middleware/authMiddleware.js";
const router = express.Router();

router.post("/telegram", async (req, res) => {
  try {
    const { initData } = req.body;

    if (!initData) {
      return res.status(400).json({
        message: "Telegram initData is required",
      });
    }

    const user = await authenticateTelegramUser(initData);

    const token = jwt.sign(
      {
        userId: user.id,
        telegramId: user.telegram_id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    res.json({
      token,
      user,
    });
  } catch (error) {
    console.error("Telegram authentication error:", error);

    res.status(401).json({
      message: error.message || "Authentication failed",
    });
  }
});
router.get("/me", requireAuth, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", req.user.userId)
      .single();

    if (error) {
      throw error;
    }

    res.json({
      user,
    });
  } catch (error) {
    console.error("Get current user error:", error);

    res.status(500).json({
      message: "Failed to get user",
    });
  }
});
export default router;
