import crypto from "crypto";
import bcrypt from "bcrypt";
import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";
import ApiError from "../errors/apiError";
import User from "../models/User";
import { isSuperAdminEmail } from "../config/roles";
import Receipt from "../models/Receipt";
import Payment from "../models/Payment";
import PartRequest from "../models/PartRequest";
import RepairJob from "../models/RepairJob";
import StockMovement from "../models/StockMovement";
import BatteryMovement from "../models/BatteryMovement";
import Bus from "../models/Bus";
import InventoryItem from "../models/InventoryItem";
import Battery from "../models/Battery";
import {
  ICreateUserRequest,
  IUpdateUserRequest,
  IUsersQuery,
} from "../interfaces/user.interface";
import {
  sendWelcomeMail,
  sendAccountStatusMail,
  sendRoleChangeMail,
} from "./nodemailer/mail.service";

// POST /api/users: admin creates a staff/admin account (no public signup)
// A starting password nobody has to type or share by hand: readable
// characters only (no 0/O or 1/l lookalikes), emailed to the new user.
const generatePassword = (): string => {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += alphabet[crypto.randomInt(alphabet.length)];
  }
  return out;
};

export const createUserService = async (
  payload: ICreateUserRequest,
  createdBy: string,
) => {
  const existing = await User.findOne({ email: payload.email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, "A user with this email already exists");
  }

  // the admin's chosen password wins; otherwise one is generated
  const password = payload.password || generatePassword();
  const user = await User.create({
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    password: await bcrypt.hash(password, 10),
    role: payload.role || "staff",
    access: payload.access,
    createdBy,
  });

  // fire-and-forget: a failed email never breaks user creation.
  // the generated plaintext goes only into this one email.
  void sendWelcomeMail(user, password);

  return new ApiResponse(201, "User created successfully", user.toJSON());
};

// GET /api/users: paginated, filterable list
export const getUsersService = async (query: IUsersQuery) => {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  const filter: Record<string, any> = {};
  if (query.role) filter.role = query.role;
  if (query.isActive === "true") filter.isActive = true;
  if (query.isActive === "false") filter.isActive = false;
  if (query.search) {
    const pattern = new RegExp(
      query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    filter.$or = [
      { firstName: pattern },
      { lastName: pattern },
      { email: pattern },
    ];
  }

  const [users, totalItems] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    User.countDocuments(filter),
  ]);

  return PaginatedResponse.build(
    users.map((u) => u.toJSON()),
    totalItems,
    page,
    pageSize,
    "Users retrieved successfully",
  );
};

// GET /api/users/:id
export const getUserService = async (id: string) => {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, "User not found");
  return new ApiResponse(200, "User retrieved successfully", user.toJSON());
};

// PATCH /api/users/:id: names, role, activation
export const updateUserService = async (
  id: string,
  payload: IUpdateUserRequest,
  actingUserId: string,
  actingEmail?: string,
) => {
  // an admin cannot deactivate or demote their own account
  if (
    id === actingUserId &&
    (payload.isActive === false || (payload.role && payload.role !== "admin"))
  ) {
    throw new ApiError(400, "You cannot deactivate or demote your own account");
  }

  const user = await User.findById(id);
  if (!user) throw new ApiError(404, "User not found");

  // the owner accounts are untouchable: only a super admin (or the
  // account itself) may edit one, and even then the role and active
  // status are locked
  if (isSuperAdminEmail(user.email)) {
    if (!isSuperAdminEmail(actingEmail) && id !== actingUserId) {
      throw new ApiError(
        403,
        "Only a super admin can edit a super admin account",
      );
    }
    if (payload.role && payload.role !== "admin") {
      throw new ApiError(403, "A super admin's role cannot be changed");
    }
    if (payload.isActive === false) {
      throw new ApiError(403, "A super admin account cannot be disabled");
    }
  }

  const previousRole = user.role;
  const previousActive = user.isActive;

  if (payload.firstName !== undefined) user.firstName = payload.firstName;
  if (payload.lastName !== undefined) user.lastName = payload.lastName;
  if (payload.role !== undefined) user.role = payload.role;
  if (payload.isActive !== undefined) user.isActive = payload.isActive;
  if (payload.access !== undefined) {
    // null clears the override so the role defaults apply again; the
    // super admins never carry overrides, they always have everything
    user.access =
      payload.access === null || isSuperAdminEmail(user.email)
        ? undefined
        : payload.access;
  }
  user.updatedBy = actingUserId as any;
  await user.save();

  // fire-and-forget notices for changes the person should hear about
  if (payload.isActive !== undefined && payload.isActive !== previousActive) {
    void sendAccountStatusMail(user);
  }
  if (payload.role !== undefined && payload.role !== previousRole) {
    void sendRoleChangeMail(user, previousRole);
  }

  return new ApiResponse(200, "User updated successfully", user.toJSON());
};

// Any operational footprint that names this user. If present, a hard
// delete would orphan the audit trail, so we refuse and steer to
// deactivation instead.
const hasActivity = async (userId: string): Promise<boolean> => {
  const checks = await Promise.all([
    Receipt.exists({ issuedBy: userId }),
    Payment.exists({ collectedBy: userId }),
    PartRequest.exists({ requestedBy: userId }),
    RepairJob.exists({ openedBy: userId }),
    StockMovement.exists({ by: userId }),
    BatteryMovement.exists({ by: userId }),
    Bus.exists({ createdBy: userId }),
    InventoryItem.exists({ createdBy: userId }),
    Battery.exists({ createdBy: userId }),
  ]);
  return checks.some(Boolean);
};

// DELETE /api/users/:id (admin). Only accounts with NO history can be
// hard-deleted; anyone who has acted in the system must be disabled so
// their records keep naming a real person.
export const deleteUserService = async (id: string, actingUserId: string) => {
  if (id === actingUserId) {
    throw new ApiError(400, "You cannot delete your own account");
  }

  const user = await User.findById(id);
  if (!user) throw new ApiError(404, "User not found");

  // the owner accounts can never be deleted, by anyone
  if (isSuperAdminEmail(user.email)) {
    throw new ApiError(403, "Super admin accounts cannot be deleted");
  }

  if (await hasActivity(id)) {
    throw new ApiError(
      400,
      "This user has activity on record. Disable the account instead so the history stays intact.",
    );
  }

  await user.deleteOne();
  return new ApiResponse(200, `${user.firstName} ${user.lastName} deleted`);
};
