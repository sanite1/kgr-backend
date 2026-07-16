import { Document } from "mongoose";
import { UserRole } from "./helper.interface";

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// ── request/query DTOs ──

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
  password: string;
  role?: UserRole;
}

export interface IUpdateUserRequest {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface IUsersQuery {
  page?: number;
  pageSize?: number;
  role?: string;
  isActive?: string;
  search?: string;
}
