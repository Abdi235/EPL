/**
 * GET /api/v1/youtube/highlight?home=&away=&date=&homeScore=&awayScore=
 * Proxies to Spring Boot (YouTube Data API v3 search → watch URL).
 */
const resolveBackendOrigin = require("../../_resolveBackendOrigin");

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
          "Backend URL is not configured. Set RENDER_API_ORIGIN on Vercel, then redeploy.",
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

  const qs = incoming.search || "";
  const targetUrl = `${origin}/api/v1/youtube/highlight${qs}`;

  let upstream;
  try {
    upstream = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
  } catch (e) {
    res.status(502).setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify({
        message: `Could not reach backend at ${origin}. ${e?.message || ""}`.trim(),
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
