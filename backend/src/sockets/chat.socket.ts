import { Server, Socket } from "socket.io";

export const registerChatHandler = (io: Server, socket: Socket) => {
  socket.on("join_chat", (chatId: string) => {
    socket.join(`chat:${chatId}`);
  });

  socket.on("leave_chat", (chatId: string) => {
    socket.leave(`chat: ${chatId}`);
  });
};
