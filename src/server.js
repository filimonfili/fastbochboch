import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";

// ===============================
// TELEGRAM BOT
// ===============================

import "./bot/bot.js";

import supabase from "./config/supabase.js";

import { getOrCreateActiveGame } from "./services/gameService.js";
import { startGameScheduler } from "./services/gameScheduler.js";

import authRoutes from "./routes/authRoutes.js";
import gameRoutes from "./routes/gameRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import depositRoutes from "./routes/depositRoutes.js";

import { initSocket } from "./socket/index.js";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: "https://frontendfastbochboch.vercel.app",
  }),
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/deposits", depositRoutes);
app.get("/", (req, res) => {
  res.json({
    message: "Fast Boch Boch API 🚀",
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

const PORT = process.env.PORT || 5000;

const httpServer = http.createServer(app);

const startServer = async () => {
  try {
    await getOrCreateActiveGame();

    initSocket(httpServer);

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);

      startGameScheduler();
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
