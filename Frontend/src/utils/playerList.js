/**
 * Spring returns List<Player> as a JSON array. Proxies or misroutes can return HTML (string) or objects.
 */
function toPlainArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((row) => row != null && typeof row === "object");
}

export function normalizePlayerListResponse(data) {
  if (Array.isArray(data)) {
    return { players: toPlainArray(data), invalid: false };
  }
  if (data && typeof data === "object" && Array.isArray(data.players)) {
    return { players: toPlainArray(data.players), invalid: false };
  }
  const htmlHint =
    typeof data === "string" && /<\s*!?\s*doctype\s+html/i.test(data)
      ? " If you are on Vercel, set environment variable RENDER_API_ORIGIN to your live Render HTTPS URL (the default hostname may not exist), redeploy, or set REACT_APP_API_BASE_URL to call Render directly."
      : "";

  return {
    players: [],
    invalid: true,
    hint:
      typeof data === "string"
        ? `The server returned non-JSON (often a bad /api proxy or an HTML error page).${htmlHint}`
        : "The server returned an unexpected shape for the player list.",
  };
}
