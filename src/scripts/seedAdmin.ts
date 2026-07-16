// One-off: creates the first admin account from ADMIN_* env vars.
// Usage: fill ADMIN_EMAIL / ADMIN_PASSWORD in .env, then `npm run seed:admin`.
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../models/User";

const run = async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env first.");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("ADMIN_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || "");

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.log(`Admin already exists: ${email}: nothing to do.`);
  } else {
    await User.create({
      firstName: process.env.ADMIN_FIRST_NAME || "KGR",
      lastName: process.env.ADMIN_LAST_NAME || "Admin",
      email,
      password: await bcrypt.hash(password, 10),
      role: "admin",
    });
    console.log(`Admin created: ${email}`);
  }

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
