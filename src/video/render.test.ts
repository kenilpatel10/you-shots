import { describe, expect, it } from "vitest";
import { parseConcurrency } from "./render";

describe("parseConcurrency", () => {
  it("accepts worker counts and percentages, rejects junk", () => {
    expect(parseConcurrency(undefined)).toBeNull();
    expect(parseConcurrency("4")).toBe(4);
    expect(parseConcurrency("50%")).toBe("50%");
    expect(parseConcurrency("abc")).toBeNull();
    expect(parseConcurrency("0")).toBeNull();
  });
});
