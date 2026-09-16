import { describe, expect, it } from "vitest";
import { addDays, isoWeekKey, offsetMinutes, todayInZone, ymdInZone, zonedTimeToUtc } from "./time";

describe("time helpers", () => {
  it("converts Kolkata wall clock to UTC (fixed offset)", () => {
    const d = zonedTimeToUtc({ year: 2026, month: 3, day: 10 }, 17, 0, "Asia/Kolkata");
    expect(d.toISOString()).toBe("2026-03-10T11:30:00.000Z");
  });

  it("handles DST in New York on both sides of the switch", () => {
    const before = zonedTimeToUtc({ year: 2026, month: 3, day: 7 }, 17, 0, "America/New_York");
    const after = zonedTimeToUtc({ year: 2026, month: 3, day: 9 }, 17, 0, "America/New_York");
    expect(before.toISOString()).toBe("2026-03-07T22:00:00.000Z");
    expect(after.toISOString()).toBe("2026-03-09T21:00:00.000Z");
  });

  it("UTC round-trips", () => {
    const d = zonedTimeToUtc({ year: 2026, month: 1, day: 1 }, 0, 0, "UTC");
    expect(d.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(offsetMinutes(d, "UTC")).toBe(0);
  });

  it("computes the calendar date in a zone across midnight", () => {
    const instant = new Date("2026-05-01T20:30:00Z"); // 02:00 next day in Kolkata
    expect(ymdInZone(instant, "Asia/Kolkata")).toEqual({ year: 2026, month: 5, day: 2 });
    expect(todayInZone("Asia/Kolkata", instant)).toBe("2026-05-02");
    expect(todayInZone("America/Los_Angeles", instant)).toBe("2026-05-01");
  });

  it("adds days across month boundaries", () => {
    expect(addDays({ year: 2026, month: 1, day: 31 }, 1)).toEqual({ year: 2026, month: 2, day: 1 });
  });

  it("computes ISO week keys", () => {
    expect(isoWeekKey({ year: 2026, month: 1, day: 1 })).toBe("2026-W01");
    expect(isoWeekKey({ year: 2027, month: 1, day: 1 })).toBe("2026-W53");
  });
});
