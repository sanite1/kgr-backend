import { UserRole } from "../interfaces/helper.interface";

// Access groups used by the routes. A route lists the lowest group
// that may call it; admin is in every group.
export const MANAGERS: UserRole[] = ["admin", "manager"];
export const FRONT_DESK: UserRole[] = ["admin", "manager", "cashier"];
export const STORE: UserRole[] = ["admin", "manager", "storekeeper"];

// The two owner accounts, identified by email. Their role stays
// "admin", but nobody can delete them, change their role or disable
// them; only a super admin may edit a super admin at all.
export const SUPER_ADMIN_EMAILS = [
  "admin@kgrpartnersltd.com",
  "csanni52@gmail.com",
];

export const isSuperAdminEmail = (email?: string | null): boolean =>
  !!email && SUPER_ADMIN_EMAILS.includes(email.trim().toLowerCase());

// Accounts that opted out of broadcast notifications (the "needs your
// approval" fan-outs). Personal mail about their own account or their
// own requests still reaches them.
export const NOTIFICATION_MUTED_EMAILS = ["csanni52@gmail.com"];

export const isNotificationMuted = (email?: string | null): boolean =>
  !!email && NOTIFICATION_MUTED_EMAILS.includes(email.trim().toLowerCase());
