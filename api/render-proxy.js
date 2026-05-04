/**
 * Same as Frontend/api/render-proxy.js — used when Vercel Root Directory is the repo root.
 */
const ALLOWED_PATH = /^v1\/player(\?|$)/;

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const origin = process.env.RENDER_API_ORIGIN?.trim().replace(/\/+$/, "");
  if (!origin) {
    res.status(500).setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify({
        message:
          "Missing RENDER_API_ORIGIN. In Vercel → Environment Variables, set RENDER_API_ORIGIN to your Render HTTPS URL (e.g. https://my-app.onrender.com), then redeploy.",
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

  const upstream = await fetch(targetUrl, {
    method: "GET",
    headers: {
      Accept: req.headers.accept || "application/json",
    },
  });

  const text = await upstream.text();
  const ct = upstream.headers.get("content-type") || "application/json; charset=utf-8";
  res.status(upstream.status);
  res.setHeader("Content-Type", ct);
  res.end(text);
};
