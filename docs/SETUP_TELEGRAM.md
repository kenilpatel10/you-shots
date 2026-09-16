# Telegram setup (review bot)

Bolt sends every draft to you on Telegram and waits for your `/approve`. Nothing is uploaded
without it. This takes about five minutes and costs nothing.

## 1. Create a bot

1. In Telegram, open a chat with **@BotFather** (the official bot-creation bot).
2. Send `/newbot`.
3. Give it a display name (e.g. `Bolt Review`) and a username ending in `bot` (e.g. `bolt_review_bot`).
4. BotFather replies with a **token** that looks like `123456789:AAH…`. That is your
   `TELEGRAM_BOT_TOKEN`. Treat it like a password.

## 2. Find your chat id

1. Open a chat with your new bot and press **Start** (or send any message). The bot cannot
   message you until you do this.
2. In a browser, open
   `https://api.telegram.org/bot<TOKEN>/getUpdates` (replace `<TOKEN>`).
3. Look for `"chat":{"id":123456789,…}`. That number is your `TELEGRAM_CHAT_ID`.
   (If you see `{"ok":true,"result":[]}`, send the bot another message and refresh.)

Only messages from this chat id are accepted as commands. Anyone else who finds the bot is
ignored.

> Prefer a private group? Add the bot to the group, send a message there, and use the group's
> id (a negative number such as `-100123…`). Then in BotFather run `/setprivacy` → **Disable**
> so the bot can read commands in the group.

## 3. Store the secrets

- Locally: put both values in `.env` (copy `.env.example`).
- GitHub Actions: repository **Settings → Secrets and variables → Actions → New repository
  secret** for `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.

## 4. Test

```bash
npm run publish -- --dry-run
```

It should print that it processed 0 updates. Then send `/status` to the bot and run
`npm run publish` (without `--dry-run`): the bot replies with the current queue.

## Commands you can send

| Command | Effect |
| --- | --- |
| `/approve <draftId>` | Queue the draft. The next hourly publish run uploads it as **private, scheduled** for the next free slot. |
| `/reject <draftId> <reason>` | Never publish it. The reason is stored in `data/state.json`. |
| `/redo <draftId>` | Reject it and regenerate the same topic on the next daily run. |
| `/status` | Pending drafts, approved uploads waiting, scheduled videos with links. |
| `/help` | This list. |

If a draft is not answered within 48 hours (configurable: `reminderAfterHours` in
`config/channel.json`) you get **one** reminder. It never auto-publishes.

## Limits worth knowing

- Bots can upload files up to **50 MB**. A Short is usually 8–15 MB. If a file is bigger, the
  pipeline sends a half-resolution preview and links the full-quality release asset.
- Messages are limited to 4096 characters; long scripts are split automatically.
