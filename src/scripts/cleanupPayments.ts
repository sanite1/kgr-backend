// One-off repair for the duplicate-payment bug: keeps a single payment
// per receipt (the earliest) and removes the rest, then marks any
// receipt that has a payment as paid so it leaves the NYP list.
// Idempotent - safe to run more than once. Usage: `npm run cleanup:payments`.
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import Payment from "../models/Payment";
import Receipt from "../models/Receipt";

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI || "");

  // 1. dedupe payments: one per receipt, keep the earliest
  const dupes = await Payment.aggregate([
    { $group: { _id: "$receipt", count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);

  let removed = 0;
  for (const group of dupes) {
    const payments = await Payment.find({ receipt: group._id }).sort({
      createdAt: 1,
    });
    const extras = payments.slice(1).map((p) => p._id);
    const res = await Payment.deleteMany({ _id: { $in: extras } });
    removed += res.deletedCount || 0;
  }
  console.log(`Removed ${removed} duplicate payment(s)`);

  // 2. reconcile: a receipt with a payment must be marked paid
  const paidReceiptIds = await Payment.distinct("receipt");
  let fixed = 0;
  for (const rid of paidReceiptIds) {
    const receipt = await Receipt.findById(rid);
    if (!receipt || receipt.status !== "awaiting_payment") continue;
    const payment = await Payment.findOne({ receipt: rid }).sort({
      createdAt: 1,
    });
    receipt.status = "paid";
    receipt.paidAt = payment?.createdAt;
    receipt.paidBy = payment?.collectedBy as any;
    await receipt.save();
    fixed++;
  }
  console.log(`Marked ${fixed} receipt(s) paid to match their payment`);

  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
