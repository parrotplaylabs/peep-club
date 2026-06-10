# Peep Club 🐣

> Lightweight club management for solo supervisors — members, attendance, events, announcements, volunteers, and shareable social posts.

Peep Club is a simple CRM for community clubs: chess groups, speedcubing clubs, board game nights, Go clubs, homeschool co-ops, robotics teams, and school organizations. One manager, one club, one JSON file — no database, no build step.

Track your roster, take date-first attendance at weekly meetings, schedule tournaments and socials, post announcements, coordinate volunteers, and copy ready-made messages for Facebook, group chats, or Instagram.

Built for operators who run clubs alone and want clarity without enterprise overhead.

## Demo

[Watch the video demo](https://drive.proton.me/urls/7PVZEWQNHG#oTdHRsrqDKqK)

## Features

- **Members** — CRUD, search, CSV import, welcome share messages
- **Attendance** — date-first check-in with optional event link; visitor walk-ins
- **Events** — meetings, tournaments, socials; promo copy for social media
- **Announcements** — draft and publish club news with shareable text
- **Volunteers** — per-event roles, sign-ups, volunteer call posts
- **Analytics** — member counts, weekly attendance, event turnout, volunteer coverage
- **Settings** — club profile, meeting defaults, backup/restore, optional PIN lock
- Plain Node.js `http` server with static HTML + JSON API (no framework or build step)
- Warm community UI with [Lucide](https://lucide.dev) icons via CDN

## Quick start

```bash
cd peep-club
npm install
cp .env.example .env          # optional — edit settings
npm run seed                  # optional — sample club data
npm start
```

Open [http://localhost:3020](http://localhost:3020).

Or use Make:

```bash
make help      # list all commands
make setup     # .env + npm install
make seed      # sample data
make start     # background server
make stop
make restart
make status
make dev       # foreground with file watch
```

## Configuration

Copy `.env.example` to `.env` and edit as needed.

| Variable | Description |
| -------- | ----------- |
| `APP_NAME` | App title shown in the header |
| `APP_ENV` | `development` or `production` |
| `PORT` | Server port (default: `3020`) |
| `SESSION_SECRET` | Session signing secret (change in production) |
| `OPERATOR_PIN` | Require PIN unlock before use (leave empty for open local access) |
| `DATA_PATH` | Path to JSON data file (default: `storage/data.json`) |

Most day-to-day settings — club name, location, meeting day/time, contact info, share templates — are edited in **Settings** inside the app and saved to `storage/data.json`.

## Data

All records live in a single JSON file (`storage/data.json` by default):

| Key | Contents |
| --- | -------- |
| `settings` | Club profile, member types, volunteer roles, share templates |
| `members` | Roster |
| `events` | Meetings, tournaments, socials |
| `attendance` | Date-first check-ins |
| `announcements` | Club news |
| `volunteer_slots` / `volunteer_signups` | Event volunteer coordination |

Download a backup anytime from **Settings → Download backup**. Restore via **Settings → Restore backup**, or run `npm run reset` to wipe and reload sample seed data.

## Social share copy

Use **Copy for social media** on members, events, announcements, and volunteer calls. Messages are built from templates in settings with placeholders like `{clubName}`, `{memberName}`, `{eventTitle}`, and `{contact}`.

## Deployment

### Local

```bash
make setup && make seed && make start   # background on http://localhost:3020
make status && make stop
```

Or `npm start` after `npm install`. Verify with `curl http://localhost:3020/api/health`.

### Railway

Host on [Railway](https://railway.com/?referralCode=iNLSQG) with a persistent volume mounted at `/app/storage`. Set `SESSION_SECRET` and `OPERATOR_PIN` in Railway variables.

See **[DEPLOY.md](DEPLOY.md)** for the full local and Railway setup guide (volume, env vars, health check, troubleshooting).

### Other hosts

On a VPS: `npm install --omit=dev`, optional `npm run seed`, then `npm start` or a process manager (PM2, systemd). Back up `storage/data.json` regularly.

## Consulting and Customization

Need custom workflows, features, or integrations?

Contact us at:

**[parrotplaylabs@protonmail.com](mailto:parrotplaylabs@protonmail.com)**

## License

MIT — see [LICENSE.md](LICENSE.md).
