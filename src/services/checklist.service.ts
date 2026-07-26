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
  ChecklistKind,
} from "../interfaces/checklist.interface";

// security writes the security list; everyone else writes the admin
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
      "Security fills the security checklist, not the admin one",
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
      `${busName} is already cleared for the ${payload.session} on today's ${payload.kind} checklist`,
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
// Security only ever sees their own list; the admin list is not theirs
// to read - that separation is what makes the cross-check honest.
export const getChecklistService = async (
  query: IChecklistQuery,
  role: UserRole,
) => {
  if (role === "security" && query.kind !== "security") {
    throw new ApiError(403, "Security can only view the security checklist");
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
    `${entry.busName} removed from the ${entry.kind} checklist`,
    undefined,
  );
};
