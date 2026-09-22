#!/usr/bin/env node
/**
 * Three-way-ish merge of data/state.json for concurrent GitHub Actions jobs.
 *   node scripts/merge-state.mjs <ours.json> <theirs.json> <out.json>
 * Drafts are unioned by id (ours wins for ids present in both), per-channel bookkeeping arrays are
 * unioned, the Telegram offset and run timestamps take the max. Anything unknown comes from ours.
 */
import { readFileSync, writeFileSync } from "node:fs";

const [oursPath, theirsPath, outPath] = process.argv.slice(2);
if (!oursPath || !theirsPath || !outPath) {
  console.error("usage: merge-state.mjs <ours> <theirs> <out>");
  process.exit(2);
}
const ours = JSON.parse(readFileSync(oursPath, "utf8"));
const theirs = JSON.parse(readFileSync(theirsPath, "utf8"));
const union = (a = [], b = []) => Array.from(new Set([...(b ?? []), ...(a ?? [])]));

const drafts = new Map();
for (const d of theirs.drafts ?? []) drafts.set(d.id, d);
for (const d of ours.drafts ?? []) {
  const t = drafts.get(d.id);
  // Keep the newer record when both sides touched the same draft.
  drafts.set(d.id, t && new Date(t.updatedAt ?? 0) > new Date(d.updatedAt ?? 0) ? t : d);
}

const perChannel = {};
for (const key of new Set([...Object.keys(theirs.perChannel ?? {}), ...Object.keys(ours.perChannel ?? {})])) {
  const a = ours.perChannel?.[key] ?? {};
  const b = theirs.perChannel?.[key] ?? {};
  perChannel[key] = {
    usedTopicIds: union(a.usedTopicIds, b.usedTopicIds),
    redoTopicIds: union(a.redoTopicIds, b.redoTopicIds),
    usedFallbackScripts: union(a.usedFallbackScripts, b.usedFallbackScripts),
    weeklyCompiled: union(a.weeklyCompiled, b.weeklyCompiled),
  };
}

const lastRuns = {};
for (const k of new Set([...Object.keys(ours.lastRuns ?? {}), ...Object.keys(theirs.lastRuns ?? {})])) {
  const a = ours.lastRuns?.[k];
  const b = theirs.lastRuns?.[k];
  lastRuns[k] = !a ? b : !b ? a : a > b ? a : b;
}

const merged = {
  ...theirs,
  ...ours,
  version: ours.version ?? theirs.version,
  perChannel,
  drafts: Array.from(drafts.values()),
  lastTelegramUpdateId: Math.max(ours.lastTelegramUpdateId ?? -1, theirs.lastTelegramUpdateId ?? -1) === -1 ? null : Math.max(ours.lastTelegramUpdateId ?? -1, theirs.lastTelegramUpdateId ?? -1),
  lastRuns,
};
writeFileSync(outPath, JSON.stringify(merged, null, 2) + "\n");
console.log(`merged state: ${merged.drafts.length} drafts, ${Object.keys(perChannel).length} channels`);
