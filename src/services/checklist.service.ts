import ApiResponse from "../errors/apiResponse";
import PaginatedResponse from "../errors/paginatedResponse";
import ApiError from "../errors/apiError";
import ChecklistEntry from "../models/ChecklistEntry";
import Receipt from "../models/Receipt";
import BatterySwap from "../models/BatterySwap";
import User from "../models/User";
import { dayString } from "../helpers/day";
import { UserRole } from "../interfaces/helper.interface";
import {
  ICreateChecklistEntry,
  IUpdateChecklistEntry,
  IChecklistQuery,
  IChecklistDaysQuery,
  IChecklistCompareQuery,
  ICompareSide,
  CompareStatus,
  ReceiptsCompareStatus,
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

// PATCH /api/checklists/:id (admin): correct a wrong battery or trip
// count without losing the original. Every change lands in the entry's
// own edit history, so what the gate first wrote is always recoverable.
export const updateChecklistEntryService = async (
  id: string,
  payload: IUpdateChecklistEntry,
  requester: { id: string; role: string },
) => {
  const entry = await ChecklistEntry.findById(id);
  if (!entry) throw new ApiError(404, "Entry not found");

  const nextBattery =
    payload.batteryName !== undefined
      ? payload.batteryName.trim().toUpperCase()
      : entry.batteryName;
  const nextTrips = payload.trips ?? entry.trips;
  if (nextBattery === entry.batteryName && nextTrips === entry.trips) {
    throw new ApiError(400, "Nothing changed");
  }
  if (!nextBattery) throw new ApiError(400, "Battery name cannot be empty");

  const user = await User.findById(requester.id);
  entry.edits.push({
    at: new Date(),
    by: requester.id as any,
    byName: user ? `${user.firstName} ${user.lastName}`.trim() : "",
    note: payload.note?.trim() || "",
    from: { batteryName: entry.batteryName, trips: entry.trips },
    to: { batteryName: nextBattery, trips: nextTrips },
  });
  entry.batteryName = nextBattery;
  entry.trips = nextTrips;
  await entry.save();

  return new ApiResponse(
    200,
    `${entry.busName} (${entry.session}) corrected`,
    entry.toJSON(),
  );
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
    _id: String(e._id),
    batteryName: e.batteryName,
    trips: e.trips,
    addedByName: e.addedByName,
    createdAt: e.createdAt,
    edits: e.edits ?? [],
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

// GET /api/checklists/compare-receipts?date=: both checklists against
// the day's receipts, per bus. The receipt says what the bus paid for
// (trips) and which battery it left with; the checklists say what the
// gate actually saw. Buses are matched forgivingly ("A 2" = "a2"), and
// a checklist battery that differs from the receipt is still fine when
// a recorded swap explains it.
export const getChecklistReceiptsCompareService = async (
  query: IChecklistCompareQuery,
) => {
  const date = query.date || dayString();
  const [entries, receipts, swaps] = await Promise.all([
    ChecklistEntry.find({ date }),
    Receipt.find({ date, status: { $ne: "void" } }).select(
      "billId busNumber batteryName expectedTrips",
    ),
    BatterySwap.find({ date }).select(
      "busNumber initialBatteryCode suppliedBatteryCode",
    ),
  ]);
  const canon = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const round = (n: number) => Math.round(n * 2) / 2;

  type SideEntry = {
    _id: string;
    session: string;
    batteryName: string;
    trips: number;
    edits: IChecklistEntry["edits"];
  };
  type Side = {
    batteries: string[];
    trips: number;
    sessions: string[];
    addedByNames: string[];
    entries: SideEntry[];
  };
  const security = new Map<string, Side>();
  const staff = new Map<string, Side>();
  const busLabel = new Map<string, string>();
  const sessionOrder = (a: string) => (a === "morning" ? 0 : 1);
  const ordered = [...entries].sort(
    (a, b) =>
      sessionOrder(a.session) - sessionOrder(b.session) ||
      (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0),
  );
  // one entry per session per list counts: a respelled duplicate ("A 21"
  // and "A21" in the same session) must not double the trips
  const seenSession = new Set<string>();
  for (const e of ordered) {
    const key = canon(e.busName);
    if (!busLabel.has(key)) busLabel.set(key, e.busName);
    const sessionKey = `${e.kind}|${key}|${e.session}`;
    if (seenSession.has(sessionKey)) continue;
    seenSession.add(sessionKey);
    const map = e.kind === "security" ? security : staff;
    const side = map.get(key) ?? {
      batteries: [],
      trips: 0,
      sessions: [],
      addedByNames: [],
      entries: [],
    };
    side.batteries.push(e.batteryName);
    side.trips += e.trips;
    side.sessions.push(e.session);
    side.entries.push({
      _id: String(e._id),
      session: e.session,
      batteryName: e.batteryName,
      trips: e.trips,
      edits: e.edits ?? [],
    });
    if (e.addedByName && !side.addedByNames.includes(e.addedByName)) {
      side.addedByNames.push(e.addedByName);
    }
    map.set(key, side);
  }

  const byReceipt = new Map<
    string,
    { bills: { billId: number; batteryName: string; trips: number }[] }
  >();
  for (const r of receipts) {
    const key = canon(r.busNumber);
    // the registered bus number is the cleanest label when we have it
    busLabel.set(key, r.busNumber);
    const rec = byReceipt.get(key) ?? { bills: [] };
    rec.bills.push({
      billId: r.billId,
      batteryName: r.batteryName,
      trips: r.expectedTrips,
    });
    byReceipt.set(key, rec);
  }

  // batteries a recorded swap put on (or took off) each bus today
  const swapBatteries = new Map<string, Set<string>>();
  for (const sw of swaps) {
    const key = canon(sw.busNumber);
    const set = swapBatteries.get(key) ?? new Set<string>();
    set.add(canon(sw.suppliedBatteryCode));
    set.add(canon(sw.initialBatteryCode));
    swapBatteries.set(key, set);
  }

  const keys = [
    ...new Set([...security.keys(), ...staff.keys(), ...byReceipt.keys()]),
  ];

  const rows = keys.map((key) => {
    const busName = busLabel.get(key) || key;
    const rec = byReceipt.get(key);
    const receipt = rec
      ? {
          bills: rec.bills,
          batteries: rec.bills.map((b) => b.batteryName).filter(Boolean),
          trips: round(rec.bills.reduce((s, b) => s + b.trips, 0)),
        }
      : null;
    const okBatteries = new Set<string>([
      ...(receipt?.batteries ?? []).map(canon),
      ...(swapBatteries.get(key) ?? []),
    ]);

    const judge = (side: Side | undefined) => {
      if (!side) return null;
      const batteryOk =
        !receipt || side.batteries.every((b) => okBatteries.has(canon(b)));
      const tripsVerdict: "ok" | "more" | "fewer" = !receipt
        ? "ok"
        : side.trips > receipt.trips
          ? "more"
          : side.trips < receipt.trips
            ? "fewer"
            : "ok";
      return { ...side, trips: round(side.trips), batteryOk, tripsVerdict };
    };
    const sec = judge(security.get(key));
    const stf = judge(staff.get(key));
    const sides = [sec, stf].filter(Boolean) as NonNullable<typeof sec>[];
    // "security logged 3, staff logged 2": only the lists that disagree
    const logged = (verdict: "more" | "fewer") =>
      [
        sec && sec.tripsVerdict === verdict
          ? `security logged ${sec.trips}`
          : "",
        stf && stf.tripsVerdict === verdict ? `staff logged ${stf.trips}` : "",
      ]
        .filter(Boolean)
        .join(", ");

    let status: ReceiptsCompareStatus;
    let note = "";
    if (!receipt) {
      status = "no_receipt";
      note = "Logged at the gate but the bus never got a receipt";
    } else if (sides.length === 0) {
      status = "not_on_checklist";
      note = `Receipt #${receipt.bills.map((b) => b.billId).join(", #")} but nobody logged the bus at the gate`;
    } else if (sides.some((x) => x.tripsVerdict === "more")) {
      status = "underpaid";
      note = `Paid for ${receipt.trips} trip(s); ${logged("more")}`;
    } else if (sides.some((x) => !x.batteryOk)) {
      status = "battery_differs";
      const who = [
        sec && !sec.batteryOk ? `security saw ${sec.batteries.join("/")}` : "",
        stf && !stf.batteryOk ? `staff saw ${stf.batteries.join("/")}` : "",
      ]
        .filter(Boolean)
        .join(", ");
      note = `Receipt battery ${receipt.batteries.join("/") || "-"}; ${who}`;
    } else if (sides.some((x) => x.tripsVerdict === "fewer")) {
      status = "fewer_trips";
      note = `Paid for ${receipt.trips} trip(s); ${logged("fewer")}`;
    } else {
      status = "match";
    }

    return { busName, security: sec, staff: stf, receipt, status, note };
  });

  // trouble reads first: money leaks, then unlogged and wrong packs,
  // then the day still in progress, then green
  const rank: Record<ReceiptsCompareStatus, number> = {
    no_receipt: 0,
    underpaid: 0,
    not_on_checklist: 1,
    battery_differs: 1,
    fewer_trips: 2,
    match: 3,
  };
  rows.sort(
    (a, b) =>
      rank[a.status] - rank[b.status] ||
      a.busName.localeCompare(b.busName, undefined, { numeric: true }),
  );

  const count = (st: ReceiptsCompareStatus) =>
    rows.filter((r) => r.status === st).length;
  return new ApiResponse(
    200,
    "Checklist vs receipts comparison retrieved successfully",
    {
      date,
      rows,
      totals: {
        matched: count("match"),
        underpaid: count("underpaid"),
        noReceipt: count("no_receipt"),
        notOnChecklist: count("not_on_checklist"),
        batteryDiffers: count("battery_differs"),
        fewerTrips: count("fewer_trips"),
        receiptTrips: round(
          rows.reduce((s, r) => s + (r.receipt?.trips ?? 0), 0),
        ),
        securityTrips: round(
          rows.reduce((s, r) => s + (r.security?.trips ?? 0), 0),
        ),
        staffTrips: round(rows.reduce((s, r) => s + (r.staff?.trips ?? 0), 0)),
      },
    },
  );
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
