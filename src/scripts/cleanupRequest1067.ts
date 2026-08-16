// One-off cleanup: request #1067 (Anderson plug 175 A x 1) was a test
// approval. Delete it and reverse everything the approval wrote: put the
// stock back, remove the stock movement, remove the booked expenditure.
// The re-request lock dies with the request document itself.
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import PartRequest from "../models/PartRequest";
import InventoryItem from "../models/InventoryItem";
import StockMovement from "../models/StockMovement";
import Expenditure from "../models/Expenditure";

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI || "");

  const request = await PartRequest.findOne({ requestId: 1067 });
  if (!request) {
    console.log("Request #1067 not found; nothing to do.");
    await mongoose.disconnect();
    return;
  }
  if (!/anderson/i.test(request.itemName)) {
    console.log(
      `Request #1067 is "${request.itemName}", not the Anderson plug. Aborting.`,
    );
    await mongoose.disconnect();
    return;
  }
  console.log(
    `Found #${request.requestId}: ${request.itemName} x ${request.quantity} ` +
      `for ${request.busNumber}, status ${request.status}`,
  );

  if (request.status === "approved") {
    const item = await InventoryItem.findById(request.item);
    if (item) {
      item.quantityOnHand += request.quantity;
      await item.save();
      console.log(
        `Restored ${request.quantity} to "${item.name}" ` +
          `(now ${item.quantityOnHand} ${item.unit})`,
      );
    } else {
      console.log("Inventory item no longer exists; no stock to restore.");
    }
    const moves = await StockMovement.deleteMany({
      relatedRequest: request._id,
    });
    console.log(`Removed ${moves.deletedCount} stock movement(s).`);
  }

  const exp = await Expenditure.deleteMany({
    source: "part_request",
    sourceRef: request._id,
  });
  console.log(`Removed ${exp.deletedCount} expenditure record(s).`);

  await request.deleteOne();
  console.log("Request #1067 deleted; its re-request lock is gone with it.");

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
