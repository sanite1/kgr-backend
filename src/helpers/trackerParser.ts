// Parses the raw daily tracker message the fleet operator sends. The text
// is typed by humans and forwarded through chat apps, so the parser is
// deliberately forgiving: extra whitespace, mixed case, ":" or "-" or "="
// after labels, Km/km/KM, commas in numbers, and date separators : - / .
// all parse. Anything it cannot read is reported as an issue, never thrown.

export interface ParsedTrackerRow {
  busNumber: string; // normalized, e.g. "A1", "HIJET 1"
  status: string; // as written, normalized to lowercase
  startTime: string; // HH:MM:SS ("" when unreadable)
  endTime: string;
  mileageKm: number; // 0 when unreadable
  issues: string[]; // human-readable problems with this block
}

export interface ParsedTrackerReport {
  date: string | null; // YYYY-MM-DD when a date was found in the header
  rows: ParsedTrackerRow[];
  issues: string[]; // report-level problems
}

// "A 1" / "a1" / "Bus A1" -> "A1"; "hijet 1" -> "HIJET 1"
export const normalizeBusNumber = (raw: string): string =>
  raw
    .replace(/^bus\s+/i, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ")
    // "A 1" style: join a single letter prefix to its number
    .replace(/^([A-Z])\s+(\d+)$/, "$1$2");

const TIME_RE = /(\d{1,2})\s*[:.]\s*(\d{1,2})(?:\s*[:.]\s*(\d{1,2}))?/;

const parseTime = (raw: string): string | null => {
  const m = raw.match(TIME_RE);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  const s = Number(m[3] ?? 0);
  if (h > 23 || min > 59 || s > 59) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(min)}:${pad(s)}`;
};

// "20:07:2026", "20-07-2026", "20/07/2026", "2026-07-20" -> "2026-07-20"
const parseReportDate = (text: string): string | null => {
  const head = text.slice(0, 400);
  const iso = head.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) {
    const [, y, mo, d] = iso;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const dmy = head.match(/(\d{1,2})\s*[:\-/.]\s*(\d{1,2})\s*[:\-/.]\s*(\d{4})/);
  if (dmy) {
    const [, d, mo, y] = dmy;
    const day = Number(d);
    const month = Number(mo);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  return null;
};

// value after a label like "Start Time:" / "start time -" / "Mileage ="
const fieldValue = (block: string, label: RegExp): string | null => {
  const re = new RegExp(label.source + String.raw`\s*[:\-=]?\s*(.+)`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : null;
};

export const parseTrackerReport = (text: string): ParsedTrackerReport => {
  const issues: string[] = [];
  const cleaned = text.replace(/\r/g, "");
  const date = parseReportDate(cleaned);
  if (!date) {
    issues.push("No date found in the header; today will be suggested instead");
  }

  // each block starts at a line beginning with "Bus <something>"
  const blockRe = /^[ \t]*bus[ \t]+(.+)$/gim;
  const starts: { index: number; busRaw: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(cleaned)) !== null) {
    starts.push({ index: m.index, busRaw: m[1] });
  }
  if (starts.length === 0) {
    issues.push('No bus blocks found. Each bus must start with "Bus A1"');
  }

  const rows: ParsedTrackerRow[] = [];
  for (let i = 0; i < starts.length; i++) {
    const block = cleaned.slice(
      starts[i].index,
      i + 1 < starts.length ? starts[i + 1].index : undefined,
    );
    const busNumber = normalizeBusNumber(starts[i].busRaw);
    const rowIssues: string[] = [];

    const statusRaw = fieldValue(block, /status/);
    const status = (statusRaw || "active").toLowerCase();
    if (!statusRaw) rowIssues.push("No status line; assumed active");

    const startRaw = fieldValue(block, /start\s*time/);
    const startTime = startRaw ? parseTime(startRaw) : null;
    if (!startTime) rowIssues.push("Start time missing or unreadable");

    const endRaw = fieldValue(block, /end\s*time/);
    const endTime = endRaw ? parseTime(endRaw) : null;
    if (!endTime) rowIssues.push("End time missing or unreadable");

    let mileageKm = 0;
    const mileageRaw = fieldValue(block, /mileage/);
    if (mileageRaw) {
      const num = mileageRaw.replace(/,/g, "").match(/[\d.]+/);
      if (num) mileageKm = Math.round(Number(num[0]) * 1000) / 1000;
    }
    if (!mileageRaw) rowIssues.push("Mileage line missing");

    rows.push({
      busNumber,
      status,
      startTime: startTime || "",
      endTime: endTime || "",
      mileageKm,
      issues: rowIssues,
    });
  }

  // duplicated bus blocks are almost always a paste mistake
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.busNumber)) {
      issues.push(`Bus ${row.busNumber} appears more than once`);
    }
    seen.add(row.busNumber);
  }

  return { date, rows, issues };
};
