import { Server } from "socket.io";
import logger from "./logger";

export const registerSocketHandlers = (io: Server) => {
  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.id}`);
    socket.on("disconnect", () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });
};
