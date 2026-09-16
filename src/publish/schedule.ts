/**
 * publishAt slot scheduling: one Short per day at the configured local time, never in the past,
 * skipping days that already have a scheduled upload. Pure, timezone-aware, unit-tested.
 */
import { addDays, formatYmd, parseHm, ymdInZone, zonedTimeToUtc } from "../lib/time";

export type SlotInput = {
  now: Date;
  timezone: string;
  /** HH:MM local time. */
  uploadTime: string;
  /** ISO timestamps already scheduled (any kind). */
  taken: string[];
  /** Minimum minutes between now and the slot (YouTube needs the time to process the upload). */
  minLeadMinutes?: number;
  /** Max days to search before giving up. */
  horizonDays?: number;
};

export function nextFreeSlot(input: SlotInput): Date {
  const { hour, minute } = parseHm(input.uploadTime);
  const lead = (input.minLeadMinutes ?? 30) * 60_000;
  const takenDays = new Set(input.taken.map((iso) => formatYmd(ymdInZone(new Date(iso), input.timezone))));
  let day = ymdInZone(input.now, input.timezone);
  for (let i = 0; i < (input.horizonDays ?? 400); i++) {
    const slot = zonedTimeToUtc(day, hour, minute, input.timezone);
    if (slot.getTime() >= input.now.getTime() + lead && !takenDays.has(formatYmd(day))) return slot;
    day = addDays(day, 1);
  }
  throw new Error("No free upload slot found");
}
