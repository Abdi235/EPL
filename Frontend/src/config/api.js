const trimTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");

const fromEnv = process.env.REACT_APP_API_BASE_URL;

// If REACT_APP_API_BASE_URL is set, call that host directly (any environment).
// Otherwise use same-origin "/api/...":
// - Production on Vercel: Frontend/vercel.json rewrites /api to Render (no CORS, no env var).
// - Local dev: src/setupProxy.js forwards /api to the Spring Boot server.
const API_BASE_URL = fromEnv ? trimTrailingSlash(fromEnv) : "";

export default API_BASE_URL;
