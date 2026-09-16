/**
 * Timezone helpers without external dependencies. Uses Intl, which Node ships with full ICU.
 */

export type YMD = { year: number; month: number; day: number };

function partsInZone(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map: Record<string, number> = {};
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== "literal") map[p.type] = Number(p.value);
  }
  return {
    year: map.year!,
    month: map.month!,
    day: map.day!,
    hour: map.hour! === 24 ? 0 : map.hour!,
    minute: map.minute!,
    second: map.second!,
  };
}

/** Offset (in minutes) of `timeZone` from UTC at the given instant. */
export function offsetMinutes(date: Date, timeZone: string): number {
  const p = partsInZone(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - date.getTime()) / 60_000);
}

/** Convert a wall-clock time in `timeZone` to a UTC Date. Handles DST by iterating the offset. */
export function zonedTimeToUtc(ymd: YMD, hour: number, minute: number, timeZone: string): Date {
  let guess = Date.UTC(ymd.year, ymd.month - 1, ymd.day, hour, minute, 0);
  for (let i = 0; i < 3; i++) {
    const off = offsetMinutes(new Date(guess), timeZone);
    const next = Date.UTC(ymd.year, ymd.month - 1, ymd.day, hour, minute, 0) - off * 60_000;
    if (next === guess) break;
    guess = next;
  }
  return new Date(guess);
}

/** Calendar date (in `timeZone`) of an instant. */
export function ymdInZone(date: Date, timeZone: string): YMD {
  const p = partsInZone(date, timeZone);
  return { year: p.year, month: p.month, day: p.day };
}

export function formatYmd(ymd: YMD): string {
  return `${ymd.year}-${String(ymd.month).padStart(2, "0")}-${String(ymd.day).padStart(2, "0")}`;
}

export function parseYmd(s: string): YMD {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) throw new Error(`Invalid date: ${s}`);
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

export function addDays(ymd: YMD, days: number): YMD {
  const d = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day + days));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function parseHm(hm: string): { hour: number; minute: number } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm);
  if (!m) throw new Error(`Invalid time "${hm}", expected HH:MM`);
  return { hour: Number(m[1]), minute: Number(m[2]) };
}

/** Today's date string (YYYY-MM-DD) in the channel timezone. */
export function todayInZone(timeZone: string, now = new Date()): string {
  return formatYmd(ymdInZone(now, timeZone));
}

/** ISO week key like 2026-W37 (ISO-8601 weeks, Monday start) for a date in a zone. */
export function isoWeekKey(ymd: YMD): string {
  const d = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function formatInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
