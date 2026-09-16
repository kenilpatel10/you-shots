/**
 * YouTube Data API v3 upload via googleapis (OAuth2 refresh token). Every upload is private +
 * scheduled (publishAt), self-declared made-for-kids, category Education, language set, with the
 * altered/synthetic content disclosure (status.containsSyntheticMedia — verified in googleapis
 * 160 typings) taken from config/channel.json.
 *
 * Quota (per Google's docs): videos.insert costs 1600 units, thumbnails.set 50; the default daily
 * quota is 10 000 units → about 6 uploads per day, far above our 1/day.
 */
import { createReadStream } from "node:fs";
import { google } from "googleapis";
import { env } from "../lib/env";
import { createLogger } from "../lib/logger";

const log = createLogger("youtube");

export const SCOPES = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube"];
export const LOCAL_REDIRECT = "http://localhost:5173/oauth2callback";

export function youtubeConfigured(): boolean {
  return Boolean(env("YOUTUBE_CLIENT_ID") && env("YOUTUBE_CLIENT_SECRET") && env("YOUTUBE_REFRESH_TOKEN"));
}

export function oauthClient(withRefresh = true) {
  const client = new google.auth.OAuth2(env("YOUTUBE_CLIENT_ID"), env("YOUTUBE_CLIENT_SECRET"), LOCAL_REDIRECT);
  if (withRefresh) client.setCredentials({ refresh_token: env("YOUTUBE_REFRESH_TOKEN") });
  return client;
}

export type UploadInput = {
  file: string;
  title: string;
  description: string;
  tags: string[];
  publishAt: Date;
  categoryId: string;
  language: string;
  containsSyntheticMedia: boolean;
  notifySubscribers: boolean;
};

export async function uploadVideo(input: UploadInput): Promise<{ videoId: string }> {
  const youtube = google.youtube({ version: "v3", auth: oauthClient() });
  log.info(`Uploading "${input.title}" scheduled for ${input.publishAt.toISOString()}`);
  const res = await youtube.videos.insert({
    part: ["snippet", "status"],
    notifySubscribers: input.notifySubscribers,
    requestBody: {
      snippet: {
        title: input.title.slice(0, 100),
        description: input.description.slice(0, 5000),
        tags: input.tags.slice(0, 30),
        categoryId: input.categoryId,
        defaultLanguage: input.language,
        defaultAudioLanguage: input.language,
      },
      status: {
        privacyStatus: "private",
        publishAt: input.publishAt.toISOString(),
        selfDeclaredMadeForKids: true,
        containsSyntheticMedia: input.containsSyntheticMedia,
        license: "youtube",
        embeddable: true,
      },
    },
    media: { mimeType: "video/mp4", body: createReadStream(input.file) },
  });
  const videoId = res.data.id;
  if (!videoId) throw new Error("YouTube did not return a video id");
  return { videoId };
}

export async function setThumbnail(videoId: string, file: string): Promise<void> {
  const youtube = google.youtube({ version: "v3", auth: oauthClient() });
  await youtube.thumbnails.set({ videoId, media: { mimeType: "image/png", body: createReadStream(file) } });
}

export type YoutubeErrorKind = "quota" | "auth" | "other";

/** Classify API failures so publish.ts can stop and tell the reviewer exactly what to fix. */
export function classifyYoutubeError(err: unknown): { kind: YoutubeErrorKind; fix: string; message: string } {
  const e = err as { code?: number | string; message?: string; errors?: { reason?: string }[]; response?: { data?: { error?: string | { errors?: { reason?: string }[] } } } };
  const message = String(e?.message ?? err);
  const reasons = [
    ...(e?.errors?.map((x) => x.reason) ?? []),
    ...(typeof e?.response?.data?.error === "object" ? (e.response.data.error.errors?.map((x) => x.reason) ?? []) : []),
  ].filter(Boolean);
  const text = `${message} ${reasons.join(" ")} ${typeof e?.response?.data?.error === "string" ? e.response.data.error : ""}`;
  if (/quotaExceeded|dailyLimitExceeded|rateLimitExceeded|uploadLimitExceeded/i.test(text)) {
    return { kind: "quota", message, fix: "YouTube API quota exhausted for today. The draft stays queued and will upload on a later run (quota resets at midnight Pacific time). If this keeps happening, request a quota increase in Google Cloud Console → APIs → YouTube Data API v3 → Quotas." };
  }
  if (/invalid_grant|invalid_client|unauthorized|401|Login Required|Token has been expired or revoked/i.test(text)) {
    return { kind: "auth", message, fix: "YouTube OAuth token is invalid or expired. Run `npm run auth:youtube` locally, copy the new YOUTUBE_REFRESH_TOKEN into GitHub Secrets. If tokens keep expiring after 7 days, publish the OAuth consent screen (docs/SETUP_YOUTUBE.md → 'Publishing status')." };
  }
  if (/youtubeSignupRequired/i.test(text)) {
    return { kind: "auth", message, fix: "The Google account has no YouTube channel. Create one at youtube.com, then re-run `npm run auth:youtube` with that account." };
  }
  return { kind: "other", message, fix: "Unexpected YouTube error — check the job log." };
}
