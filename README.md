# ניחוש הבחירות — Knesset Election Prediction Game

A private prediction league for a group of friends. Everyone splits **120 Knesset
seats** between the parties, answers bonus questions, and after the official results
are entered the app scores everyone and shows a leaderboard.

No money, no accounts — just a group code and a display name.

## Stack

- **Next.js 15** (App Router, React 19, Server Actions) + TypeScript
- **Tailwind CSS v4**
- **MongoDB** via Mongoose (document / NoSQL model)
  - With no `MONGODB_URI` set, the app boots an **embedded MongoDB**
    (`mongodb-memory-server`) that persists to `./.mongo-data` — zero setup for
    local development.

## Run locally

```bash
npm install
npm run dev
# http://localhost:3000
```

The first request seeds the default election (26th Knesset) and its party list
automatically. Nothing else to do.

> The embedded DB writes to `./.mongo-data`. Only one process can hold that
> directory at a time, so don't run two dev servers against it.

## Deploy (real shared database)

1. Create a free **MongoDB Atlas** cluster and get its connection string.
2. Set environment variables (e.g. on Vercel / Fly / Railway):
   ```
   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/knesset-predict
   NEXT_PUBLIC_BASE_URL=https://your-domain
   ```
3. `npm run build && npm run start` (or deploy to any Next.js host).

The default election seeds itself on first use in production too.

## How a game runs

1. **Create a group** (`/create`) — name, your name, optional password, prediction
   deadline, reveal settings. You become the group **admin** (an admin token is
   stored in your browser cookie for that group).
2. **Share** the group code / invite link. Friends **join** (`/join`) with just a
   display name.
3. Everyone fills the **prediction form** (`/g/<code>/predict`): distribute exactly
   120 seats (live counter enforces it) + answer bonus questions. Drafts can be
   saved anytime; predictions are editable until the deadline.
4. At the deadline (or when the admin locks early) predictions **lock**. If enabled,
   a **comparison table** (`/g/<code>/compare`) opens.
5. The admin opens **ניהול → תוצאות רשמיות** (`/g/<code>/admin`), enters the official
   seat counts and any manual answers, and hits **publish**.
6. The **leaderboard** appears on the group dashboard with full score breakdown and
   highlights (1st place, most accurate, most exact).

## Scoring (configurable per group, `ניהול → שיטת ניקוד`)

**Seats** — per party, by absolute error:

| error | 0  | 1 | 2 | 3 | 4 | 5+ |
|-------|----|---|---|---|---|----|
| pts   | 10 | 7 | 5 | 3 | 1 | 0  |

Plus optional per-party *exact* bonus and *passed-threshold* points. A `linear`
method (`points = base − slope·error`) is also available.

**Bonus questions** — each has its own point value. Some resolve automatically from
the seat results (largest party, winning bloc, party count, any-party-below-
threshold); the rest (PM, government within 45 days) are entered by the admin.

The scoring engine (`src/lib/scoring.ts`) is pure and strategy-based, so new
methods can be added without touching the rest of the app.

## Project layout

```
src/
  models/            Mongoose schemas — Election, Party, Group, Participant,
                     Prediction, OfficialResult (one concern per file)
  lib/
    db.ts            connection + embedded-Mongo fallback
    seedData.ts      the default election + party list (data, not logic)
    questionTemplates.ts  default bonus questions
    scoring.ts       pure scoring engine (no DB / framework imports)
    data.ts          service layer — all business logic, returns plain JSON
    serialize.ts     Mongoose docs -> client-safe shapes
    session.ts       cookie-based identity (no accounts)
    types.ts         shared client/server types
  app/
    actions.ts       Server Actions (create/join/save/lock/results/…)
    page.tsx         landing + countdown + scoring preview
    create/ join/    group creation & joining
    g/[code]/        dashboard
    g/[code]/predict     120-seat prediction form
    g/[code]/admin       lock · questions · scoring · results entry
    g/[code]/compare     everyone's predictions side by side
  components/        Countdown, InviteBox, SeatBars, Leaderboard
```

## Multi-election ready

Elections, parties, questions, scoring and results are all separate concerns keyed
by an `Election`. The current build assumes one "default election"; supporting
several is a matter of adding more seed entries and a picker — no schema changes.

## Not built yet (next steps)

- Second-participant testing needs separate browsers (cookie identity) — a
  magic-link re-entry flow would help.
- Party logo upload (schema field `logoUrl` exists, no UI).
- Recompute-on-demand button after changing scoring post-publish (currently
  recomputes on next page load).
- Email/push notifications for deadline reminders.
