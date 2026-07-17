import { UserRole } from "../interfaces/helper.interface";

// Access groups used by the routes. A route lists the lowest group
// that may call it; admin is in every group.
export const MANAGERS: UserRole[] = ["admin", "manager"];
export const FRONT_DESK: UserRole[] = ["admin", "manager", "cashier"];
export const STORE: UserRole[] = ["admin", "manager", "storekeeper"];
