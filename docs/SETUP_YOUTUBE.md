# YouTube setup (OAuth + Data API v3)

Uploads use the YouTube Data API with an OAuth2 **refresh token** for your own channel. Every
video is uploaded **private + scheduled** (`publishAt`), marked **made for kids**, category
Education, with the language set. The pipeline never makes anything public directly: YouTube
flips it to public at the scheduled time.

Time needed: 15–20 minutes, once.

## 1. Create a Google Cloud project and enable the API

1. Open <https://console.cloud.google.com/> and sign in with the Google account that owns
   (or manages) the YouTube channel.
2. Top bar → project picker → **New project** → name it e.g. `bolt-shorts` → **Create**.
3. With that project selected: **APIs & Services → Library** → search **YouTube Data API v3**
   → **Enable**.

## 2. Configure the OAuth consent screen

1. **APIs & Services → OAuth consent screen** (may appear as *Google Auth Platform → Branding*).
2. User type **External** → **Create**.
3. App name `Bolt Shorts`, your email as support and developer contact → Save.
4. **Scopes**: add `https://www.googleapis.com/auth/youtube.upload` and
   `https://www.googleapis.com/auth/youtube` → Save.
5. **Test users**: add the Google account you will authorise with → Save.

### Publishing status — important (7-day token expiry)

While the consent screen is in **Testing**, refresh tokens expire after **7 days** and uploads
will start failing with `invalid_grant`. For personal use, switch it to **In production**:

Google now requires a public **homepage URL** and **privacy policy URL** on an authorised
domain before it lets an External app go to production. This repo ships both pages in
`docs/` (`index.html`, `privacy.html`) so GitHub Pages can host them for free:

1. GitHub → repo **Settings → Pages → Build and deployment**: Source *Deploy from a branch*,
   branch = your default branch, folder **/docs** → Save. Wait a minute, then check
   `https://<user>.github.io/<repo>/` and `https://<user>.github.io/<repo>/privacy.html`.
2. Google Auth Platform → **Branding**: App name `Bolt & Pip`, user support email, no logo,
   **Application home page** = the Pages URL, **Application privacy policy link** = the
   privacy URL, **Authorised domains** → add `<user>.github.io`, developer contact email → Save.
3. **Audience → Publish app → Confirm.**
4. Google shows a warning about verification. You do **not** need to submit for verification for
   your own use; the app simply shows an "unverified app" screen when *you* authorise it
   (click *Advanced → Go to Bolt & Pip (unsafe)*). Refresh tokens then last until revoked.

## 3. Create OAuth client credentials

1. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Application type **Web application**, name `bolt-shorts-local`.
3. **Authorised redirect URIs**: add exactly `http://localhost:5173/oauth2callback`.
4. **Create** → copy the **Client ID** and **Client secret** into `.env` as
   `YOUTUBE_CLIENT_ID` and `YOUTUBE_CLIENT_SECRET`.

## 4. Get the refresh token (local, once)

```bash
npm run auth:youtube
```

1. Open the printed URL, sign in with the channel's account, accept the scopes
   (through the "unverified app" warning if shown).
2. The browser lands on `localhost:5173`, and the terminal prints
   `YOUTUBE_REFRESH_TOKEN=…`.
3. Put it in `.env` and in GitHub Secrets. Never commit it.

If no refresh token is printed, revoke the app at <https://myaccount.google.com/permissions>
and run the command again (Google only issues a refresh token on the first consent).

## 5. GitHub Secrets

Repository **Settings → Secrets and variables → Actions**: `YOUTUBE_CLIENT_ID`,
`YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`.

## What the upload sets (and why)

| Field | Value | Reason |
| --- | --- | --- |
| `status.privacyStatus` | `private` | Nothing is public until the scheduled time. |
| `status.publishAt` | next free slot at `uploadTime` in `timezone` (config) | One Short per day; never in the past. |
| `status.selfDeclaredMadeForKids` | `true` | Required by COPPA/YouTube for content aimed at children. |
| `status.containsSyntheticMedia` | from `config/channel.json → youtube.containsSyntheticMedia` (default `true`) | YouTube's altered/synthetic content disclosure. Bolt is a cartoon with a synthetic voice; disclosing is harmless and honest. Set to `false` only if you decide the disclosure does not apply. |
| `snippet.categoryId` | `27` (Education) | |
| `snippet.defaultLanguage` / `defaultAudioLanguage` | `CHANNEL_LANGUAGE` | |
| `notifySubscribers` | config | |

## Quota

`videos.insert` costs **1600 units**, `thumbnails.set` 50; the default daily quota is
**10 000 units** (resets at midnight Pacific). One Short per day plus one weekly video uses
under 20 % of it. If quota is exhausted the publish job stops, keeps the draft queued and
messages you the fix.

## Unverified API projects and private uploads

Projects that have not gone through Google's API audit may have uploads restricted to private
until audited. Our flow **only** uploads private + scheduled videos, so it is unaffected. If you
later see uploads stuck as private after `publishAt`, complete the YouTube API Services audit
form linked from the Cloud Console (APIs & Services → YouTube Data API v3 → Quotas).

## Custom thumbnails (weekly video)

`thumbnails.set` requires the channel to be **verified** (phone verification at
<https://www.youtube.com/verify>). If it fails, the upload still succeeds and the job logs a
warning; YouTube picks an automatic thumbnail.

## Shorts

A vertical (1080×1920) video under 60 s is treated as a Short automatically. Nothing else is
needed. The weekly landscape video is a normal upload.
