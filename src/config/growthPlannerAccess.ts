import mongoose from "mongoose";
import User from "../models/User";
import { nextSequence } from "../helpers/sequence";
import logger from "./logger";

// One-time migration: managers and admins with customized tab access
// saved before the Growth Planner existed get the new key exactly once.
const grantOnce = async () => {
  const run = await nextSequence("migration_access_growth_planner", 1);
  if (run !== 1) return;
  const res = await User.updateMany(
    { role: { $in: ["admin", "manager"] }, access: { $type: "array" } },
    { $addToSet: { access: "growth_planner" } },
  );
  logger.info(`Growth Planner access granted to ${res.modifiedCount} user(s)`);
};
export const runGrowthPlannerGrant = () => {
  const run = () =>
    grantOnce().catch((error: Error) =>
      logger.error("Growth Planner access migration failed", {
        message: error.message,
      }),
    );
  if (mongoose.connection.readyState === 1) void run();
  else mongoose.connection.once("connected", () => void run());
};
