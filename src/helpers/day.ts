// Business days are Lagos days regardless of server timezone.
// en-CA locale formats as YYYY-MM-DD.
export const dayString = (d: Date = new Date()): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

export const lastNDays = (n: number): string[] => {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    days.push(dayString(new Date(Date.now() - i * 24 * 60 * 60 * 1000)));
  }
  return days;
};
