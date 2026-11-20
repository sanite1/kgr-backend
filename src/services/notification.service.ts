import ApiResponse from "../errors/apiResponse";
import InventoryItem from "../models/InventoryItem";
import PartRequest from "../models/PartRequest";
import GatePass from "../models/GatePass";
import { effectiveAccess } from "../config/access";
import { scopeFilter } from "./gatePass.service";
import { IUser } from "../interfaces/user.interface";
import { UserRole } from "../interfaces/helper.interface";

// GET /api/notifications/counts: the bell's three numbers in one cheap
// call. Each count follows the same access rules as its own page, so a
// user who cannot open Requests or Gate Pass simply sees zero there.
export const getNotificationCountsService = async (user: IUser) => {
  const role = user.role as UserRole;
  const isSecurity = role === "security";
  const allowed = effectiveAccess(user);

  const gateFilter = scopeFilter({ id: String(user._id), role });
  const gateStatus = isSecurity ? "approved" : "pending";
  const gateBlocked =
    gateFilter.status?.$in && !gateFilter.status.$in.includes(gateStatus);

  const [lowStock, pending, gatePasses] = await Promise.all([
    isSecurity
      ? 0
      : InventoryItem.countDocuments({
          isActive: true,
          $expr: { $lte: ["$quantityOnHand", "$minLevel"] },
        }),
    isSecurity || !allowed.includes("requests")
      ? 0
      : PartRequest.countDocuments({ status: "pending" }),
    !allowed.includes("gate_pass") || gateBlocked
      ? 0
      : GatePass.countDocuments({ ...gateFilter, status: gateStatus }),
  ]);

  return new ApiResponse(200, "Counts retrieved successfully", {
    lowStock,
    pending,
    gatePasses,
  });
};
