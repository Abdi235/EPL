# Feature Tracker

This file tracks shipped and planned features for the EPL Website project.

## Frontend

- [x] Responsive EPL-style UI refresh
- [x] Team cards and filtering
- [x] Nation and position filtering
- [x] Search by player name
- [x] Player data table with "Show More"
- [x] Live scores page
- [x] Recent results page
- [x] Standings table page
- [x] Live scores auto-refresh every 30 seconds
- [ ] Team detail page enhancements
- [ ] Better loading and empty states across all pages

## Backend API (Spring Boot)

- [x] Player CRUD and filtering endpoints
- [x] PostgreSQL integration
- [x] CORS config for local and Vercel frontend
- [x] EPL endpoints:
  - [x] `/api/v1/epl/live`
  - [x] `/api/v1/epl/results`
  - [x] `/api/v1/epl/standings`
- [ ] API response DTO cleanup (avoid raw external payloads)
- [ ] Basic rate limiting and retry strategy for third-party football API

## Deployment

- [x] Frontend deploy to Vercel
- [x] Build script fix for `react-scripts` permission issues
- [ ] Backend deployment to Render
- [ ] Production environment variables fully configured

## Data and ML

- [x] Historical player dataset integration
- [x] Match prediction pipeline (Python)
- [ ] Automated data refresh schedule
