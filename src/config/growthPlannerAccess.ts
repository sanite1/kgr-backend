import User from "../models/User";
import { runOnce } from "../helpers/runOnce";
import logger from "./logger";

// One-time migration: managers and admins with customized tab access
// saved before the Growth Planner existed get the new key exactly once.
const grantOnce = async () => {
  const res = await User.updateMany(
    { role: { $in: ["admin", "manager"] }, access: { $type: "array" } },
    { $addToSet: { access: "growth_planner" } },
  );
  logger.info(`Growth Planner access granted to ${res.modifiedCount} user(s)`);
};
export const runGrowthPlannerGrant = () =>
  runOnce("migration_access_growth_planner", grantOnce);
