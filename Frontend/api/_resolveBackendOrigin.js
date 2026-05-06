/**
 * Shared by Vercel serverless routes that forward to Spring Boot on Render.
 * Set RENDER_API_ORIGIN (or API_BACKEND_ORIGIN / BACKEND_URL) in Vercel env.
 */
module.exports = function resolveBackendOrigin() {
  const candidates = [
    process.env.RENDER_API_ORIGIN,
    process.env.API_BACKEND_ORIGIN,
    process.env.BACKEND_URL,
    process.env.RENDER_URL,
  ];
  for (const c of candidates) {
    const v = c?.trim().replace(/\/+$/, "");
    if (v) return v;
  }
  return "";
};
