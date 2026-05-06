/**
 * GET /api/v1/news — proxies to Spring Boot GET /api/v1/news (RSS aggregation).
 * Optional: ?refresh=true bypasses server-side cache.
 *
 * Keeps the same path as local CRA proxy (/api → localhost:9090) so the React app
 * always uses relative /api/v1/news in every environment.
 */
const resolveBackendOrigin = require("../_resolveBackendOrigin");

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    res.status(405).setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ message: "Method not allowed." }));
    return;
  }

  const origin = resolveBackendOrigin();
  if (!origin) {
    res.status(503).setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify({
        message:
          "Backend URL is not configured. In Vercel → Environment Variables, set RENDER_API_ORIGIN to your Spring Boot HTTPS URL (no trailing slash), then redeploy.",
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

  const refresh = incoming.searchParams.get("refresh");
  const backendPath = refresh === "true" ? "v1/news?refresh=true" : "v1/news";
  const targetUrl = `${origin}/api/${backendPath}`;

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
