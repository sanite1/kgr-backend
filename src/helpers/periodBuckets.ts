import { dayString, lastNDays } from "./day";

// The dashboard charts zoom four ways. One helper decides the buckets
// so every chart agrees on what "this week" or "this month" means.

export type PeriodRange = "daily" | "weekly" | "monthly" | "yearly";

export interface PeriodBucket {
  key: string;
  label: string; // ready to print under the bar
  start: string; // YYYY-MM-DD inclusive
  end: string; // YYYY-MM-DD inclusive
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const iso = (d: Date) => d.toISOString().slice(0, 10);

export const normalizeRange = (raw: string): PeriodRange =>
  raw === "weekly" || raw === "monthly" || raw === "yearly" ? raw : "daily";

// earliest: the oldest date in the data, only used by the yearly view
export const buildPeriodBuckets = (
  rawRange: string,
  earliest?: string,
): { range: PeriodRange; buckets: PeriodBucket[] } => {
  const range = normalizeRange(rawRange);
  const today = dayString();
  const buckets: PeriodBucket[] = [];

  if (range === "weekly") {
    // eight weeks, each starting on Sunday like the daily view does
    const now = new Date(`${today}T12:00:00Z`);
    now.setUTCDate(now.getUTCDate() - now.getUTCDay());
    for (let i = 7; i >= 0; i -= 1) {
      const start = new Date(now);
      start.setUTCDate(start.getUTCDate() - i * 7);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 6);
      buckets.push({
        key: iso(start),
        label: `${start.getUTCDate()} ${MONTH_NAMES[start.getUTCMonth()]}`,
        start: iso(start),
        end: iso(end),
      });
    }
  } else if (range === "monthly") {
    const now = new Date(`${today}T12:00:00Z`);
    for (let i = 11; i >= 0; i -= 1) {
      const start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
      );
      const end = new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0),
      );
      buckets.push({
        key: iso(start).slice(0, 7),
        label: `${MONTH_NAMES[start.getUTCMonth()]} '${String(start.getUTCFullYear()).slice(2)}`,
        start: iso(start),
        end: iso(end),
      });
    }
  } else if (range === "yearly") {
    const thisYear = Number(today.slice(0, 4));
    const firstYear = earliest ? Number(earliest.slice(0, 4)) : thisYear;
    const from = Math.max(firstYear, thisYear - 5);
    for (let y = from; y <= thisYear; y += 1) {
      buckets.push({
        key: String(y),
        label: String(y),
        start: `${y}-01-01`,
        end: `${y}-12-31`,
      });
    }
  } else {
    const weekday = new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      timeZone: "UTC",
    });
    for (const d of lastNDays(7)) {
      buckets.push({
        key: d,
        label: weekday.format(new Date(`${d}T12:00:00Z`)),
        start: d,
        end: d,
      });
    }
  }

  return { range, buckets };
};

// which bucket a YYYY-MM-DD date falls in; undefined if outside them all
export const bucketKeyFor = (
  buckets: PeriodBucket[],
  date: string,
): string | undefined =>
  buckets.find((b) => date >= b.start && date <= b.end)?.key;
