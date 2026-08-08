import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";
import ApiError from "../errors/apiError";
import BatterySwap from "../models/BatterySwap";
import Battery from "../models/Battery";
import BatteryMovement from "../models/BatteryMovement";
import Bus from "../models/Bus";
import User from "../models/User";
import { nextSequence } from "../helpers/sequence";
import { dayString } from "../helpers/day";
import {
  ICreateBatterySwap,
  IBatterySwapsQuery,
} from "../interfaces/batterySwap.interface";

const SWAP_ID_START = Number(process.env.SWAP_ID_START) || 1;

// POST /api/battery-swaps: record a swap. Which battery sits on which
// bus is no longer kept in a registry; it comes from checklist and
// receipt sightings. So a swap only checks what it can truly know: the
// packs exist, they are different, and the supplied one is usable.
export const createSwapService = async (
  payload: ICreateBatterySwap,
  byId: string,
) => {
  const bus = await Bus.findById(payload.busId);
  if (!bus) throw new ApiError(404, "Bus not found");
  if (!bus.isActive) {
    throw new ApiError(400, `Bus ${bus.number} is deactivated`);
  }

  if (payload.initialBatteryId === payload.suppliedBatteryId) {
    throw new ApiError(
      400,
      "The initial and supplied battery cannot be the same pack",
    );
  }

  const [initial, supplied] = await Promise.all([
    Battery.findById(payload.initialBatteryId),
    Battery.findById(payload.suppliedBatteryId),
  ]);
  if (!initial) throw new ApiError(404, "Initial battery not found");
  if (!supplied) throw new ApiError(404, "Supplied battery not found");

  // ---- the supplied pack must actually be available ----
  if (!supplied.isActive) {
    throw new ApiError(400, `${supplied.code} is retired and cannot be used`);
  }
  if (supplied.status === "faulty") {
    throw new ApiError(
      400,
      `${supplied.code} is marked faulty and cannot be supplied to a bus`,
    );
  }
  if (supplied.status === "not_in_use") {
    throw new ApiError(
      400,
      `${supplied.code} is marked not in use; change its status before supplying it`,
    );
  }
  const user = await User.findById(byId);
  const byName = user ? `${user.firstName} ${user.lastName}`.trim() : "";
  const swapId = await nextSequence("battery_swap_id", SWAP_ID_START);

  // the movement log keeps each pack's story readable
  await BatteryMovement.create([
    {
      battery: initial._id,
      batteryCode: initial.code,
      action: "collect",
      fromStatus: initial.status,
      toStatus: initial.status,
      bus: bus._id,
      busNumber: bus.number,
      note: `Swap #${swapId}: replaced by ${supplied.code}`,
      by: byId,
    },
    {
      battery: supplied._id,
      batteryCode: supplied.code,
      action: "issue",
      fromStatus: supplied.status,
      toStatus: supplied.status,
      bus: bus._id,
      busNumber: bus.number,
      note: `Swap #${swapId}: replacing ${initial.code}`,
      by: byId,
    },
  ]);

  const swap = await BatterySwap.create({
    swapId,
    date: dayString(),
    bus: bus._id,
    busNumber: bus.number,
    initialBattery: initial._id,
    initialBatteryCode: initial.code,
    suppliedBattery: supplied._id,
    suppliedBatteryCode: supplied.code,
    tripsAdded: payload.tripsAdded,
    note: payload.note || "",
    by: byId,
    byName,
  });

  return new ApiResponse(
    201,
    `Swap #${swapId}: ${supplied.code} onto ${bus.number}, ${initial.code} off`,
    swap.toJSON(),
  );
};

// GET /api/battery-swaps
export const getSwapsService = async (query: IBatterySwapsQuery) => {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  const filter: Record<string, any> = {};
  if (query.date) filter.date = query.date;
  if (query.busId) filter.bus = query.busId;
  if (query.search) {
    const pattern = new RegExp(
      query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    filter.$or = [
      { busNumber: pattern },
      { initialBatteryCode: pattern },
      { suppliedBatteryCode: pattern },
    ];
  }

  const [swaps, totalItems] = await Promise.all([
    BatterySwap.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("by", "firstName lastName"),
    BatterySwap.countDocuments(filter),
  ]);

  return PaginatedResponse.build(
    swaps.map((s) => s.toJSON()),
    totalItems,
    page,
    pageSize,
    "Swaps retrieved successfully",
  );
};
