import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";
import ApiError from "../errors/apiError";
import BatteryExitForm from "../models/BatteryExitForm";
import Battery from "../models/Battery";
import User from "../models/User";
import { nextSequence } from "../helpers/sequence";
import { dayString } from "../helpers/day";
import { BATTERY_LOCATIONS } from "../config/batteryLocations";
import {
  BatteryLocation,
  ExitCheck,
  BatteryStatus,
} from "../interfaces/helper.interface";
import { IBattery } from "../interfaces/battery.interface";
import {
  ICreateExitForm,
  IExitFormsQuery,
  IExitFormTotals,
} from "../interfaces/batteryExitForm.interface";

const FORM_ID_START = Number(process.env.EXIT_FORM_ID_START) || 1;

// pull the series label off a code: "SUB 12" -> "SUB", "MUH'D 3" -> "MUH'D"
export const seriesOf = (code: string): string =>
  code.replace(/[\s-]*\d+\s*$/, "").trim() || code;

// Each CHECK value drives how the pack is written back to the fleet.
// This is the single source of truth for the audit -> fleet mapping.
const applyCheck = (
  battery: IBattery,
  check: ExitCheck,
  location: BatteryLocation,
) => {
  battery.location = location;
  switch (check) {
    case "active":
      battery.status = "active";
      battery.needsCheck = false;
      battery.isActive = true;
      battery.retiredReason = undefined;
      break;
    case "faulty":
    case "bms": // burnt BMS is a faulty subtype; the audit counts it apart
      battery.status = "faulty";
      battery.needsCheck = false;
      battery.isActive = true;
      break;
    case "needs_check":
      battery.needsCheck = true;
      battery.isActive = true;
      break;
    case "out_of_use":
      battery.status = "not_in_use";
      battery.needsCheck = false;
      battery.isActive = true;
      break;
    case "sold":
      battery.isActive = false;
      battery.retiredReason = "sold";
      break;
  }
};

// GET /api/battery-forms/roster: the whole live fleet grouped by series, so
// the console can pre-fill a fresh form with each pack's current state.
export const getFleetRosterService = async () => {
  const batteries = await Battery.find({ isActive: true }).sort({ code: 1 });

  const groups: Record<
    string,
    {
      _id: string;
      code: string;
      status: BatteryStatus;
      location: BatteryLocation;
      needsCheck: boolean;
    }[]
  > = {};

  for (const b of batteries) {
    const series = seriesOf(b.code);
    (groups[series] ||= []).push({
      _id: String(b._id),
      code: b.code,
      status: b.status,
      location: b.location,
      needsCheck: b.needsCheck,
    });
  }

  const series = Object.keys(groups)
    .sort()
    .map((name) => ({ series: name, batteries: groups[name] }));

  return new ApiResponse(200, "Fleet roster retrieved successfully", {
    series,
    total: batteries.length,
    locations: BATTERY_LOCATIONS,
  });
};

// POST /api/battery-forms: submit a roll-call. Writes every pack back to the
// fleet, tallies the form, and stores it as a dated, reprintable record.
export const createExitFormService = async (
  payload: ICreateExitForm,
  issuedById: string,
) => {
  const issuer = await User.findById(issuedById);
  const issuedByName = issuer
    ? `${issuer.firstName} ${issuer.lastName}`.trim()
    : "";

  // load every referenced pack up front; reject if any is missing
  const ids = payload.rows.map((r) => r.batteryId);
  const batteries = await Battery.find({ _id: { $in: ids } });
  const byId = new Map(batteries.map((b) => [String(b._id), b]));

  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    throw new ApiError(400, `${missing.length} battery(ies) no longer exist`);
  }

  const totals: IExitFormTotals = {
    active: 0,
    faulty: 0,
    needsCheck: 0,
    outOfUse: 0,
    sold: 0,
    bms: 0,
  };
  const byLocation: Record<string, number> = {};
  const rows = [];

  for (const input of payload.rows) {
    const battery = byId.get(input.batteryId)!;
    applyCheck(battery, input.check, input.location);
    await battery.save();

    rows.push({
      battery: battery._id,
      code: battery.code,
      series: seriesOf(battery.code),
      check: input.check,
      location: input.location,
      note: input.note || "",
    });

    switch (input.check) {
      case "active":
        totals.active += 1;
        break;
      case "faulty":
        totals.faulty += 1;
        break;
      case "needs_check":
        totals.needsCheck += 1;
        break;
      case "out_of_use":
        totals.outOfUse += 1;
        break;
      case "sold":
        totals.sold += 1;
        break;
      case "bms":
        totals.bms += 1;
        break;
    }
    // sold packs have left the fleet, so they do not sit at any location
    if (input.check !== "sold") {
      byLocation[input.location] = (byLocation[input.location] || 0) + 1;
    }
  }

  const formId = await nextSequence("battery_exit_form_id", FORM_ID_START);
  const form = await BatteryExitForm.create({
    formId,
    date: payload.date || dayString(),
    issuedBy: issuedById,
    issuedByName,
    rows,
    totals,
    byLocation,
    comments: payload.comments || "",
  });

  return new ApiResponse(
    201,
    `Exit form #${formId} saved (${rows.length} packs)`,
    form.toJSON(),
  );
};

// GET /api/battery-forms
export const getExitFormsService = async (query: IExitFormsQuery) => {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  const filter: Record<string, any> = {};
  if (query.date) filter.date = query.date;
  if (query.search) {
    const term = query.search.trim();
    if (/^\d+$/.test(term)) filter.formId = Number(term);
    else
      filter.issuedByName = new RegExp(
        term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i",
      );
  }

  const [forms, totalItems] = await Promise.all([
    BatteryExitForm.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .select("-rows") // list view stays light; rows load on detail
      .populate("issuedBy", "firstName lastName"),
    BatteryExitForm.countDocuments(filter),
  ]);

  return PaginatedResponse.build(
    forms.map((f) => f.toJSON()),
    totalItems,
    page,
    pageSize,
    "Exit forms retrieved successfully",
  );
};

// GET /api/battery-forms/:id
export const getExitFormService = async (id: string) => {
  const form = await BatteryExitForm.findById(id).populate(
    "issuedBy",
    "firstName lastName",
  );
  if (!form) throw new ApiError(404, "Exit form not found");
  return new ApiResponse(
    200,
    "Exit form retrieved successfully",
    form.toJSON(),
  );
};
