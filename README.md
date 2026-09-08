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

## Election

26th Knesset — **27 October 2026**. Candidate lists closed 8 Sep 2026. The seeded
party list (`src/lib/seedData.ts`) is a best-effort snapshot; ballot letters and
final rosters were still firming up, so **the group admin edits lists in
`ניהול → רשימות`** (name, ballot letters, leader, colour, bloc, active/withdrawn/
disqualified).

## Game lifecycle

`open → locked → provisional (election night) → final`

1. **Create a group** (`/create`) — name, deadline, reveal setting. Creator becomes
   admin (cookie token).
2. Friends **join** (`/join`) with a display name. No accounts.
3. **Prediction form** (`/g/<code>/predict`): a live 120-seat Knesset arc; per-list
   +/- and direct entry; **0 seats = an explicit "won't cross the threshold"
   call**; one **⭐ Confidence Pick**; bonus questions; turnout tie-breaker; the
   admin's optional 🎲 Wild Prediction. Drafts autosave a version history;
   editable until the deadline.
4. **Predictions are never visible to others before lock.** At the deadline (or
   manual lock) → **Reveal Mode**: comparison table, **head-to-head**, and **The
   Group Forecast** (average map, largest-remainder-rounded to 120).
5. **Election Night** (`ניהול → תוצאות`): admin enters/updates seats and publishes
   **provisional** results — leaderboard recomputes live under "אם אלו התוצאות
   הסופיות…". Then **mark final** → final leaderboard + awards.

## Scoring (`ניהול → שיטת ניקוד`, fully configurable)

Per list that **entered** the Knesset, by |error|:

| error | 0  | 1 | 2 | 3 | 4 | 5+ |
|-------|----|---|---|---|---|----|
| pts   | 10 | 7 | 5 | 3 | 1 | 0  |

Plus: **threshold bonus** (+2 correct "enters", +2 correct "fails"); a
**per-seat penalty** for seats piled on a list that got 0 (predicting 7→0 hurts
more than 1→0); optional exact bonus; `linear` alternative.
**Confidence Pick**: +10 if that list's seat count is exact.
**Bonus questions + Wild**: own point values; some auto-resolve from the seat
results (largest party, bloc winner, list count, any-list-failed).

Headline metric: **Total Seat Error** = Σ|predicted − actual|. Also tracked:
avg error, exact count, off-by-1 count, threshold accuracy.

**Awards** (final only): 🔮 The Oracle, 🎯 Bullseye, 🗺️ Closest Knesset,
🚪 Threshold Master, 🧠 Contrarian Genius, 🙈 Biggest Miss.

The engine (`src/lib/scoring.ts`) is pure and config-driven.

## Project layout

```
src/
  models/            Election · Party · Group · Participant · Prediction ·
                     PredictionVersion · OfficialResult (one concern per file)
  lib/
    db.ts            connection + embedded-Mongo fallback
    seedData.ts      the 26th-Knesset election + party list (data, not logic)
    questionTemplates.ts  default bonus questions (incl. turnout tie-breaker)
    scoring.ts       pure scoring engine — seats, threshold, confidence, wild
    data.ts          service layer — business logic, group forecast, awards
    serialize.ts     Mongoose docs -> client-safe shapes
    session.ts       cookie-based identity (no accounts)
    types.ts         shared client/server types
  app/
    actions.ts       Server Actions
    page.tsx         landing + countdown + scoring preview
    create/ join/    group creation & joining
    g/[code]/            dashboard (status, leaderboard, group forecast, reveal)
    g/[code]/predict     Knesset-arc 120-seat form + confidence pick + wild
    g/[code]/admin       status/deadline · parties · questions+wild · scoring · results/election-night
    g/[code]/compare     full table + head-to-head
  components/        KnessetArc · Countdown · InviteBox · SeatBars · Leaderboard
```

## Data architecture

Election → Parties / Questions / Wild → Groups → Participants → Predictions →
PredictionVersions, plus per-group OfficialResult (`stage: provisional | final`,
turnout). Scores and awards are computed on read. Nothing is keyed by a
hard-coded party name — a future election is another `Election` row + seed entry.

## Not built yet (next steps)

- **Verify the party list** against the Central Elections Committee and add ballot
  letters in `ניהול → רשימות` — the seed is a best-effort snapshot.
- Shareable prediction / results cards (WhatsApp) — data is all present.
- Group Insights panel (biggest agreement/disagreement, most optimistic…).
- Explicit "recompute" button after changing scoring post-publish (currently
  recomputes on next page load).
- Magic-link re-entry so a cleared cookie doesn't lose your spot.
- Party logo upload (`logoUrl` field exists, no UI).
