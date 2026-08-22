# Course Dashboard

Personal dashboard + Telegram notifier that pulls together Google Calendar events,
Google-Sheets-tracked tasks, and (in later phases) Moodle deadlines, Slack
@-mentions, Scorebuddy status, and flagged Gmail — see
`docs/plan.md` for the full phased architecture.

**Phase 1 scope** (this is what's built right now): Google Calendar sync,
Tasks-tab Google Sheet sync, a dashboard listing both, and a daily Telegram
digest. Moodle, Slack, Scorebuddy, and Gmail are not wired up yet.

## Project layout

```
apps/web/        Next.js dashboard (also hosts the Google OAuth routes)
apps/worker/      cron scheduler that runs all the sync/notification jobs
packages/db/      Prisma schema + client, shared by both apps
packages/shared/  shared helpers (crypto, Google client, Telegram sender)
```

## One-time setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Postgres database

Any Postgres works for local dev (Docker, a local install, or a free Railway/Neon instance).
Put the connection string in `.env` as `DATABASE_URL`.

### 3. Copy the env file and fill it in

```bash
cp .env.example .env
```

Generate `APP_ENCRYPTION_KEY`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Pick any `DASHBOARD_PASSWORD` you like — that's what you'll type to log into the dashboard.

### 4. Google Cloud Console setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → create a new project (or reuse one).
2. **APIs & Services → Library** → enable: Google Calendar API, Gmail API, Google Sheets API.
3. **APIs & Services → OAuth consent screen** → User type "External", publishing status **Testing** (this avoids Google's app-review process entirely for personal use) → add your own Google account under "Test users".
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → Application type "Web application" → Authorized redirect URI: `http://localhost:3000/api/auth/google/callback` (and later your production URL + `/api/auth/google/callback`).
5. Copy the generated Client ID and Client Secret into `.env` as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

### 5. Telegram bot setup

1. Open Telegram, message **@BotFather**, send `/newbot`, follow the prompts (name + username). It replies with a token like `123456:ABC-def...` — put that in `.env` as `TELEGRAM_BOT_TOKEN`.
2. Send your new bot any message directly (open a chat with it and type "hi").
3. In a browser, visit `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` — find `"chat":{"id":123456789,...}` in the JSON response and put that number in `.env` as `TELEGRAM_CHAT_ID`.

### 6. Google Sheet for tasks

Create a Google Sheet with a tab named exactly `Tasks` and this header row:

| Title | Source | MentionedAt | Context | Status | RowId |
|---|---|---|---|---|---|

- `RowId` must be a unique value you assign per row (e.g. `1`, `2`, `3`, ...) — it's how the sync avoids creating duplicates.
- `Status` should be one of `Pending`, `In Progress`, `Done` (case-insensitive).
- Copy the spreadsheet ID out of its URL (`https://docs.google.com/spreadsheets/d/<ID>/edit`) into `.env` as `SHEETS_SPREADSHEET_ID`.
- Share the sheet with the same Google account you connected in step 4 (or make sure it's owned by that account).

### 7. Run database migrations

```bash
npm run db:migrate
```

One `.env` file at the repo root is enough — the `dev:web`/`dev:worker`/`db:*` scripts
load it via `dotenv-cli` before starting each app, so you don't need separate copies
inside `apps/web` or `apps/worker`. On Railway/Render in production, skip `.env` entirely
and set the same variables directly in each service's "Variables" panel instead.

## Running locally

In two terminals:

```bash
npm run dev:web      # dashboard on http://localhost:3000
npm run dev:worker    # cron scheduler (runs jobs immediately on boot, then on schedule)
```

Open `http://localhost:3000`, log in with `DASHBOARD_PASSWORD`, click **Connect Google**,
authorize, and within a minute the worker's boot-time sync should populate courses/events.
The daily digest only fires once `DIGEST_HOUR` has passed on a given day (dedup'd per day),
so to test it immediately during development, temporarily set `DIGEST_HOUR=0` in `.env`.

## Deploying

Deploy `apps/web` and `apps/worker` as two separate services on Railway (or Render), both
pointed at this repo, sharing the same environment variables and the same `DATABASE_URL`
(Railway's Postgres plugin gives you one to share). Remember to update `GOOGLE_REDIRECT_URI`
and the Google Cloud Console redirect URI to your production `apps/web` URL once deployed.
