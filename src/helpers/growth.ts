// The Growth Planner's sum, shared by the Goal Tracker: a daily amount
// becomes a monthly deposit (x 365.25 / 12), the deposit lands first,
// then the whole month earns rate / 12.

export const DAYS_PER_MONTH = 365.25 / 12;
export const money = (n: number) => Math.round(n * 100) / 100;

export const monthlyFromDaily = (daily: number) => daily * DAYS_PER_MONTH;

// balance after `months` whole months, starting from `opening`
export const planBalance = (
  opening: number,
  monthly: number,
  ratePct: number,
  months: number,
): number => {
  const r = ratePct / 100 / 12;
  let b = opening;
  for (let i = 0; i < months; i += 1) b = (b + monthly) * (1 + r);
  return b;
};

// balance the plan expects after a fractional number of months: whole
// months compound, the part-month just collects its deposits
export const planBalanceAt = (
  monthly: number,
  ratePct: number,
  monthsElapsed: number,
  totalMonths: number,
): number => {
  const capped = Math.min(Math.max(0, monthsElapsed), totalMonths);
  const whole = Math.floor(capped);
  const frac = capped - whole;
  return planBalance(0, monthly, ratePct, whole) + monthly * frac;
};

// the monthly deposit that still reaches `target` from `opening` in
// `months` months at this rate. The annuity factor is for deposit-first
// compounding; at a zero rate it is simply the count of months.
export const monthlyNeeded = (
  opening: number,
  target: number,
  ratePct: number,
  months: number,
): number => {
  if (months <= 0) return Math.max(0, target - opening);
  const r = ratePct / 100 / 12;
  const grown = opening * Math.pow(1 + r, months);
  const factor =
    r === 0 ? months : ((Math.pow(1 + r, months) - 1) / r) * (1 + r);
  return Math.max(0, (target - grown) / factor);
};

// months until `target` is reached from `opening` at a given monthly
// deposit and rate; null when it never gets there within 50 years
export const monthsToReach = (
  opening: number,
  monthly: number,
  ratePct: number,
  target: number,
): number | null => {
  if (opening >= target) return 0;
  if (monthly <= 0 && ratePct <= 0) return null;
  const r = ratePct / 100 / 12;
  let b = opening;
  for (let m = 1; m <= 600; m += 1) {
    b = (b + monthly) * (1 + r);
    if (b >= target) return m;
  }
  return null;
};

export const addMonths = (iso: string, months: number): string => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
};

export const daysBetween = (fromIso: string, toIso: string): number =>
  Math.round(
    (new Date(`${toIso}T12:00:00Z`).getTime() -
      new Date(`${fromIso}T12:00:00Z`).getTime()) /
      86400000,
  );
