const trimTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");

const fromEnv = process.env.REACT_APP_API_BASE_URL;
const API_BASE_URL = trimTrailingSlash(fromEnv) || "http://localhost:9090";

if (process.env.NODE_ENV === "production" && !fromEnv) {
  // eslint-disable-next-line no-console
  console.error(
    "[EPL] REACT_APP_API_BASE_URL is not set. In Vercel: Settings → Environment Variables → add it with your Render backend URL (e.g. https://your-service.onrender.com), then redeploy. Without it, the app calls localhost and requests fail in the browser."
  );
}

export default API_BASE_URL;
