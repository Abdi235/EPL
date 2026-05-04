# PremierZone

**PremierZone** is a full-stack web application for exploring English Premier League football data: fixtures, standings, live scores, and player statistics. The interface is built around a responsive React front end and a Spring Boot API, with league data sourced from CSV datasets and third-party football APIs.

<p align="center">
  <img src="./Screenshot%20(371).png" alt="PremierZone — home page preview" width="920" />
</p>

**Live demo:** [epl-fhq4.vercel.app](https://epl-fhq4.vercel.app/)

---

## Table of contents

- [Features](#features)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Local development](#local-development)
- [Configuration](#configuration)
- [Data and player statistics](#data-and-player-statistics)
- [Deployment](#deployment)
- [Roadmap](#roadmap)

---

## Features

| Area | Description |
|------|-------------|
| **Home** | Landing page with navigation into core sections of the app. |
| **Teams** | Browse clubs and open season-aware player rosters and statistics. |
| **Player data** | Sortable-style table: name, position, age, appearances, minutes, goals, assists, discipline, expected metrics (when present in source CSV), and club. Season selector aligns each dataset to a competition year. |
| **Nation & position** | Filter players by nationality or playing position. |
| **Search** | Quick lookup by player name. |
| **Results** | Recent and historical results with season filtering. |
| **Standings** | League tables derived from match data. |
| **Live scores** | Live match feed with periodic refresh. |
| **Stats** | Placeholder for future league-wide statistical highlights. |

---

## Architecture

| Layer | Technology | Role |
|-------|------------|------|
| **Front end** | React 18, React Router, Sass, PapaParse | SPA UI, client-side CSV parsing for static player files, API calls for live data. |
| **Back end** | Spring Boot 3, Java 17 | REST API, optional PostgreSQL persistence, CORS for deployed origins. |
| **Data** | CSV assets in `Frontend/public`, optional classpath resources on the server | Match and player datasets; API keys for live football data where configured. |

---

## Repository layout

```
.
├── Frontend/          # React app (Create React App)
├── Backend/           # Spring Boot service (Maven)
├── api/               # Serverless helpers (e.g. proxy) where used for deployment
├── render.yaml        # Render blueprint (backend + Postgres)
├── Dockerfile         # Container build for backend hosting
└── FEATURE_TRACKER.md
```

---

## Prerequisites

- **Node.js** 18+ (recommended for the React app)
- **Java** 17 and **Maven** 3.8+ (for the Spring Boot API)
- **PostgreSQL** (optional locally; used when the API is configured with a database URL)

---

## Local development

### Front end

```bash
cd Frontend
npm install
npm start
```

The app runs at `http://localhost:3000` by default.

Production build:

```bash
npm run build
```

### Back end

```bash
cd Backend
./mvnw.cmd spring-boot:run
```

On Unix-like systems, use `./mvnw` instead of `./mvnw.cmd`.

Use the Spring profile and datasource settings appropriate for your machine (see `Backend/src/main/resources/application*.properties`).

---

## Configuration

### Front end

| Variable | Purpose |
|----------|---------|
| `REACT_APP_API_BASE_URL` | Base URL of the Spring Boot API (for example `https://your-service.onrender.com`). Omit or leave empty to rely on relative `/api` routes or bundled static data where applicable. |

Set variables in a `.env` file inside `Frontend/` for local development (Create React App reads `REACT_APP_*` keys).

### Back end (typical production)

| Variable | Purpose |
|----------|---------|
| `SPRING_PROFILES_ACTIVE` | e.g. `prod` for production profile |
| `FOOTBALL_API_KEY` | Third-party football data provider |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed browser origins (include your Vercel URL and `http://localhost:3000` for local testing) |
| Database credentials | As required by your `application-prod.properties` or platform-injected `DB_*` variables |

---

## Data and player statistics

- **Player seasons** are driven by entries in `Frontend/src/utils/playerDataset.js` and matching CSV files under `Frontend/public/`. Adding a new season means supplying a compatible CSV and registering it in the configuration.
- **Column completeness** (for example age or expected goals) depends on what each CSV export contains; the UI shows the same columns every season, with an em dash when a value is not in the file.
- **Match and standings data** are loaded from configured CSV sources and API routes as implemented in the front-end utilities and backend controllers.

---

## Deployment

### Frontend (Vercel)

Build the `Frontend` project and deploy the contents of `Frontend/build` to your static host. Point `REACT_APP_API_BASE_URL` at your production API if the UI should call Render or another backend.

### Backend (Render)

This repository includes a **`render.yaml`** blueprint that provisions:

- **`epl-backend`** — Docker-built Spring Boot service (`Dockerfile` at repo root)
- **`epl-postgres`** — Managed PostgreSQL instance

Typical steps:

1. Push the repository to GitHub (or another Git provider supported by Render).
2. In Render: **New** → **Blueprint** → select this repo.
3. Set secrets such as `FOOTBALL_API_KEY` and `CORS_ALLOWED_ORIGINS` in the Render dashboard.
4. After the API URL is known, set `REACT_APP_API_BASE_URL` on Vercel (or your front-end host) to that URL.

Health check path for the service: `/actuator/health`.

---

## Roadmap

Shipped and planned work is tracked in [**FEATURE_TRACKER.md**](./FEATURE_TRACKER.md), including UI polish, API hardening, and deployment checklist items.

---

## Contributing

Issues and pull requests are welcome. Please keep changes focused, match existing code style, and verify `npm run build` in `Frontend` and successful compilation of the `Backend` module before submitting.

---

## Acknowledgements

Premier League club names, fixtures, and statistics are used for informational and educational purposes. This project is not affiliated with the Premier League or its clubs.
