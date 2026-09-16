import { describe, expect, it } from "vitest";
import { nextFreeSlot } from "./schedule";

describe("publishAt slot scheduling", () => {
  it("uses today's slot when it is still comfortably ahead", () => {
    const slot = nextFreeSlot({ now: new Date("2026-09-16T05:00:00Z"), timezone: "Asia/Kolkata", uploadTime: "17:00", taken: [] });
    expect(slot.toISOString()).toBe("2026-09-16T11:30:00.000Z");
  });

  it("moves to tomorrow when today's slot is too close or past", () => {
    const slot = nextFreeSlot({ now: new Date("2026-09-16T11:15:00Z"), timezone: "Asia/Kolkata", uploadTime: "17:00", taken: [] });
    expect(slot.toISOString()).toBe("2026-09-17T11:30:00.000Z");
  });

  it("skips days that already have an upload (one Short per day)", () => {
    const slot = nextFreeSlot({
      now: new Date("2026-09-16T05:00:00Z"),
      timezone: "Asia/Kolkata",
      uploadTime: "17:00",
      taken: ["2026-09-16T11:30:00.000Z", "2026-09-17T11:30:00.000Z"],
    });
    expect(slot.toISOString()).toBe("2026-09-18T11:30:00.000Z");
  });

  it("respects DST in other timezones", () => {
    const before = nextFreeSlot({ now: new Date("2026-03-07T10:00:00Z"), timezone: "America/New_York", uploadTime: "17:00", taken: [] });
    const after = nextFreeSlot({ now: new Date("2026-03-09T10:00:00Z"), timezone: "America/New_York", uploadTime: "17:00", taken: [] });
    expect(before.toISOString()).toBe("2026-03-07T22:00:00.000Z");
    expect(after.toISOString()).toBe("2026-03-09T21:00:00.000Z");
  });

  it("treats 'taken' timestamps by their local day", () => {
    // 11:30Z on the 16th is 17:00 local on the 16th in Kolkata but 07:30 local in New York.
    const slot = nextFreeSlot({ now: new Date("2026-09-16T00:00:00Z"), timezone: "America/New_York", uploadTime: "17:00", taken: ["2026-09-16T11:30:00.000Z"] });
    expect(slot.toISOString()).toBe("2026-09-17T21:00:00.000Z");
  });
});
