import fp from "fastify-plugin";
import { Server } from "socket.io";

export const socketIOPlugin = fp(async (fastify) => {
  const io = new Server(fastify.server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });


  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
});
