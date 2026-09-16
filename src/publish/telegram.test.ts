import { describe, expect, it } from "vitest";
import { chunkMessage, isAuthorized, parseCommand, type TelegramUpdate } from "./telegram";

const upd = (chat: number, text: string): TelegramUpdate => ({ update_id: 1, message: { message_id: 1, text, chat: { id: chat, type: "private" } } });

describe("telegram commands", () => {
  it("parses approve/reject/redo/status/help", () => {
    expect(parseCommand("/approve short-2026-09-16-animals-001")).toEqual({ kind: "approve", draftId: "short-2026-09-16-animals-001" });
    expect(parseCommand("/reject short-1 too long and boring")).toEqual({ kind: "reject", draftId: "short-1", reason: "too long and boring" });
    expect(parseCommand("/reject short-1")).toEqual({ kind: "reject", draftId: "short-1", reason: "no reason given" });
    expect(parseCommand("/redo short-1")).toEqual({ kind: "redo", draftId: "short-1" });
    expect(parseCommand("/status")).toEqual({ kind: "status" });
    expect(parseCommand("/help")).toEqual({ kind: "help" });
    expect(parseCommand("  /APPROVE@BoltBot short-1 ")).toEqual({ kind: "approve", draftId: "short-1" });
  });

  it("ignores non-commands and malformed commands", () => {
    expect(parseCommand("hello")).toBeNull();
    expect(parseCommand(undefined)).toBeNull();
    expect(parseCommand("/approve")).toBeNull();
    expect(parseCommand("/dance")).toBeNull();
  });

  it("authorises only the configured chat id", () => {
    expect(isAuthorized(upd(12345, "/status"), "12345")).toBe(true);
    expect(isAuthorized(upd(12345, "/status"), " 12345 ")).toBe(true);
    expect(isAuthorized(upd(999, "/status"), "12345")).toBe(false);
    expect(isAuthorized({ update_id: 1 }, "12345")).toBe(false);
  });

  it("chunks long messages on line boundaries", () => {
    const text = Array.from({ length: 300 }, (_, i) => `line ${i} ${"x".repeat(30)}`).join("\n");
    const chunks = chunkMessage(text, 1000);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(1000);
    expect(chunks.join("\n")).toBe(text);
  });
});
