import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";
import ApiError from "../errors/apiError";
import ChecklistEntry from "../models/ChecklistEntry";
import User from "../models/User";
import { dayString } from "../helpers/day";
import { UserRole } from "../interfaces/helper.interface";
import {
  ICreateChecklistEntry,
  IChecklistQuery,
  IChecklistDaysQuery,
  IChecklistCompareQuery,
  ICompareSide,
  CompareStatus,
  ChecklistKind,
  IChecklistEntry,
} from "../interfaces/checklist.interface";

// the "admin" kind is shown to users as the STAFF checklist; the value
// stays "admin" in the database so existing records are untouched
const SHEET_LABEL: Record<ChecklistKind, string> = {
  security: "security",
  admin: "staff",
};

// security writes the security list; everyone else writes the staff
// list; admins can write both. Keeping the two lists separate is the
// whole point - management compares them.
const assertCanWrite = (kind: ChecklistKind, role: UserRole): void => {
  if (role === "admin") return;
  if (kind === "security" && role !== "security") {
    throw new ApiError(403, "Only security can fill the security checklist");
  }
  if (kind === "admin" && role === "security") {
    throw new ApiError(
      403,
      "Security fills the security checklist, not the staff one",
    );
  }
};

// POST /api/checklists: clear one bus for one session
export const createChecklistEntryService = async (
  payload: ICreateChecklistEntry,
  requester: { id: string; role: UserRole },
) => {
  assertCanWrite(payload.kind, requester.role);

  const date = dayString();
  const busName = payload.busName.trim().toUpperCase();

  // one clearance per bus per session per list per day
  const dupe = await ChecklistEntry.findOne({
    date,
    kind: payload.kind,
    busName,
    session: payload.session,
  });
  if (dupe) {
    throw new ApiError(
      409,
      `${busName} is already cleared for the ${payload.session} on today's ${SHEET_LABEL[payload.kind]} checklist`,
    );
  }

  const user = await User.findById(requester.id);
  const entry = await ChecklistEntry.create({
    date,
    kind: payload.kind,
    busName,
    session: payload.session,
    batteryName: payload.batteryName.trim().toUpperCase(),
    trips: payload.trips,
    addedBy: requester.id,
    addedByName: user ? `${user.firstName} ${user.lastName}`.trim() : "",
  });

  return new ApiResponse(
    201,
    `${busName} cleared for the ${payload.session}`,
    entry.toJSON(),
  );
};

// GET /api/checklists?kind=&date=: the day's sheet plus its totals.
// Everyone below management sees only their own list - security theirs,
// staff theirs. Only managers and admins read both and compare.
export const getChecklistService = async (
  query: IChecklistQuery,
  role: UserRole,
) => {
  if (role === "security" && query.kind !== "security") {
    throw new ApiError(403, "Security can only view the security checklist");
  }
  if (
    query.kind === "security" &&
    role !== "security" &&
    role !== "admin" &&
    role !== "manager"
  ) {
    throw new ApiError(
      403,
      "The security checklist is for security and management",
    );
  }
  const date = query.date || dayString();
  const entries = await ChecklistEntry.find({ date, kind: query.kind }).sort({
    createdAt: 1,
  });

  let morningTrips = 0;
  let eveningTrips = 0;
  let morningBuses = 0;
  let eveningBuses = 0;
  for (const e of entries) {
    if (e.session === "morning") {
      morningTrips += e.trips;
      morningBuses += 1;
    } else {
      eveningTrips += e.trips;
      eveningBuses += 1;
    }
  }

  const round = (n: number) => Math.round(n * 2) / 2;

  return new ApiResponse(200, "Checklist retrieved successfully", {
    date,
    kind: query.kind,
    entries: entries.map((e) => e.toJSON()),
    totals: {
      morningTrips: round(morningTrips),
      eveningTrips: round(eveningTrips),
      totalTrips: round(morningTrips + eveningTrips),
      morningBuses,
      eveningBuses,
    },
  });
};

// GET /api/checklists/compare?date=: the two lists laid side by side,
// matched by bus and session (managers only, enforced at the route).
// Both agree on battery and trips: match. Both wrote it, details differ:
// mismatch. Only one list has it: that list's "only" status.
export const getChecklistCompareService = async (
  query: IChecklistCompareQuery,
) => {
  const date = query.date || dayString();
  const entries = await ChecklistEntry.find({ date });

  const side = (e: IChecklistEntry): ICompareSide => ({
    batteryName: e.batteryName,
    trips: e.trips,
    addedByName: e.addedByName,
    createdAt: e.createdAt,
  });

  // people type the same thing differently: "A 2" and "a2", "Muh'd 12"
  // and "MUHD12". Matching ignores case, spaces and punctuation so only
  // real differences (usually the trips) surface. Display keeps what
  // was typed.
  const canon = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

  // one entry per bus per session per list per day (the dupe guard),
  // so a plain map per list is safe
  const security = new Map<string, ICompareSide>();
  const staff = new Map<string, ICompareSide>();
  const busLabel = new Map<string, string>(); // first spelling seen
  for (const e of entries) {
    const key = `${canon(e.busName)}|${e.session}`;
    if (!busLabel.has(key)) busLabel.set(key, e.busName);
    (e.kind === "security" ? security : staff).set(key, side(e));
  }

  const keys = [...new Set([...security.keys(), ...staff.keys()])];
  const rows = keys.map((key) => {
    const [canonBus, session] = key.split("|");
    const busName = busLabel.get(key) || canonBus;
    const sec = security.get(key) ?? null;
    const stf = staff.get(key) ?? null;
    let status: CompareStatus;
    if (sec && stf) {
      status =
        canon(sec.batteryName) === canon(stf.batteryName) &&
        sec.trips === stf.trips
          ? "match"
          : "mismatch";
    } else {
      status = sec ? "security_only" : "staff_only";
    }
    return { busName, session, security: sec, staff: stf, status };
  });

  // trouble reads first: red, then yellow, then green, buses in order
  const rank: Record<CompareStatus, number> = {
    mismatch: 0,
    security_only: 1,
    staff_only: 1,
    match: 2,
  };
  rows.sort(
    (a, b) =>
      rank[a.status] - rank[b.status] ||
      a.busName.localeCompare(b.busName, undefined, { numeric: true }) ||
      a.session.localeCompare(b.session),
  );

  const round = (n: number) => Math.round(n * 2) / 2;
  let securityTrips = 0;
  let staffTrips = 0;
  for (const row of rows) {
    securityTrips += row.security?.trips ?? 0;
    staffTrips += row.staff?.trips ?? 0;
  }

  return new ApiResponse(200, "Checklist comparison retrieved successfully", {
    date,
    rows,
    totals: {
      matched: rows.filter((r) => r.status === "match").length,
      mismatched: rows.filter((r) => r.status === "mismatch").length,
      securityOnly: rows.filter((r) => r.status === "security_only").length,
      staffOnly: rows.filter((r) => r.status === "staff_only").length,
      securityTrips: round(securityTrips),
      staffTrips: round(staffTrips),
    },
  });
};

// GET /api/checklists/days: past sheets per list, newest first (managers)
export const getChecklistDaysService = async (query: IChecklistDaysQuery) => {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));

  const groupStage = {
    $group: {
      _id: { date: "$date", kind: "$kind" },
      buses: { $sum: 1 },
      morningTrips: {
        $sum: {
          $cond: [{ $eq: ["$session", "morning"] }, "$trips", 0],
        },
      },
      eveningTrips: {
        $sum: {
          $cond: [{ $eq: ["$session", "evening"] }, "$trips", 0],
        },
      },
    },
  };

  const [days, countRows] = await Promise.all([
    ChecklistEntry.aggregate([
      groupStage,
      { $sort: { "_id.date": -1, "_id.kind": 1 } },
      { $skip: (page - 1) * pageSize },
      { $limit: pageSize },
    ]),
    ChecklistEntry.aggregate([groupStage, { $count: "n" }]),
  ]);

  const round = (n: number) => Math.round(n * 2) / 2;

  return PaginatedResponse.build(
    days.map((d: any) => ({
      date: d._id.date,
      kind: d._id.kind,
      buses: d.buses,
      morningTrips: round(d.morningTrips),
      eveningTrips: round(d.eveningTrips),
      totalTrips: round(d.morningTrips + d.eveningTrips),
    })),
    countRows[0]?.n ?? 0,
    page,
    pageSize,
    "Checklist days retrieved successfully",
  );
};

// DELETE /api/checklists/:id: undo a same-day slip
export const deleteChecklistEntryService = async (
  id: string,
  requester: { id: string; role: UserRole },
) => {
  const entry = await ChecklistEntry.findById(id);
  if (!entry) throw new ApiError(404, "Entry not found");

  const isOwner = String(entry.addedBy) === requester.id;
  if (!isOwner && requester.role !== "admin") {
    throw new ApiError(403, "Only the person who added it can remove it");
  }
  if (entry.date !== dayString() && requester.role !== "admin") {
    throw new ApiError(400, "Past days can only be corrected by an admin");
  }

  await entry.deleteOne();
  return new ApiResponse(
    200,
    `${entry.busName} removed from the ${SHEET_LABEL[entry.kind]} checklist`,
    undefined,
  );
};
