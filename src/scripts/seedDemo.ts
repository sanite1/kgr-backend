// One-off: fills an empty database with demo buses, stock items and
// batteries so the console can be explored before real data exists.
// Refuses to run in production; collections that already have data
// are left untouched and skipped.
// Usage: `npm run seed:demo` (needs the seeded admin to exist).
import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import User from "../models/User";
import Bus from "../models/Bus";
import InventoryItem from "../models/InventoryItem";
import StockMovement from "../models/StockMovement";
import Battery from "../models/Battery";
import BatteryMovement from "../models/BatteryMovement";

const BUSES = [
  { number: "A 21", driverName: "Ibrahim Musa" },
  { number: "A 33", driverName: "Sani Bello" },
  { number: "A 37", driverName: "Yusuf Abdullahi" },
  { number: "A 40", driverName: "Aliyu Garba" },
  { number: "A 45", driverName: "Umar Suleiman" },
];

const ITEMS: {
  name: string;
  category: "part" | "battery" | "consumable";
  unit: string;
  quantityOnHand: number;
  unitCost: string;
  minLevel: number;
}[] = [
  {
    name: "Brake pads (set)",
    category: "part",
    unit: "pcs",
    quantityOnHand: 12,
    unitCost: "7500",
    minLevel: 4,
  },
  {
    name: "Tyre 165/70 R13",
    category: "part",
    unit: "pcs",
    quantityOnHand: 8,
    unitCost: "38000",
    minLevel: 4,
  },
  {
    name: "Wiper blades (pair)",
    category: "part",
    unit: "pcs",
    quantityOnHand: 10,
    unitCost: "3500",
    minLevel: 3,
  },
  {
    name: "Battery terminal clamp",
    category: "battery",
    unit: "pcs",
    quantityOnHand: 20,
    unitCost: "1200",
    minLevel: 6,
  },
  {
    name: "Battery charger fuse",
    category: "battery",
    unit: "pcs",
    quantityOnHand: 15,
    unitCost: "800",
    minLevel: 5,
  },
  {
    name: "Coolant",
    category: "consumable",
    unit: "litres",
    quantityOnHand: 24,
    unitCost: "2500",
    minLevel: 8,
  },
  {
    name: "Grease",
    category: "consumable",
    unit: "tins",
    quantityOnHand: 6,
    unitCost: "4000",
    minLevel: 2,
  },
];

const BATTERIES: {
  code: string;
  status: "active" | "charging" | "fully_charged" | "not_charged" | "faulty";
}[] = [
  { code: "BAT-001", status: "active" },
  { code: "BAT-002", status: "fully_charged" },
  { code: "BAT-003", status: "charging" },
  { code: "BAT-004", status: "charging" },
  { code: "BAT-005", status: "not_charged" },
  { code: "BAT-006", status: "faulty" },
];

const run = async () => {
  if (process.env.NODE_ENV === "production") {
    console.error("seed:demo refuses to run in production.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || "");

  const admin = await User.findOne({ role: "admin" }).sort({ createdAt: 1 });
  if (!admin) {
    console.error("No admin user found. Run `npm run seed:admin` first.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const [busCount, itemCount, batteryCount] = await Promise.all([
    Bus.countDocuments(),
    InventoryItem.countDocuments(),
    Battery.countDocuments(),
  ]);

  if (busCount) {
    console.log(`Buses: ${busCount} already exist, skipping.`);
  } else {
    for (const bus of BUSES) {
      await Bus.create({ ...bus, createdBy: admin._id });
    }
    console.log(`Created ${BUSES.length} buses`);
  }

  if (itemCount) {
    console.log(`Stock items: ${itemCount} already exist, skipping.`);
  } else {
    for (const item of ITEMS) {
      const doc = await InventoryItem.create({ ...item, createdBy: admin._id });
      if (item.quantityOnHand > 0) {
        await StockMovement.create({
          item: doc._id,
          type: "in",
          quantity: item.quantityOnHand,
          balanceAfter: item.quantityOnHand,
          note: "Opening stock (demo seed)",
          by: admin._id,
        });
      }
    }
    console.log(`Created ${ITEMS.length} stock items`);
  }

  if (batteryCount) {
    console.log(`Batteries: ${batteryCount} already exist, skipping.`);
  } else {
    for (const battery of BATTERIES) {
      const doc = await Battery.create({ ...battery, createdBy: admin._id });
      await BatteryMovement.create({
        battery: doc._id,
        batteryCode: doc.code,
        action: "status",
        fromStatus: battery.status,
        toStatus: battery.status,
        note: "Battery registered (demo seed)",
        by: admin._id,
      });
    }
    console.log(`Created ${BATTERIES.length} batteries`);
  }

  console.log(
    "Demo data ready. Receipts, requests and repairs are yours to make.",
  );
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
