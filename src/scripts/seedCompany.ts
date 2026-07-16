// One-off: creates (or finds) the KGR company profile that receives public
// contact messages, and prints the ObjectId to put in the frontend's
// VITE_CONTACT_COMPANY_ID. Usage: npm run seed:company
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import Company from "../models/Company";

const run = async () => {
  const name = process.env.COMPANY_NAME || "KGR Partners Ltd";
  const email =
    process.env.COMPANY_NOTIFICATION_EMAIL || "info@kgrpartnersltd.com";

  await mongoose.connect(process.env.MONGODB_URI || "");

  let company = await Company.findOne({ name });
  if (company) {
    console.log(`Company already exists: ${name}`);
  } else {
    company = await Company.create({ name, email, isActive: true });
    console.log(`Company created: ${name} (notifications to ${email})`);
  }

  console.log("");
  console.log(`VITE_CONTACT_COMPANY_ID=${String(company._id)}`);
  console.log(
    "Set this in the frontend .env when pointing it at this backend.",
  );

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
