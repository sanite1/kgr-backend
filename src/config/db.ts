import mongoose from "mongoose";
import logger from "./logger";

const MONGODB_URI = process.env.MONGODB_URI || "";

export const connectDb = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info("Connected to MongoDB");
  } catch (error) {
    if (error instanceof Error) {
      logger.error("ERROR connecting to MongoDB", { message: error.message });
    }
    process.exit(1);
  }
};

mongoose.connection.on("disconnected", () => {
  logger.warn("MongoDB disconnected");
});
mongoose.connection.on("error", (error) => {
  logger.error("MongoDB connection error", { message: error.message });
});
