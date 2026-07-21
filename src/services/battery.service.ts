import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";
import ApiError from "../errors/apiError";
import Battery from "../models/Battery";
import BatteryMovement from "../models/BatteryMovement";
import Bus from "../models/Bus";
import {
  ICreateBattery,
  IUpdateBattery,
  IIssueBattery,
  ICollectBattery,
  ISetBatteryStatus,
  IBatteriesQuery,
  IBatteryMovementsQuery,
} from "../interfaces/battery.interface";

const STATUS_LABEL: Record<string, string> = {
  active: "active",
  faulty: "faulty",
  charging: "charging",
  fully_charged: "fully charged",
  not_charged: "not charged",
  not_in_use: "not in use",
};

// POST /api/batteries (admin)
export const createBatteryService = async (
  payload: ICreateBattery,
  createdBy: string,
) => {
  const code = payload.code.trim().toUpperCase();

  const existing = await Battery.findOne({ code });
  if (existing) {
    throw new ApiError(409, `Battery "${code}" is already registered`);
  }

  const status = payload.status || "active";
  const battery = await Battery.create({
    code,
    status,
    notes: payload.notes || "",
    createdBy,
  });

  await BatteryMovement.create({
    battery: battery._id,
    batteryCode: battery.code,
    action: "status",
    fromStatus: status,
    toStatus: status,
    note: "Battery registered",
    by: createdBy,
  });

  return new ApiResponse(
    201,
    `Battery ${battery.code} registered`,
    battery.toJSON(),
  );
};

// GET /api/batteries
export const getBatteriesService = async (query: IBatteriesQuery) => {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  const filter: Record<string, any> = {};
  if (query.status) filter.status = query.status;
  if (query.busId) filter.bus = query.busId;
  if (query.isActive === "true") filter.isActive = true;
  if (query.isActive === "false") filter.isActive = false;
  if (query.search) {
    const pattern = new RegExp(
      query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    filter.$or = [{ code: pattern }, { busNumber: pattern }];
  }

  const [batteries, totalItems] = await Promise.all([
    Battery.find(filter)
      .sort({ code: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    Battery.countDocuments(filter),
  ]);

  return PaginatedResponse.build(
    batteries.map((b) => b.toJSON()),
    totalItems,
    page,
    pageSize,
    "Batteries retrieved successfully",
  );
};

// GET /api/batteries/summary: counts per status for the board header
export const getBatterySummaryService = async () => {
  const [rows, onBus] = await Promise.all([
    Battery.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    // bus assignment is tracked independently of status now
    Battery.countDocuments({ isActive: true, bus: { $ne: null } }),
  ]);

  const counts: Record<string, number> = {
    active: 0,
    faulty: 0,
    charging: 0,
    fully_charged: 0,
    not_charged: 0,
    not_in_use: 0,
  };
  let total = 0;
  for (const row of rows) {
    counts[row._id] = row.count;
    total += row.count;
  }

  return new ApiResponse(200, "Battery summary retrieved successfully", {
    counts,
    total,
    onBus,
  });
};

// PATCH /api/batteries/:id (admin)
export const updateBatteryService = async (
  id: string,
  payload: IUpdateBattery,
  by: string,
) => {
  const battery = await Battery.findById(id);
  if (!battery) throw new ApiError(404, "Battery not found");

  // notable edits land in the movement history with the editor's name
  const changes: string[] = [];

  if (payload.code !== undefined) {
    const code = payload.code.trim().toUpperCase();
    const clash = await Battery.findOne({ code, _id: { $ne: battery._id } });
    if (clash) throw new ApiError(409, `Battery "${code}" already exists`);
    if (code !== battery.code) {
      changes.push(`Relabelled ${battery.code} as ${code}`);
    }
    battery.code = code;
  }
  if (payload.notes !== undefined) battery.notes = payload.notes;
  if (payload.location !== undefined && payload.location !== battery.location) {
    changes.push(`Moved to ${payload.location.replace(/_/g, " ")}`);
    battery.location = payload.location;
  }
  if (payload.needsCheck !== undefined) battery.needsCheck = payload.needsCheck;
  if (payload.isActive !== undefined) {
    if (payload.isActive === false && battery.bus) {
      throw new ApiError(
        400,
        `${battery.code} is on ${battery.busNumber}; collect it before retiring`,
      );
    }
    if (payload.isActive !== battery.isActive) {
      changes.push(
        payload.isActive ? "Battery reactivated" : "Battery retired",
      );
    }
    battery.isActive = payload.isActive;
    // a reactivated pack is back in the fleet with no retire reason
    if (payload.isActive === true) battery.retiredReason = undefined;
  }
  if (payload.retiredReason !== undefined && battery.isActive === false) {
    battery.retiredReason = payload.retiredReason;
  }

  await battery.save();

  if (changes.length > 0) {
    await BatteryMovement.create({
      battery: battery._id,
      batteryCode: battery.code,
      action: "status",
      fromStatus: battery.status,
      toStatus: battery.status,
      note: changes.join("; "),
      by,
    });
  }
  return new ApiResponse(
    200,
    `Battery ${battery.code} updated`,
    battery.toJSON(),
  );
};

// POST /api/batteries/:id/issue: assign a battery to a bus.
// Bus assignment is tracked independently of status now, so issuing
// records which bus the pack is on without changing its state.
export const issueBatteryService = async (
  id: string,
  payload: IIssueBattery,
  by: string,
) => {
  const battery = await Battery.findById(id);
  if (!battery) throw new ApiError(404, "Battery not found");
  if (!battery.isActive) {
    throw new ApiError(400, `${battery.code} is retired`);
  }
  if (battery.bus) {
    throw new ApiError(
      400,
      `${battery.code} is already on ${battery.busNumber}`,
    );
  }
  if (battery.status === "faulty") {
    throw new ApiError(400, `${battery.code} is faulty and cannot be issued`);
  }

  const bus = await Bus.findById(payload.busId);
  if (!bus) throw new ApiError(404, "Bus not found");

  battery.bus = bus._id as any;
  battery.busNumber = bus.number;
  await battery.save();

  await BatteryMovement.create({
    battery: battery._id,
    batteryCode: battery.code,
    action: "issue",
    fromStatus: battery.status,
    toStatus: battery.status,
    bus: bus._id,
    busNumber: bus.number,
    note: payload.note || "",
    by,
  });

  return new ApiResponse(
    200,
    `${battery.code} issued to ${bus.number}`,
    battery.toJSON(),
  );
};

// POST /api/batteries/:id/collect: take a battery off its bus.
// Clears the bus only; the pack keeps its status until someone updates it.
export const collectBatteryService = async (
  id: string,
  payload: ICollectBattery,
  by: string,
) => {
  const battery = await Battery.findById(id);
  if (!battery) throw new ApiError(404, "Battery not found");
  if (!battery.bus) {
    throw new ApiError(400, `${battery.code} is not on a bus`);
  }

  const fromBus = battery.bus;
  const fromBusNumber = battery.busNumber;

  battery.bus = undefined;
  battery.busNumber = undefined;
  await battery.save();

  await BatteryMovement.create({
    battery: battery._id,
    batteryCode: battery.code,
    action: "collect",
    fromStatus: battery.status,
    toStatus: battery.status,
    bus: fromBus,
    busNumber: fromBusNumber,
    note: payload.note || "",
    by,
  });

  return new ApiResponse(
    200,
    `${battery.code} collected from ${fromBusNumber}`,
    battery.toJSON(),
  );
};

// POST /api/batteries/:id/status: set the pack's state
export const setBatteryStatusService = async (
  id: string,
  payload: ISetBatteryStatus,
  by: string,
) => {
  const battery = await Battery.findById(id);
  if (!battery) throw new ApiError(404, "Battery not found");
  if (battery.status === payload.to) {
    throw new ApiError(
      400,
      `${battery.code} is already ${STATUS_LABEL[payload.to]}`,
    );
  }

  const fromStatus = battery.status;
  battery.status = payload.to;
  await battery.save();

  await BatteryMovement.create({
    battery: battery._id,
    batteryCode: battery.code,
    action: "status",
    fromStatus,
    toStatus: payload.to,
    note: payload.note || "",
    by,
  });

  return new ApiResponse(
    200,
    `${battery.code} marked ${STATUS_LABEL[payload.to]}`,
    battery.toJSON(),
  );
};

// GET /api/batteries/:id/movements
export const getBatteryMovementsService = async (
  id: string,
  query: IBatteryMovementsQuery,
) => {
  const battery = await Battery.findById(id);
  if (!battery) throw new ApiError(404, "Battery not found");

  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  const [movements, totalItems] = await Promise.all([
    BatteryMovement.find({ battery: battery._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("by", "firstName lastName"),
    BatteryMovement.countDocuments({ battery: battery._id }),
  ]);

  return PaginatedResponse.build(
    movements.map((m) => m.toJSON()),
    totalItems,
    page,
    pageSize,
    "Battery movements retrieved successfully",
  );
};
