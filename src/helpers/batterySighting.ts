import ChecklistEntry from "../models/ChecklistEntry";
import Receipt from "../models/Receipt";
import { dayString } from "./day";

// The registry link (battery.bus) is gone: a pack's bus is now whatever
// humans last wrote down. The checklist and receipts both name a bus and
// a battery every working day, so the freshest of the two is the truth.

export const canonBattery = (s: string): string =>
  s.toUpperCase().replace(/[^A-Z0-9]/g, "");

export interface BatterySighting {
  busName: string;
  date: string;
  source: "checklist" | "receipt";
}

const SIGHTING_LOOKBACK_DAYS = 7;

// merge sightings, receipts first so a checklist row for the same day
// overwrites it: the checklist is an eyes-on sighting at the gate
const mergeSightings = (
  receipts: { batteryName: string; busNumber: string; date: string }[],
  checks: { batteryName: string; busName: string; date: string }[],
): Map<string, BatterySighting> => {
  const map = new Map<string, BatterySighting>();
  for (const r of receipts) {
    map.set(canonBattery(r.batteryName), {
      busName: r.busNumber,
      date: r.date,
      source: "receipt",
    });
  }
  for (const c of checks) {
    const key = canonBattery(c.batteryName);
    const prev = map.get(key);
    if (!prev || c.date >= prev.date) {
      map.set(key, {
        busName: c.busName,
        date: c.date,
        source: "checklist",
      });
    }
  }
  return map;
};

// canon(battery code) -> sighting on ONE specific day only. The
// attendance page uses this: "seen on A 32" there must mean seen on
// the day being viewed, not carried over from an earlier day.
export const sightingsOnDay = async (
  date: string,
): Promise<Map<string, BatterySighting>> => {
  const [receipts, checks] = await Promise.all([
    Receipt.find({
      date,
      status: { $ne: "void" },
      batteryName: { $nin: ["", null] },
    })
      .sort({ createdAt: 1 })
      .select("batteryName busNumber date"),
    ChecklistEntry.find({ date })
      .sort({ createdAt: 1 })
      .select("batteryName busName date"),
  ]);
  return mergeSightings(receipts, checks);
};

// canon(battery code) -> last place the pack was seen. On a same-day tie
// the checklist wins: it is an eyes-on sighting at the gate.
export const lastSightingsMap = async (): Promise<
  Map<string, BatterySighting>
> => {
  const today = dayString();
  const since = new Date(`${today}T12:00:00Z`);
  since.setDate(since.getDate() - SIGHTING_LOOKBACK_DAYS);
  const sinceDay = since.toISOString().slice(0, 10);

  const [receipts, checks] = await Promise.all([
    Receipt.find({
      date: { $gte: sinceDay, $lte: today },
      status: { $ne: "void" },
      batteryName: { $nin: ["", null] },
    })
      .sort({ date: 1, createdAt: 1 })
      .select("batteryName busNumber date"),
    ChecklistEntry.find({ date: { $gte: sinceDay, $lte: today } })
      .sort({ date: 1, createdAt: 1 })
      .select("batteryName busName date"),
  ]);
  return mergeSightings(receipts, checks);
};
