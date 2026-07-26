import { UserRole } from "../interfaces/helper.interface";
import { IUser } from "../interfaces/user.interface";

// Every toggleable console module. The dashboard is always available.
// Keys are stored on users and checked by requireAccess, so treat them
// as a public contract: never rename one without a migration.
export const ACCESS_MODULES = [
  { key: "generate", label: "Generate Receipt" },
  { key: "paypoint", label: "PayPoint" },
  { key: "nyp", label: "NYP List" },
  { key: "receipts", label: "Receipts" },
  { key: "daily_account", label: "Daily Account" },
  { key: "inventory", label: "Inventory" },
  { key: "warehouse", label: "Warehouse" },
  { key: "requests", label: "Requests" },
  { key: "batteries", label: "Batteries" },
  { key: "battery_form", label: "Battery Form" },
  { key: "battery_closing", label: "Battery Closing" },
  { key: "swaps", label: "Battery Swaps" },
  { key: "gate_pass", label: "Gate Pass" },
  { key: "purchases", label: "Purchases" },
  { key: "checklists", label: "Checklist" },
  { key: "repairs", label: "Repairs" },
  { key: "buses", label: "Buses" },
  { key: "tracker_report", label: "Tracker Report" },
  { key: "trip_price", label: "Trip Price" },
  { key: "reports", label: "Reports" },
  { key: "expenditures", label: "Expenditures" },
  { key: "conversions", label: "Conversions" },
  { key: "partnerships", label: "Partnerships" },
  { key: "users", label: "Users" },
] as const;

export type ModuleKey = (typeof ACCESS_MODULES)[number]["key"];

export const MODULE_KEYS: ModuleKey[] = ACCESS_MODULES.map((m) => m.key);

const EVERYONE: ModuleKey[] = [
  "requests",
  "battery_form",
  "battery_closing",
  "swaps",
  "gate_pass",
  "purchases",
  "checklists",
  "buses",
  "tracker_report",
];

// What each role gets until an admin customizes the individual user.
export const ROLE_DEFAULT_ACCESS: Record<UserRole, ModuleKey[]> = {
  staff: [...EVERYONE, "inventory", "warehouse"],
  cashier: [...EVERYONE, "generate", "paypoint", "nyp", "receipts"],
  storekeeper: [...EVERYONE, "inventory", "warehouse", "batteries", "repairs"],
  security: ["gate_pass", "checklists"], // the gate desk plus its tally
  manager: MODULE_KEYS.filter((k) => k !== "users"),
  admin: [...MODULE_KEYS],
};

// A user's actual module list: their per-user override when set,
// otherwise the role defaults. Admins always have everything.
export const effectiveAccess = (user: {
  role: UserRole;
  access?: IUser["access"];
}): ModuleKey[] => {
  if (user.role === "admin") return ROLE_DEFAULT_ACCESS.admin;
  if (Array.isArray(user.access)) {
    return user.access.filter((k): k is ModuleKey =>
      (MODULE_KEYS as string[]).includes(k),
    );
  }
  return ROLE_DEFAULT_ACCESS[user.role] ?? [];
};
