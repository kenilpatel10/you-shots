/**
 * One-time local helper: obtain a YouTube OAuth refresh token.
 *   npm run auth:youtube
 * Opens a consent URL, listens on http://localhost:5173/oauth2callback, prints the refresh token.
 */
import http from "node:http";
import { env } from "../lib/env";
import { LOCAL_REDIRECT, SCOPES, oauthClient } from "../publish/youtube";

const clientId = env("YOUTUBE_CLIENT_ID");
const clientSecret = env("YOUTUBE_CLIENT_SECRET");
if (!clientId || !clientSecret) {
  console.error("Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in .env first (docs/SETUP_YOUTUBE.md).");
  process.exit(1);
}

const client = oauthClient(false);
const url = client.generateAuthUrl({ access_type: "offline", prompt: "consent", scope: SCOPES, include_granted_scopes: true });

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url ?? "/", LOCAL_REDIRECT);
  if (u.pathname !== "/oauth2callback") {
    res.writeHead(404).end();
    return;
  }
  const code = u.searchParams.get("code");
  const error = u.searchParams.get("error");
  if (error || !code) {
    res.writeHead(400, { "content-type": "text/plain" }).end(`Authorization failed: ${error ?? "no code"}`);
    console.error(`Authorization failed: ${error}`);
    server.close();
    process.exit(1);
  }
  try {
    const { tokens } = await client.getToken(code);
    res.writeHead(200, { "content-type": "text/html" }).end("<h2>Done! You can close this tab and return to the terminal.</h2>");
    if (!tokens.refresh_token) {
      console.error("No refresh token returned. Remove the app's access at https://myaccount.google.com/permissions and run again.");
    } else {
      console.log("\nYOUTUBE_REFRESH_TOKEN=" + tokens.refresh_token);
      console.log("\nAdd this to .env locally and as a GitHub Actions secret named YOUTUBE_REFRESH_TOKEN. Never commit it.");
    }
  } catch (err) {
    console.error("Token exchange failed:", (err as Error).message);
  } finally {
    server.close();
  }
});

server.listen(5173, () => {
  console.log("1. Open this URL in your browser (sign in with the Google account that owns the YouTube channel):\n");
  console.log(url);
  console.log("\n2. Approve access. You will be redirected to localhost:5173 and the refresh token will print here.");
});
