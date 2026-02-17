import dotenv from "dotenv";
dotenv.config({
  path: "./.env",
});

import { app } from "./app";
import { Server } from "socket.io";
import { createServer } from "http";
import { registerChatHandler } from "./sockets/chat.socket";

const port = process.env.PORT || 4001;

const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGINS,
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("User connected: ", socket.id);

  registerChatHandler(io, socket);

  socket.on("disconnect", () => {
    console.log("User disconnected: ", socket.id);
  });
});

httpServer.listen(port, () => {
  console.log(`server running on PORT ${port}`);
});
