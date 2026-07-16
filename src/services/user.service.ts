import bcrypt from "bcrypt";
import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";
import ApiError from "../errors/apiError";
import User from "../models/User";
import {
  ICreateUserRequest,
  IUpdateUserRequest,
  IUsersQuery,
} from "../interfaces/user.interface";
import { sendWelcomeMail } from "./nodemailer/mail.service";

// POST /api/users — admin creates a staff/admin account (no public signup)
export const createUserService = async (payload: ICreateUserRequest) => {
  const existing = await User.findOne({ email: payload.email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, "A user with this email already exists");
  }

  const user = await User.create({
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email,
    password: await bcrypt.hash(payload.password, 10),
    role: payload.role || "staff",
  });

  // fire-and-forget — a failed email never breaks user creation
  void sendWelcomeMail(user);

  return new ApiResponse(201, "User created successfully", user.toJSON());
};

// GET /api/users — paginated, filterable list
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

// PATCH /api/users/:id — names, role, activation
export const updateUserService = async (
  id: string,
  payload: IUpdateUserRequest,
  actingUserId: string,
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

  if (payload.firstName !== undefined) user.firstName = payload.firstName;
  if (payload.lastName !== undefined) user.lastName = payload.lastName;
  if (payload.role !== undefined) user.role = payload.role;
  if (payload.isActive !== undefined) user.isActive = payload.isActive;
  await user.save();

  return new ApiResponse(200, "User updated successfully", user.toJSON());
};
