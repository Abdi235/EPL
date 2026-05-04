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
  return {
    players: [],
    invalid: true,
    hint:
      typeof data === "string"
        ? "The server returned non-JSON (often a bad /api proxy or a 404 HTML page)."
        : "The server returned an unexpected shape for the player list.",
  };
}
