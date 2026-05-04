const trimTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");

/**
 * GET api/v1/player with optional filters. Same-origin builds use /api/render-proxy on Vercel.
 */
export function buildPlayerListUrl(apiBaseUrl, filters) {
  const sp = new URLSearchParams();
  if (filters.team) sp.set("team", filters.team);
  if (filters.nation) sp.set("nation", filters.nation);
  if (filters.position) sp.set("position", filters.position);
  if (filters.name) sp.set("name", filters.name);

  const qs = sp.toString();
  const subPathWithQuery = `v1/player${qs ? `?${qs}` : ""}`;
  const base = trimTrailingSlash(apiBaseUrl);

  if (!base) {
    return `/api/render-proxy?__path=${encodeURIComponent(subPathWithQuery)}`;
  }

  return `${base}/api/${subPathWithQuery}`;
}
