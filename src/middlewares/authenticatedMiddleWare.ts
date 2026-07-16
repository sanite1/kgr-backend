import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import ApiError from "../errors/apiError";
import User from "../models/User";

const JWT_SECRET = process.env.JWT_SECRET || "";

interface AccessTokenPayload {
  id: string;
  role: string;
  type: string;
}

// Reads Authorization: Bearer <token>, verifies it, loads the user from the
// database (so deactivations and role changes take effect immediately) and
// attaches it as req.user. JWT errors bubble to the globalErrorHandler.
export const isAuthenticated = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw new ApiError(401, "Authentication required");
    }
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as AccessTokenPayload;
    if (decoded.type !== "access") {
      throw new ApiError(401, "Invalid token");
    }
    const user = await User.findById(decoded.id);
    if (!user) throw new ApiError(401, "User no longer exists");
    if (!user.isActive) throw new ApiError(403, "Account is deactivated");
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
