// One-off migration for the battery status overhaul: the fixed set of
// states is now active / faulty / charging / fully_charged / not_charged /
// not_in_use. This remaps every legacy value onto the new set:
//   in_store  -> active      (available packs are simply "active")
//   on_bus    -> active      (bus assignment is tracked on `bus`, not status)
//   in_repair -> faulty      (a pack under repair reads as faulty)
//   charging / faulty        (already valid, untouched)
// Idempotent - safe to run more than once. Usage: `npm run migrate:batteries`.
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import Battery from "../models/Battery";

const STATUS_MAP: Record<string, string> = {
  in_store: "active",
  on_bus: "active",
  in_repair: "faulty",
};

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI || "");

  let moved = 0;
  for (const [from, to] of Object.entries(STATUS_MAP)) {
    const res = await Battery.updateMany({ status: from }, { status: to });
    if (res.modifiedCount) {
      console.log(`${from} -> ${to}: ${res.modifiedCount} battery(ies)`);
      moved += res.modifiedCount;
    }
  }
  console.log(`Remapped ${moved} battery(ies) to the new status set`);

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
