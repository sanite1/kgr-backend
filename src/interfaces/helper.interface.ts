// Shared string-literal unions, kept in sync by hand with schema enums.
export type UserRole = "staff" | "admin";

export type ReceiptStatus = "awaiting_payment" | "paid" | "void";

export type ItemCategory = "part" | "battery" | "consumable";

export type StockMovementType = "in" | "out" | "adjust";

export type RequestStatus = "pending" | "approved" | "declined";
