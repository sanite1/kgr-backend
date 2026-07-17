import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";
import ApiError from "../errors/apiError";
import RepairJob from "../models/RepairJob";
import InventoryItem from "../models/InventoryItem";
import StockMovement from "../models/StockMovement";
import Battery from "../models/Battery";
import BatteryMovement from "../models/BatteryMovement";
import Bus from "../models/Bus";
import User from "../models/User";
import { nextSequence } from "../helpers/sequence";
import { alertIfLowStock } from "../helpers/lowStock";
import { inBackground } from "../helpers/background";
import { sendRepairClosedMail } from "./nodemailer/mail.service";
import {
  IRepairJob,
  ICreateRepairJob,
  ICompleteRepairJob,
  ICancelRepairJob,
  IRepairPartInput,
  IRepairJobsQuery,
} from "../interfaces/repair.interface";

const REPAIR_ID_START = Number(process.env.REPAIR_ID_START) || 500;

const money = (n: number) => String(Math.round(n * 100) / 100);

// Validates every requested line against live stock BEFORE any deduction,
// so a job never half-consumes its parts.
const checkStock = async (parts: IRepairPartInput[]) => {
  const lines: {
    item: any;
    quantity: number;
  }[] = [];
  for (const part of parts) {
    const item = await InventoryItem.findById(part.itemId);
    if (!item) throw new ApiError(404, "One of the parts no longer exists");
    if (!item.isActive) {
      throw new ApiError(400, `"${item.name}" is no longer stocked`);
    }
    if (item.quantityOnHand < part.quantity) {
      throw new ApiError(
        400,
        `Insufficient stock: only ${item.quantityOnHand} ${item.unit} of "${item.name}" left`,
      );
    }
    lines.push({ item, quantity: part.quantity });
  }
  return lines;
};

const sumParts = (parts: { amount: string }[]) =>
  parts.reduce((acc, p) => acc + Number(p.amount), 0);

// Emails whoever opened the job when someone else closes it.
// Fire-and-forget: lookup and send never block the response.
const notifyOpener = (job: IRepairJob, closedBy: string): void => {
  if (String(job.openedBy) === closedBy) return;
  inBackground(
    (async () => {
      const opener = await User.findById(job.openedBy);
      if (!opener?.email) return;
      await sendRepairClosedMail(opener.email, {
        name: opener.firstName,
        jobId: job.jobId,
        title: job.title,
        completed: job.status === "completed",
        totalCost: job.totalCost,
        note: job.closeNote || undefined,
      });
    })().catch(() => undefined),
  );
};

// POST /api/repairs
export const createRepairJobService = async (
  payload: ICreateRepairJob,
  openedBy: string,
) => {
  let bus = null;
  if (payload.busId) {
    bus = await Bus.findById(payload.busId);
    if (!bus) throw new ApiError(404, "Bus not found");
  }

  let battery = null;
  if (payload.batteryId) {
    battery = await Battery.findById(payload.batteryId);
    if (!battery) throw new ApiError(404, "Battery not found");
    if (battery.status === "on_bus") {
      throw new ApiError(
        400,
        `${battery.code} is on ${battery.busNumber}; collect it before opening a repair`,
      );
    }
    if (battery.status === "in_repair") {
      throw new ApiError(400, `${battery.code} is already in repair`);
    }
  }

  if (!bus && !battery) {
    throw new ApiError(400, "A repair needs a bus or a battery");
  }

  const stockLines = await checkStock(payload.parts || []);
  const jobId = await nextSequence("repair_job_id", REPAIR_ID_START);

  const partLines = stockLines.map(({ item, quantity }) => ({
    item: item._id,
    itemName: item.name,
    unit: item.unit,
    quantity,
    unitCost: item.unitCost,
    amount: money(quantity * Number(item.unitCost)),
  }));
  const partsCost = money(sumParts(partLines));

  const job = await RepairJob.create({
    jobId,
    title: payload.title.trim(),
    description: payload.description || "",
    bus: bus?._id,
    busNumber: bus?.number,
    battery: battery?._id,
    batteryCode: battery?.code,
    parts: partLines,
    partsCost,
    laborCost: "0",
    totalCost: partsCost,
    openedBy,
  });

  // deduct stock (pre-checked above) and leave the audit trail
  for (const { item, quantity } of stockLines) {
    const previousQuantity = item.quantityOnHand;
    item.quantityOnHand -= quantity;
    await item.save();
    await StockMovement.create({
      item: item._id,
      type: "out",
      quantity,
      balanceAfter: item.quantityOnHand,
      note: `Repair #${jobId}${bus ? ` for ${bus.number}` : ""}`,
      relatedRepair: job._id,
      by: openedBy,
    });
    alertIfLowStock(item, previousQuantity);
  }

  if (battery) {
    const fromStatus = battery.status;
    battery.status = "in_repair";
    await battery.save();
    await BatteryMovement.create({
      battery: battery._id,
      batteryCode: battery.code,
      action: "status",
      fromStatus,
      toStatus: "in_repair",
      note: `Repair #${jobId} opened`,
      by: openedBy,
    });
  }

  return new ApiResponse(201, `Repair #${jobId} opened`, job.toJSON());
};

// GET /api/repairs
export const getRepairJobsService = async (query: IRepairJobsQuery) => {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  const filter: Record<string, any> = {};
  if (query.status) filter.status = query.status;
  if (query.busId) filter.bus = query.busId;
  if (query.search) {
    const term = query.search.trim();
    const pattern = new RegExp(
      term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    const or: Record<string, any>[] = [
      { title: pattern },
      { busNumber: pattern },
      { batteryCode: pattern },
    ];
    if (/^\d+$/.test(term)) or.push({ jobId: Number(term) });
    filter.$or = or;
  }

  const [jobs, totalItems] = await Promise.all([
    RepairJob.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("openedBy closedBy", "firstName lastName"),
    RepairJob.countDocuments(filter),
  ]);

  return PaginatedResponse.build(
    jobs.map((j) => j.toJSON()),
    totalItems,
    page,
    pageSize,
    "Repair jobs retrieved successfully",
  );
};

// POST /api/repairs/:id/parts: add a part to an open job
export const addRepairPartService = async (
  id: string,
  payload: IRepairPartInput,
  by: string,
) => {
  const job = await RepairJob.findById(id);
  if (!job) throw new ApiError(404, "Repair job not found");
  if (job.status !== "open") {
    throw new ApiError(400, `Repair #${job.jobId} is ${job.status}`);
  }

  const [{ item, quantity }] = await checkStock([payload]);

  const previousQuantity = item.quantityOnHand;
  item.quantityOnHand -= quantity;
  await item.save();
  await StockMovement.create({
    item: item._id,
    type: "out",
    quantity,
    balanceAfter: item.quantityOnHand,
    note: `Repair #${job.jobId}${job.busNumber ? ` for ${job.busNumber}` : ""}`,
    relatedRepair: job._id,
    by,
  });
  alertIfLowStock(item, previousQuantity);

  job.parts.push({
    item: item._id,
    itemName: item.name,
    unit: item.unit,
    quantity,
    unitCost: item.unitCost,
    amount: money(quantity * Number(item.unitCost)),
  } as any);
  job.partsCost = money(sumParts(job.parts));
  job.totalCost = money(Number(job.partsCost) + Number(job.laborCost));
  await job.save();

  return new ApiResponse(
    200,
    `${item.name} added to repair #${job.jobId}`,
    job.toJSON(),
  );
};

// POST /api/repairs/:id/complete (admin): closes the job, prices the labor
export const completeRepairJobService = async (
  id: string,
  payload: ICompleteRepairJob,
  by: string,
) => {
  const job = await RepairJob.findById(id);
  if (!job) throw new ApiError(404, "Repair job not found");
  if (job.status !== "open") {
    throw new ApiError(400, `Repair #${job.jobId} is already ${job.status}`);
  }

  if (payload.laborCost !== undefined) job.laborCost = payload.laborCost;
  job.totalCost = money(Number(job.partsCost) + Number(job.laborCost));
  job.status = "completed";
  job.closedBy = by as any;
  job.closedAt = new Date();
  job.closeNote = payload.note || "";
  await job.save();

  notifyOpener(job, by);

  // a repaired battery goes back on the shelf
  if (job.battery) {
    const battery = await Battery.findById(job.battery);
    if (battery && battery.status === "in_repair") {
      battery.status = "in_store";
      await battery.save();
      await BatteryMovement.create({
        battery: battery._id,
        batteryCode: battery.code,
        action: "status",
        fromStatus: "in_repair",
        toStatus: "in_store",
        note: `Repair #${job.jobId} completed`,
        by,
      });
    }
  }

  return new ApiResponse(200, `Repair #${job.jobId} completed`, job.toJSON());
};

// POST /api/repairs/:id/cancel (admin): returns parts to stock
export const cancelRepairJobService = async (
  id: string,
  payload: ICancelRepairJob,
  by: string,
) => {
  const job = await RepairJob.findById(id);
  if (!job) throw new ApiError(404, "Repair job not found");
  if (job.status !== "open") {
    throw new ApiError(400, `Repair #${job.jobId} is already ${job.status}`);
  }

  for (const line of job.parts) {
    const item = await InventoryItem.findById(line.item);
    if (!item) continue; // item deleted since; nothing to restock
    item.quantityOnHand += line.quantity;
    await item.save();
    await StockMovement.create({
      item: item._id,
      type: "in",
      quantity: line.quantity,
      balanceAfter: item.quantityOnHand,
      note: `Repair #${job.jobId} cancelled; parts returned`,
      relatedRepair: job._id,
      by,
    });
  }

  job.status = "cancelled";
  job.closedBy = by as any;
  job.closedAt = new Date();
  job.closeNote = payload.note || "";
  await job.save();

  notifyOpener(job, by);

  // the fault was not fixed: the battery stays faulty, not "repaired"
  if (job.battery) {
    const battery = await Battery.findById(job.battery);
    if (battery && battery.status === "in_repair") {
      battery.status = "faulty";
      await battery.save();
      await BatteryMovement.create({
        battery: battery._id,
        batteryCode: battery.code,
        action: "status",
        fromStatus: "in_repair",
        toStatus: "faulty",
        note: `Repair #${job.jobId} cancelled`,
        by,
      });
    }
  }

  return new ApiResponse(200, `Repair #${job.jobId} cancelled`, job.toJSON());
};
