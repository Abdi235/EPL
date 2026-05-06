import { buildFuboChannelSearchUrl } from "../config/fuboYoutube";
import { isMatchCompleted } from "./matchDatasets";

/**
 * Pick recent fixtures from the same calendar week as the latest result in the current season,
 * for a "this matchweek" style strip on the home page. Highlight URLs resolve via the backend when configured.
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

  const played = (matches || []).filter(
    (m) => isMatchCompleted(m) && String(m.date) <= todayIso
  );
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
  const anchor = parseYmdLocal(anchorDate);
  if (!anchor) {
    return { season: latestSeason, matches: [], weekRangeLabel: "", anchorDate };
  }

  const targetWeek = mondayKeyLocal(anchor);
  let weekMatches = inSeason.filter((m) => {
    const dt = parseYmdLocal(m.date);
    return dt && mondayKeyLocal(dt) === targetWeek;
  });

  if (!weekMatches.length) {
    weekMatches = inSeason.slice(0, maxItems);
  }

  weekMatches.sort(byDateDescThenTeams);
  const capped = weekMatches.slice(0, maxItems);

  const first = parseYmdLocal(capped[capped.length - 1]?.date);
  const last = parseYmdLocal(capped[0]?.date);
  let weekRangeLabel = "";
  if (first && last) {
    const opts = { month: "short", day: "numeric" };
    weekRangeLabel = `${first.toLocaleDateString(undefined, opts)} – ${last.toLocaleDateString(undefined, opts)}`;
  }

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
