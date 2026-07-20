// Shared string-literal unions, kept in sync by hand with schema enums.
export type UserRole =
  | "staff" // generic: view + raise part requests
  | "cashier" // front desk: issue receipts, check in, collect cash
  | "storekeeper" // store & workshop: stock, batteries, repairs
  | "manager" // approvals, voids, reports
  | "admin"; // everything, including users and trip price

export type ReceiptStatus = "awaiting_payment" | "paid" | "void";

export type ItemCategory =
  "part" | "battery" | "consumable" | "solar" | "conversion";

export type StockMovementType = "in" | "out" | "adjust";

export type RequestStatus = "pending" | "approved" | "declined";

export type BatteryStatus =
  | "active"
  | "faulty"
  | "charging"
  | "fully_charged"
  | "not_charged"
  | "not_in_use";

export type BatteryMoveAction = "issue" | "collect" | "status";

export type RepairStatus = "open" | "completed" | "cancelled";

export type ConversionStatus = "new" | "in_review" | "contacted" | "closed";
