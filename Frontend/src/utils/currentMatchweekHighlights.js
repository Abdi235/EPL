import { buildFuboChannelSearchUrl } from "../config/fuboYoutube";
import { isMatchCompleted } from "./matchDatasets";

/**
 * Pick fixtures from the current gameweek (by `match.gameweek`) for the latest season,
 * for a "this gameweek" strip on the home page. Highlight URLs resolve via the backend when configured.
 */

/** @param {string} ymd */
function parseYmdLocal(ymd) {
  const parts = String(ymd).trim().split("-");
  if (parts.length !== 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatLocalIsoDate(date) {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const da = String(date.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

/** Monday 00:00 local time as a sortable key */
function mondayKeyLocal(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.getTime();
}

const byDateDescThenTeams = (a, b) =>
  String(b.date).localeCompare(String(a.date)) || String(a.homeTeam).localeCompare(String(b.homeTeam));

/**
 * @param {Array<{ season: string, date: string, homeTeam: string, awayTeam: string, homeScore: number, awayScore: number }>} matches
 * @param {{ now?: Date, maxItems?: number }} [options]
 */
export function selectCurrentMatchweekHighlights(matches, options = {}) {
  const now = options.now ?? new Date();
  const maxItems = options.maxItems ?? 6;
  const todayIso = formatLocalIsoDate(now);

  const played = (matches || []).filter((m) => isMatchCompleted(m) && String(m.date) <= todayIso);
  if (!played.length) {
    return {
      season: null,
      matches: [],
      weekRangeLabel: "",
      anchorDate: null,
    };
  }

  played.sort(byDateDescThenTeams);
  const latestSeason = played[0].season;
  const inSeason = played.filter((m) => m.season === latestSeason);
  if (!inSeason.length) {
    return { season: latestSeason, matches: [], weekRangeLabel: "", anchorDate: null };
  }

  const anchorDate = inSeason[0].date;
  const currentGw = Math.max(
    ...inSeason.map((m) => (m.gameweek != null ? Number(m.gameweek) : -1)).filter((n) => Number.isFinite(n))
  );

  let gwMatches = inSeason.filter((m) => m.gameweek != null && Number(m.gameweek) === currentGw);
  if (!gwMatches.length) {
    // Fallback to the previous behavior if gameweek isn't populated for this season.
    const anchor = parseYmdLocal(anchorDate);
    if (!anchor) {
      return { season: latestSeason, matches: [], weekRangeLabel: "", anchorDate };
    }
    const targetWeek = mondayKeyLocal(anchor);
    gwMatches = inSeason.filter((m) => {
      const dt = parseYmdLocal(m.date);
      return dt && mondayKeyLocal(dt) === targetWeek;
    });
  }

  if (!gwMatches.length) {
    gwMatches = inSeason.slice(0, maxItems);
  }

  gwMatches.sort(byDateDescThenTeams);
  const capped = gwMatches.slice(0, maxItems);

  const weekRangeLabel = Number.isFinite(currentGw) && currentGw >= 1 ? `Gameweek ${currentGw}` : "";

  return {
    season: latestSeason,
    matches: capped,
    weekRangeLabel,
    anchorDate,
  };
}

/**
 * @param {string} homeTeam
 * @param {string} awayTeam
 * @param {string} dateYmd
 */
export function buildHighlightsSearchUrl(homeTeam, awayTeam, dateYmd) {
  const parts = String(dateYmd).split("-");
  const y = parts[0] || "";
  const label = `${homeTeam} vs ${awayTeam} ${y} Premier League highlights`;
  return buildFuboChannelSearchUrl(label);
}
