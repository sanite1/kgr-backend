import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import ApiResponse from "../errors/apiResponse";
import ApiError from "../errors/apiError";
import User from "../models/User";
import {
  IUser,
  ILoginRequest,
  IRefreshRequest,
  IChangePasswordRequest,
} from "../interfaces/user.interface";
import { sendPasswordChangedMail } from "./nodemailer/mail.service";

const JWT_SECRET = process.env.JWT_SECRET || "";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;
const ACCESS_EXPIRES = process.env.JWT_EXPIRES_IN || "15m";
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

const signAccessToken = (user: IUser): string =>
  jwt.sign(
    { id: String(user._id), role: user.role, type: "access" },
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES } as jwt.SignOptions,
  );

const signRefreshToken = (user: IUser): string =>
  jwt.sign({ id: String(user._id), type: "refresh" }, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES,
  } as jwt.SignOptions);

// POST /api/auth/login: email + password → user + token pair
export const loginService = async (payload: ILoginRequest) => {
  const user = await User.findOne({
    email: payload.email.toLowerCase(),
  }).select("+password");
  if (!user) throw new ApiError(401, "Invalid email or password");

  const passwordMatches = await bcrypt.compare(payload.password, user.password);
  if (!passwordMatches) throw new ApiError(401, "Invalid email or password");

  if (!user.isActive) {
    throw new ApiError(403, "Account is deactivated: contact an administrator");
  }

  user.lastLoginAt = new Date();
  await user.save();

  return new ApiResponse(200, "Login successful", {
    user: user.toJSON(),
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  });
};

// POST /api/auth/refresh: refresh token → new access token
export const refreshTokenService = async (payload: IRefreshRequest) => {
  const decoded = jwt.verify(payload.token, JWT_REFRESH_SECRET) as {
    id: string;
    type: string;
  };
  if (decoded.type !== "refresh") throw new ApiError(401, "Invalid token");

  const user = await User.findById(decoded.id);
  if (!user) throw new ApiError(401, "User no longer exists");
  if (!user.isActive) {
    throw new ApiError(403, "Account is deactivated: contact an administrator");
  }

  return new ApiResponse(200, "Token refreshed", {
    accessToken: signAccessToken(user),
  });
};

// GET /api/auth/me: the authenticated user
export const getMeService = async (user: IUser) => {
  return new ApiResponse(200, "User retrieved successfully", user.toJSON());
};

// POST /api/auth/change-password
export const changePasswordService = async (
  userId: string,
  payload: IChangePasswordRequest,
) => {
  const user = await User.findById(userId).select("+password");
  if (!user) throw new ApiError(404, "User not found");

  const passwordMatches = await bcrypt.compare(
    payload.currentPassword,
    user.password,
  );
  if (!passwordMatches)
    throw new ApiError(401, "Current password is incorrect");

  user.password = await bcrypt.hash(payload.newPassword, 10);
  await user.save();

  // security heads-up; fire-and-forget
  void sendPasswordChangedMail(user);

  return new ApiResponse(200, "Password changed successfully");
};
