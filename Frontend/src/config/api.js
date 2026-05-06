const trimTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");

const fromEnv = process.env.REACT_APP_API_BASE_URL;

// Explicit URL → call that host (Render, or local). Empty string → same-origin (Vercel uses /api/render-proxy).
// On Vercel without this var: set RENDER_API_ORIGIN (or API_BACKEND_ORIGIN / BACKEND_URL) for the serverless proxy,
// or set REACT_APP_API_BASE_URL here to skip the proxy and call Render directly (redeploy after changing).
// Local dev without env → Spring Boot on 9090 (see src/setupProxy.js).
// News uses same /api/v1/news path: dev proxy → backend; Vercel → api/v1/news.js → Render.
const API_BASE_URL = fromEnv
  ? trimTrailingSlash(fromEnv)
  : process.env.NODE_ENV === "production"
    ? ""
    : "http://localhost:9090";

export default API_BASE_URL;
