import { Server } from "socket.io";

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "https://bb1a-196-188-37-214.ngrok-free.app",
    },
  });

  io.on("connection", (socket) => {
    console.log("🔥 SOCKET CONNECTED:", socket.id);

    socket.on("game:join", (gameId) => {
      console.log("🔥 GAME JOIN REQUEST:", gameId);

      socket.join(`game:${gameId}`);

      console.log(`🔥 SOCKET ${socket.id} JOINED game:${gameId}`);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔥 SOCKET DISCONNECTED:", socket.id, reason);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized");
  }

  return io;
};
