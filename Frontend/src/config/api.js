const trimTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");

const fromEnv = process.env.REACT_APP_API_BASE_URL;

// Explicit URL → call that host (Render, or local). Empty string → same-origin (Vercel uses /api/render-proxy).
// Local dev without env → Spring Boot on 9090 (see src/setupProxy.js).
const API_BASE_URL = fromEnv
  ? trimTrailingSlash(fromEnv)
  : process.env.NODE_ENV === "production"
    ? ""
    : "http://localhost:9090";

export default API_BASE_URL;
