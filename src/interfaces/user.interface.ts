import { Document, Types } from "mongoose";
import { UserRole } from "./helper.interface";

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  // per-user module overrides; absent = the role's default access
  access?: string[];
  lastLoginAt?: Date;
  createdBy?: Types.ObjectId; // absent on the seeded admin
  updatedBy?: Types.ObjectId; // last admin to edit the account
  createdAt?: Date;
  updatedAt?: Date;
}

// request/query DTOs

export interface ILoginRequest {
  email: string;
  password: string;
}

export interface IRefreshRequest {
  token: string;
}

export interface IChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ICreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  role?: UserRole;
  access?: string[]; // per-user module overrides; absent = role defaults
}

export interface IUpdateUserRequest {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
  access?: string[] | null; // null resets to role defaults
}

export interface IUsersQuery {
  page?: number;
  pageSize?: number;
  role?: string;
  isActive?: string;
  search?: string;
}
