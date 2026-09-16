/** JSON Schemas sent to providers that support structured output (kept in sync with content/schema.ts). */
import { CATEGORIES, EXPRESSIONS, SECTION_KEYS } from "../schema";

export const SCRIPT_JSON_SCHEMA = {
  type: "object",
  properties: {
    topicId: { type: "string" },
    title: { type: "string" },
    hook: { type: "string" },
    answer: { type: "string" },
    wowFact: { type: "string" },
    experiment: { type: "string" },
    signOff: { type: "string" },
    onScreenText: {
      type: "object",
      properties: { hook: { type: "string" }, answer: { type: "string" }, wowFact: { type: "string" }, experiment: { type: "string" } },
      required: ["hook", "answer", "wowFact", "experiment"],
    },
    expressionCues: {
      type: "array",
      items: {
        type: "object",
        properties: { section: { type: "string", enum: [...SECTION_KEYS] }, expression: { type: "string", enum: [...EXPRESSIONS] } },
        required: ["section", "expression"],
      },
    },
    background: { type: "string", enum: [...CATEGORIES] },
    guess: {
      type: "object",
      properties: {
        prompt: { type: "string" },
        options: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
        answer: { type: "integer", enum: [0, 1, 2] },
      },
      required: ["prompt", "options", "answer"],
    },
    description: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
  },
  required: ["topicId", "title", "hook", "answer", "wowFact", "experiment", "signOff", "onScreenText", "expressionCues", "background", "guess", "description", "tags"],
};

export const REVIEW_JSON_SCHEMA = {
  type: "object",
  properties: {
    approved: { type: "boolean" },
    issues: { type: "array", items: { type: "string" } },
    fixedScript: SCRIPT_JSON_SCHEMA,
  },
  required: ["approved", "issues"],
};
