import { describe, expect, it } from "vitest";
import { refreshTokenVar } from "./youtube";

describe("refreshTokenVar", () => {
  it("uses the plain secret for the default language and a suffixed one for others", () => {
    expect(refreshTokenVar()).toBe("YOUTUBE_REFRESH_TOKEN");
    expect(refreshTokenVar("en")).toBe("YOUTUBE_REFRESH_TOKEN");
    expect(refreshTokenVar("hi")).toBe("YOUTUBE_REFRESH_TOKEN_HI");
    expect(refreshTokenVar("pt-br")).toBe("YOUTUBE_REFRESH_TOKEN_PT_BR");
  });
});
