import { Request, Response, NextFunction } from "express";
import ApiError from "../errors/apiError";
import { ModuleKey, effectiveAccess } from "../config/access";

// Grants the request when the user's effective access (per-user override
// or role defaults) includes ANY of the given modules. Admins always
// pass. Runs after isAuthenticated. Any-of semantics let shared
// endpoints serve every module that legitimately needs them.
export const requireAccess = (...modules: ModuleKey[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required"));
    }
    if (req.user.role === "admin") return next();
    const allowed = effectiveAccess(req.user);
    if (!modules.some((m) => allowed.includes(m))) {
      return next(
        new ApiError(403, "Your account does not have access to this area"),
      );
    }
    next();
  };
};
