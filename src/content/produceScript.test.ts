import { describe, expect, it } from "vitest";
import { lengthAdvice } from "./produceScript";
import { finishDescription } from "../config";

describe("lengthAdvice", () => {
  it("tells the writer how many words to cut or add", () => {
    expect(lengthAdvice("estimated length 62.3s (target 44–58s)", 2.3)).toMatch(/Too long.*Cut roughly 26 words.*aiming for 51 seconds/);
    expect(lengthAdvice("estimated length 40.0s (target 44–58s)", 2.7)).toMatch(/Too short.*Add roughly 30 words/);
    expect(lengthAdvice("banned words: मार", 2.3)).toBeNull();
  });
});

describe("finishDescription", () => {
  it("appends hashtags and the channel name once", () => {
    const d = finishDescription("Bolt explains waves.  ", { name: "Bolt & Pip", hashtags: ["#Shorts", "#kids"] });
    expect(d).toBe("Bolt explains waves.\n\n#Shorts #kids\nBolt & Pip");
  });
});
