# RunFuel

RunFuel is a Strava-connected hybrid athlete planner for people who lift and run. It combines recent running history, a manual gym schedule, nutrition targets, weight tracking, and rule-based fatigue logic to generate a practical weekly running plan around strength training.

The app is built as a monorepo with a Node/Express backend, PostgreSQL via Prisma, and a React/Vite frontend styled with Tailwind.

## Getting Started

### Prerequisites

- Node.js
- PostgreSQL
- A Strava API app, if you want to connect real Strava data

### Backend setup

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/runfuel"
JWT_SECRET="replace-with-a-secret"
FRONTEND_URL="http://localhost:5173"
PORT=5001

STRAVA_CLIENT_ID="your-strava-client-id"
STRAVA_CLIENT_SECRET="your-strava-client-secret"
STRAVA_REDIRECT_URI="http://localhost:5001/api/strava/callback"
```

Run the backend:

```bash
npm run dev
```

The backend runs on `http://localhost:5001` by default. The dev script applies Prisma migrations, generates the Prisma client, and starts the Express server with nodemon.

### Frontend setup

```bash
cd frontend
npm install
```

Optional: create `frontend/.env` if your API URL is different:

```env
VITE_API_BASE_URL="http://localhost:5001/api"
```

Run the frontend:

```bash
npm run dev
```

The frontend runs on `http://localhost:5173` by default.

## Features

### Core App Foundation

- Monorepo structure with separate `backend` and `frontend` apps.
- Node/Express backend with PostgreSQL and Prisma.
- React/Vite frontend with Tailwind styling.
- Protected app flow after login.

### Authentication

- User registration and login.
- Password hashing.
- Auth-protected backend routes.
- Protected frontend access for dashboard, settings, and planner pages.

### Settings

- Goal selection: 5K, 10K, general endurance, or hybrid conditioning.
- Easy pace input.
- Preferred units for weight, distance, and pace:
  - kg or lbs
  - km or miles
  - min/km or min/mile
- Manual weekly gym schedule.
- Manual calorie target.
- Optional macro targets.
- Weight tracking.

### Strava Integration

- Strava OAuth connection.
- Secure token storage in PostgreSQL.
- Token refresh flow.
- Sync recent Strava runs.
- Store imported runs in PostgreSQL.
- Show Strava connection status.

### Dashboard

- Weekly running distance.
- Last week running distance.
- Mileage change.
- Recent runs.
- Latest run.
- Current weight.
- Calorie and protein target.
- Strava sync button.
- Current plan summary.

### Training Load and Fatigue Detector

- Classifies recent Strava runs as easy, tempo, quality, or long.
- Uses easy pace and recent distance history.
- Calculates weekly mileage trends.
- Detects mileage spikes.
- Uses rolling multi-day fatigue instead of only checking yesterday or today.
- Combines gym schedule and Strava activity.
- Detects run/gym conflicts, such as quality runs near leg day.
- Detects when there is no true rest day.
- Detects extra or missed planned runs.

### Today Decision Engine

- Converts fatigue score into human labels: Fresh, Manageable, Loaded, or Compromised.
- Gives a recommendation for today.
- Shows whether to train as planned, control extras, modify the session, or prioritize recovery.
- Uses time-aware run completion logic so future planned runs are not counted as missed.
- Shows today-relevant warnings by default.
- Keeps full-week warnings secondary.

### Hybrid Run Planner

- Generates a weekly run plan from the gym schedule.
- Suggests easy and quality runs based on available run days.
- Uses the current goal and easy pace for pace guidance.
- Uses Strava history to set a reasonable weekly distance.
- Places quality runs away from leg and full-body days where possible.
- Adjusts the plan if fatigue or mileage spike is high.
- Explains why each run was placed.
- Saves the current week's generated plan.

### Coach Notes

- Deterministic, rule-based notes.
- Explain why the app made a recommendation.
- Avoid AI/hallucinated training advice.
- Give practical next actions instead of generic warnings.

### Scientific Rationale

The training logic is documented separately:

- [RunFuel training load science](frontend/public/runfuel_training_load_science.md)
- [RunFuel scientific rationale](frontend/public/runfuel_scientific_rationale.docx)

These documents cover the science-informed philosophy behind easy running, quality run limits, concurrent training, leg-day spacing, rolling fatigue, mileage spikes, and why RunFuel avoids presenting itself as an injury predictor.
