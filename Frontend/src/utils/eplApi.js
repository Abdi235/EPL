import API_BASE_URL from "../config/api.js";

function candidateUrls(path) {
  const base = String(API_BASE_URL || "").replace(/\/+$/, "");
  const urls = [];
  if (base) urls.push(`${base}${path}`);
  urls.push(path);
  return urls;
}

function parseLiveLeagueFromPayload(leagueTableNode) {
  if (!leagueTableNode || typeof leagueTableNode !== "object") return null;
  const table = leagueTableNode.table;
  const seasonLabel = String(leagueTableNode.seasonLabel ?? "").trim();
  if (!Array.isArray(table) || table.length === 0 || !seasonLabel) return null;
  return { seasonLabel, table };
}

/**
 * Matches + live league table from Spring Boot (CSVs + API-Football when FOOTBALL_API_KEY is set).
 * @returns {Promise<{ matches: Array, liveLeague: { seasonLabel: string, table: Array } | null, updatedAt: string | null } | null>}
 */
export async function fetchMatchdayData(refresh = false) {
  const qs = refresh ? "?refresh=true" : "";
  const path = `/api/v1/epl/matchday-data${qs}`;
  const tried = new Set();
  for (const url of candidateUrls(path)) {
    if (tried.has(url)) continue;
    tried.add(url);
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const data = await res.json();
      if (!data || !Array.isArray(data.matches) || data.matches.length === 0) continue;
      return {
        matches: data.matches,
        liveLeague: parseLiveLeagueFromPayload(data.leagueTable),
        updatedAt: data.updatedAt ?? null,
      };
    } catch {
      /* try next */
    }
  }
  return null;
}

/** @deprecated Prefer fetchMatchdayData */
export async function fetchLiveLeagueTable() {
  const path = "/api/v1/epl/league-table";
  for (const url of candidateUrls(path)) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const data = await res.json();
      return parseLiveLeagueFromPayload(data);
    } catch {
      /* try next */
    }
  }
  return null;
}

/** Latest season label from live table or match list. */
export function resolveCurrentSeasonLabel(matches, liveLeague) {
  if (liveLeague?.seasonLabel) return liveLeague.seasonLabel;
  const seasons = [...new Set((matches || []).map((m) => String(m.season || "").trim()).filter(Boolean))];
  seasons.sort((a, b) => String(b).localeCompare(String(a)));
  return seasons[0] || "";
}
