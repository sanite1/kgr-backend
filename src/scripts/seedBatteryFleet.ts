// One-time bulk registration of the named battery fleet from the paper
// exit form. Idempotent: existing packs (matched by code) are left untouched,
// only missing ones are created. Edit SERIES below to match your real roster,
// then run: `npm run seed:fleet`.
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import Battery from "../models/Battery";
import User from "../models/User";

// series name -> how many packs it has. Codes come out as "SUB 1", "KAM 30"...
const SERIES: { name: string; count: number }[] = [
  { name: "SUB", count: 40 },
  { name: "SODIUM", count: 2 },
  { name: "JAFAR", count: 17 },
  { name: "MUH'D", count: 15 },
  { name: "KAM", count: 30 },
  { name: "KAMILA", count: 20 },
];

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI || "");

  // packs need a createdBy; use the first admin as the owner of record
  const admin = await User.findOne({ role: "admin" }).sort({ createdAt: 1 });
  if (!admin) {
    console.error("No admin user found. Run seed:admin first.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const codes: string[] = [];
  for (const s of SERIES) {
    for (let i = 1; i <= s.count; i++)
      codes.push(`${s.name} ${i}`.toUpperCase());
  }

  let created = 0;
  for (const code of codes) {
    const existing = await Battery.findOne({ code });
    if (existing) continue;
    await Battery.create({
      code,
      status: "active",
      location: "main_yard",
      createdBy: admin._id,
    });
    created++;
  }

  console.log(
    `Fleet roster: ${codes.length} packs, ${created} newly created, ${
      codes.length - created
    } already present`,
  );

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
