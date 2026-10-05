import "dotenv/config";

import http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import bot from "./bot/bot.js";

import supabase from "./config/supabase.js";

import { getOrCreateActiveGame } from "./services/gameService.js";
import { startGameScheduler } from "./services/gameScheduler.js";

import authRoutes from "./routes/authRoutes.js";
import gameRoutes from "./routes/gameRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import depositRoutes from "./routes/depositRoutes.js";

import { initSocket } from "./socket/index.js";

// ============================================================
// APP
// ============================================================

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: "https://frontendfastbochboch.vercel.app",
  }),
);

app.use(express.json());

// ============================================================
// API ROUTES
// ============================================================

app.use("/api/auth", authRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/deposits", depositRoutes);

// ============================================================
// TELEGRAM WEBHOOK
// ============================================================

app.post("/api/telegram/webhook", async (req, res) => {
  try {
    const update = req.body;

    console.log("📩 Telegram webhook update received:", {
      updateId: update?.update_id,
      hasMessage: !!update?.message,
      hasCallbackQuery: !!update?.callback_query,
    });

    // Give Telegram an immediate successful response.
    res.sendStatus(200);

    // Pass the update to node-telegram-bot-api handlers.
    await bot.processUpdate(update);
  } catch (error) {
    console.error("❌ Telegram webhook error:", error);
  }
});

// ============================================================
// BASIC ROUTES
// ============================================================

app.get("/", (req, res) => {
  res.json({
    message: "Fast Boch Boch API 🚀",
    telegram: "webhook",
  });
});

app.get("/test-db", async (req, res) => {
  const { data, error } = await supabase.from("users").select("*").limit(1);

  if (error) {
    return res.status(500).json({
      error: error.message,
    });
  }

  res.json({
    success: true,
    message: "Supabase connected!",
    data,
  });
});

// ============================================================
// SERVER
// ============================================================

const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);

// ============================================================
// START SERVER
// ============================================================

const startServer = async () => {
  try {
    // ----------------------------------------
    // Active game
    // ----------------------------------------

    await getOrCreateActiveGame();

    // ----------------------------------------
    // Socket.IO
    // ----------------------------------------

    initSocket(httpServer);

    // ----------------------------------------
    // HTTP server
    // ----------------------------------------

    httpServer.listen(PORT, async () => {
      console.log("====================================");
      console.log(`🚀 Server running on port ${PORT}`);
      console.log("====================================");

      // --------------------------------------
      // Telegram webhook
      // --------------------------------------

      const webhookUrl =
        `${process.env.TELEGRAM_WEBHOOK_URL}` ||
        `https://fastbochboch.onrender.com/api/telegram/webhook`;

      try {
        await bot.setWebHook(webhookUrl);

        console.log("====================================");
        console.log("✅ TELEGRAM WEBHOOK SET");
        console.log("====================================");
        console.log("Webhook URL:", webhookUrl);
      } catch (error) {
        console.error("❌ Failed to set Telegram webhook:");
        console.error(error?.message || error);
      }

      // --------------------------------------
      // Game scheduler
      // --------------------------------------

      startGameScheduler();

      console.log("🎮 Game scheduler started.");
      console.log("🤖 Fast Boch Boch is fully running.");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);

    process.exit(1);
  }
};

startServer();
