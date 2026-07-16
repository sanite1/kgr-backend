import { createClient } from "redis";
import logger from "./logger";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const redisClient = createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy: (retries: number) => {
      if (retries > 10) {
        logger.error("Redis max reconnection attempts reached");
        return new Error("Redis max reconnection attempts reached");
      }
      const delay = Math.min(retries * 200, 3000);
      logger.warn(`Redis reconnecting in ${delay}ms (attempt ${retries})`);
      return delay;
    },
  },
});

redisClient.on("connect", () => logger.info("Redis client connected"));
redisClient.on("ready", () => logger.info("Redis client ready"));
redisClient.on("error", (error) =>
  logger.error("Redis client error", { message: error.message }),
);
redisClient.on("reconnecting", () => logger.warn("Redis client reconnecting"));

export const connectRedis = async () => {
  try {
    if (!process.env.REDIS_URL) {
      logger.warn(
        "REDIS_URL not configured: Redis caching disabled. API responses will not be cached.",
      );
      return;
    }
    await redisClient.connect();
  } catch (error) {
    if (error instanceof Error) {
      logger.error("Failed to connect to Redis", { message: error.message });
    }
    logger.warn("Continuing without Redis: caching disabled");
  }
};

export default redisClient;
