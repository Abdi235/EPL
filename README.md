# PremierZone

PremierZone is a comprehensive project designed to scrape match statistics for over 700 players, manipulate and present the data dynamically, and predict match outcomes using machine learning. The project is divided into four main components: Backend, Frontend, Data Scraping, and Machine Learning.

## 📸 Preview

![PremierZone Dashboard](./assets/premierzone-dashboard.png)


You can find the [project here!](https://epl-fhq4.vercel.app/)

## Features

- **Data Scraping**: Engineered a comprehensive data scraping of match statistics for 700+ players using Python and pandas.
- **Backend**: Dynamic manipulation and presentation of the scraped data through a Spring Boot application.
- **Database**: Real-time data manipulation within a Postgres database using SQL queries.
- **Frontend**: Seamless integration with a user-friendly ReactJS interface.
- **Machine Learning**: Created a model to predict match outcomes by integrating data scraping with pandas and machine learning with scikit-learn.

For a detailed implementation checklist and roadmap, see [FEATURE_TRACKER.md](./FEATURE_TRACKER.md).

## Backend Deployment (Render)

This repo now includes a `render.yaml` blueprint to keep the Spring Boot backend always live on Render.

1. Push this repo to GitHub.
2. In Render, click **New +** -> **Blueprint** and connect the repository.
3. Render will create:
   - `epl-backend` (Java web service from `Backend/`)
   - `epl-postgres` (managed PostgreSQL database)
4. Set the required secret env vars in Render:
   - `FOOTBALL_API_KEY`
   - `CORS_ALLOWED_ORIGINS` (example: `https://your-frontend.vercel.app,http://localhost:3000`)
5. Deploy. Render injects `PORT`, database credentials, and runs the backend in `prod` profile.

After deployment, set your frontend env var:

- `REACT_APP_API_BASE_URL=https://<your-render-service>.onrender.com`


