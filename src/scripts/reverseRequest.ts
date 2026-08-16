// Reverse a test/mistaken part request completely. Usage:
//   npx ts-node src/scripts/reverseRequest.ts <requestId> <itemNameGuard>
// The guard must appear in the request's item name (case-insensitive) or
// the script aborts, so a typoed id cannot nuke the wrong request.
// Reverses everything an approval wrote: restores the deducted stock,
// removes the stock movement and the booked expenditure, then deletes
// the request (its re-request lock dies with it).
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import PartRequest from "../models/PartRequest";
import InventoryItem from "../models/InventoryItem";
import StockMovement from "../models/StockMovement";
import Expenditure from "../models/Expenditure";

const run = async () => {
  const requestId = Number(process.argv[2]);
  const guard = process.argv[3] || "";
  if (!requestId || !guard) {
    console.log(
      "Usage: npx ts-node src/scripts/reverseRequest.ts <requestId> <itemNameGuard>",
    );
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || "");

  const request = await PartRequest.findOne({ requestId });
  if (!request) {
    console.log(`Request #${requestId} not found; nothing to do.`);
    await mongoose.disconnect();
    return;
  }
  if (!request.itemName.toLowerCase().includes(guard.toLowerCase())) {
    console.log(
      `Request #${requestId} is "${request.itemName}", which does not ` +
        `match the guard "${guard}". Aborting.`,
    );
    await mongoose.disconnect();
    process.exit(1);
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
  console.log(
    `Request #${request.requestId} deleted; its re-request lock is gone.`,
  );

  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
