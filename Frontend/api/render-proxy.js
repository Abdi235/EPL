/**
 * Proxies GET /api/render-proxy?__path=... to Render.
 * __path must be like v1/player?team=Arsenal (encoded).
 *
 * Set one of these in Vercel → Environment Variables (Production), then redeploy:
 *   RENDER_API_ORIGIN   (preferred)  e.g. https://my-app.onrender.com
 *   API_BACKEND_ORIGIN  (alias)
 *   BACKEND_URL         (alias)
 *
 * Or skip the proxy: set REACT_APP_API_BASE_URL at build time to the same HTTPS URL.
 */
const ALLOWED_PATH = /^v1\/player(\?|$)/;

function resolveBackendOrigin() {
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
}

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const origin = resolveBackendOrigin();
  if (!origin) {
    res.status(503).setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify({
        message:
          "Backend URL is not configured. In Vercel → Settings → Environment Variables, add RENDER_API_ORIGIN with your Render HTTPS URL (no trailing slash), then redeploy. Example: https://your-service.onrender.com",
      })
    );
    return;
  }

  let incoming;
  try {
    incoming = new URL(req.url || "", "https://vercel.internal");
  } catch {
    res.status(400).setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ message: "Bad request URL." }));
    return;
  }

  const rawPath = incoming.searchParams.get("__path");
  if (!rawPath) {
    res.status(400).setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ message: "Missing __path query parameter." }));
    return;
  }

  let decoded;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    res.status(400).setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ message: "Invalid __path encoding." }));
    return;
  }

  if (!ALLOWED_PATH.test(decoded)) {
    res.status(400).setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ message: "Unsupported proxy path." }));
    return;
  }

  const targetUrl = `${origin}/api/${decoded}`;

  let upstream;
  try {
    upstream = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Accept: req.headers.accept || "application/json",
      },
    });
  } catch (e) {
    res.status(502).setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify({
        message: `Could not reach backend at ${origin}. Check RENDER_API_ORIGIN and that Render is running. ${e?.message || ""}`.trim(),
      })
    );
    return;
  }

  const text = await upstream.text();
  const ct = upstream.headers.get("content-type") || "application/json; charset=utf-8";
  res.status(upstream.status);
  res.setHeader("Content-Type", ct);
  res.end(text);
};
