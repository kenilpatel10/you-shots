import { z } from "zod";
import { promises as fs } from "node:fs";
import { STATE_FILE } from "../lib/paths";
import { writeJsonAtomic } from "../lib/fs";

const DEFAULT_PERSONA = "bolt-pip";

export const DRAFT_STATUSES = ["drafted", "approved", "rejected", "uploaded", "failed"] as const;
export type DraftStatus = (typeof DRAFT_STATUSES)[number];

const iso = z.string().datetime({ offset: true });

export const DraftSchema = z.object({
  id: z.string(),
  kind: z.enum(["short", "weekly"]).default("short"),
  topicId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  language: z.string().default("en"),
  persona: z.string().default("bolt-pip"),
  title: z.string(),
  status: z.enum(DRAFT_STATUSES),
  source: z.enum(["llm", "fallback"]).default("llm"),
  createdAt: iso,
  updatedAt: iso,
  durationSeconds: z.number().nonnegative().optional(),
  releaseTag: z.string().optional(),
  releaseUrl: z.string().url().optional(),
  /** GitHub API asset URLs (downloadable with the repo token) plus the public page link. */
  assets: z
    .object({
      video: z.string().url().optional(),
      videoPublic: z.string().url().optional(),
      script: z.string().url().optional(),
      audio: z.string().url().optional(),
      thumbnail: z.string().url().optional(),
      props: z.string().url().optional(),
    })
    .default({}),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  reviewerIssues: z.array(z.string()).default([]),
  rejectReason: z.string().optional(),
  approvedAt: iso.optional(),
  reminderSentAt: iso.optional(),
  telegramMessageId: z.number().optional(),
  youtubeVideoId: z.string().optional(),
  scheduledFor: iso.optional(),
  uploadedAt: iso.optional(),
  failureReason: z.string().optional(),
  /** For weekly compilations: the short draft IDs included, in order. */
  includes: z.array(z.string()).default([]),
});
export type Draft = z.infer<typeof DraftSchema>;

/** Per-language bookkeeping: each language is its own channel with its own topic history. */
export const LanguageStateSchema = z.object({
  usedTopicIds: z.array(z.string()).default([]),
  /** Topics the reviewer asked to regenerate (via /redo). Picked first on the next generate run. */
  redoTopicIds: z.array(z.string()).default([]),
  usedFallbackScripts: z.array(z.string()).default([]),
  /** ISO week keys that already have a weekly compilation draft. */
  weeklyCompiled: z.array(z.string()).default([]),
});
export type LanguageState = z.infer<typeof LanguageStateSchema>;

export const StateSchema = z.object({
  version: z.literal(3),
  /** Keyed by "persona/lang" (see channelKey). */
  perChannel: z.record(z.string(), LanguageStateSchema).default({}),
  drafts: z.array(DraftSchema).default([]),
  lastTelegramUpdateId: z.number().nullable().default(null),
  lastRuns: z
    .object({
      generate: iso.optional(),
      publish: iso.optional(),
      weekly: iso.optional(),
    })
    .default({}),
});
export type State = z.infer<typeof StateSchema>;

/** v1 kept one channel's topic history at the top level; v2 keyed it by language; v3 by persona/language. */
const StateV1Schema = z.object({
  version: z.literal(1),
  usedTopicIds: z.array(z.string()).default([]),
  redoTopicIds: z.array(z.string()).default([]),
  usedFallbackScripts: z.array(z.string()).default([]),
  drafts: z.array(DraftSchema).default([]),
  lastTelegramUpdateId: z.number().nullable().default(null),
  weeklyCompiled: z.array(z.string()).default([]),
  lastRuns: z
    .object({
      generate: iso.optional(),
      publish: iso.optional(),
      weekly: iso.optional(),
    })
    .default({}),
});

const StateV2Schema = z.object({
  version: z.literal(2),
  perLanguage: z.record(z.string(), LanguageStateSchema).default({}),
  drafts: z.array(DraftSchema).default([]),
  lastTelegramUpdateId: z.number().nullable().default(null),
  lastRuns: z.object({ generate: iso.optional(), publish: iso.optional(), weekly: iso.optional() }).default({}),
});

export function migrateState(raw: unknown): State {
  const version = (raw as { version?: number } | null)?.version;
  if (version === 1) {
    const v1 = StateV1Schema.parse(raw);
    const language = v1.drafts[0]?.language ?? "en";
    return migrateState({
      version: 2,
      perLanguage: { [language]: { usedTopicIds: v1.usedTopicIds, redoTopicIds: v1.redoTopicIds, usedFallbackScripts: v1.usedFallbackScripts, weeklyCompiled: v1.weeklyCompiled } },
      drafts: v1.drafts,
      lastTelegramUpdateId: v1.lastTelegramUpdateId,
      lastRuns: v1.lastRuns,
    });
  }
  if (version === 2) {
    const v2 = StateV2Schema.parse(raw);
    const perChannel = Object.fromEntries(Object.entries(v2.perLanguage).map(([lang, ls]) => [`${DEFAULT_PERSONA}/${lang}`, ls]));
    return StateSchema.parse({ version: 3, perChannel, drafts: v2.drafts, lastTelegramUpdateId: v2.lastTelegramUpdateId, lastRuns: v2.lastRuns });
  }
  return StateSchema.parse(raw);
}

export function emptyState(): State {
  return StateSchema.parse({ version: 3 });
}

const keyOf = (persona: string, language: string) => `${persona}/${language}`;

/** Bookkeeping for one channel (persona + language). */
export function langState(state: State, language: string, persona = DEFAULT_PERSONA): LanguageState {
  return state.perChannel[keyOf(persona, language)] ?? LanguageStateSchema.parse({});
}

export function withLangState(state: State, language: string, patch: Partial<LanguageState>, persona = DEFAULT_PERSONA): State {
  const k = keyOf(persona, language);
  return { ...state, perChannel: { ...state.perChannel, [k]: { ...langState(state, language, persona), ...patch } } };
}

export async function loadState(file = STATE_FILE): Promise<State> {
  try {
    const raw = JSON.parse(await fs.readFile(file, "utf8"));
    return migrateState(raw);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return emptyState();
    throw err;
  }
}

export async function saveState(state: State, file = STATE_FILE): Promise<void> {
  // Validate before writing so a bug never produces an unreadable state file.
  await writeJsonAtomic(file, StateSchema.parse(state));
}

/* ---------- pure transition helpers (unit-tested) ---------- */

const ALLOWED: Record<DraftStatus, DraftStatus[]> = {
  drafted: ["approved", "rejected", "failed"],
  approved: ["uploaded", "failed", "rejected"],
  rejected: [],
  uploaded: [],
  failed: ["approved", "rejected"],
};

export class TransitionError extends Error {}

export function findDraft(state: State, draftId: string): Draft | undefined {
  return state.drafts.find((d) => d.id === draftId);
}

export function transition(state: State, draftId: string, to: DraftStatus, patch: Partial<Draft> = {}, now = new Date()): State {
  const draft = findDraft(state, draftId);
  if (!draft) throw new TransitionError(`Unknown draft ${draftId}`);
  if (!ALLOWED[draft.status].includes(to)) {
    throw new TransitionError(`Draft ${draftId} cannot go from ${draft.status} to ${to}`);
  }
  const updated: Draft = {
    ...draft,
    ...patch,
    status: to,
    updatedAt: now.toISOString(),
  };
  if (to === "approved") updated.approvedAt = now.toISOString();
  if (to === "uploaded") updated.uploadedAt = now.toISOString();
  return {
    ...state,
    drafts: state.drafts.map((d) => (d.id === draftId ? updated : d)),
  };
}

export function upsertDraft(state: State, draft: Draft): State {
  const exists = state.drafts.some((d) => d.id === draft.id);
  return {
    ...state,
    drafts: exists ? state.drafts.map((d) => (d.id === draft.id ? draft : d)) : [...state.drafts, draft],
  };
}

export function draftsByStatus(state: State, status: DraftStatus, kind?: Draft["kind"]): Draft[] {
  return state.drafts.filter((d) => d.status === status && (kind === undefined || d.kind === kind));
}

export function draftForDate(state: State, date: string, kind: Draft["kind"] = "short", language?: string, persona?: string): Draft | undefined {
  return state.drafts.find((d) => d.kind === kind && d.date === date && d.status !== "rejected" && (language === undefined || d.language === language) && (persona === undefined || d.persona === persona));
}

/** Ids carry the channel (persona for non-default personas, then language) so channels never collide. */
export function makeDraftId(kind: Draft["kind"], date: string, topicId: string, language = "en", persona = DEFAULT_PERSONA): string {
  const ch = persona === DEFAULT_PERSONA ? language : `${persona}-${language}`;
  return kind === "short" ? `short-${date}-${ch}-${topicId}` : `weekly-${date}-${ch}`;
}
