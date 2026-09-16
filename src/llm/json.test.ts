import { describe, expect, it } from "vitest";
import { z } from "zod";
import { extractJson, JsonParseError, parseWith } from "./json";

const S = z.object({ a: z.number(), b: z.string() });

describe("LLM JSON parsing", () => {
  it("parses plain JSON", () => expect(parseWith(S, '{"a":1,"b":"x"}')).toEqual({ a: 1, b: "x" }));
  it("strips markdown fences", () => expect(parseWith(S, 'Sure!\n```json\n{"a": 2, "b": "y"}\n```')).toEqual({ a: 2, b: "y" }));
  it("finds the object inside prose", () => expect(extractJson('Here you go: {"a":3,"b":"z"} hope that helps')).toEqual({ a: 3, b: "z" }));
  it("tolerates trailing commas", () => expect(extractJson('{"a":4,"b":"w",}')).toEqual({ a: 4, b: "w" }));
  it("fails loudly on schema mismatch", () => expect(() => parseWith(S, '{"a":"nope","b":1}')).toThrow(JsonParseError));
  it("fails loudly on no JSON", () => expect(() => extractJson("no json here")).toThrow(JsonParseError));
});
