import Papa from "papaparse";
import API_BASE_URL from "../config/api.js";

const PROXY_PATH_PL_202425 = "v1/match-data/pl_matches_2024_25.csv";
const PROXY_PATH_E0_2526 = "v1/match-data/football_data_E0_2526.csv";

/** Try Spring Boot (Render/local), then Vercel proxy, then CRA /public. */
function candidateUrlsForPl202425() {
  const urls = [];
  if (API_BASE_URL) {
    urls.push(`${API_BASE_URL}/api/${PROXY_PATH_PL_202425}`);
  }
  if (process.env.NODE_ENV === "production") {
    urls.push(`/api/render-proxy?__path=${encodeURIComponent(PROXY_PATH_PL_202425)}`);
  }
  urls.push("/pl_matches_2024_25.csv");
  return urls;
}

function candidateUrlsForFootball2526() {
  const urls = [];
  if (API_BASE_URL) {
    urls.push(`${API_BASE_URL}/api/${PROXY_PATH_E0_2526}`);
  }
  if (process.env.NODE_ENV === "production") {
    urls.push(`/api/render-proxy?__path=${encodeURIComponent(PROXY_PATH_E0_2526)}`);
  }
  urls.push("/football_data_E0_2526.csv");
  return urls;
}

/**
 * Historical league file, 2024/25 matches, 2025/26 football-data.co.uk E0 (through ~early May 2026).
 * Per-team_match_stats.csv was removed — it mixed incomplete scores with full seasons.
 */
const MATCH_SOURCES = [
  { label: "matches.2.csv", urls: () => ["/matches.2.csv"] },
  { label: "2024/25 matches", urls: candidateUrlsForPl202425 },
  { label: "2025/26 matches (football-data E0)", urls: candidateUrlsForFootball2526 },
];

export function parseScore(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Finished fixture with both scores present (excludes scheduled / TBD rows). */
export function isMatchCompleted(m) {
  return Boolean(
    m &&
      m.status !== "scheduled" &&
      m.homeScore != null &&
      m.awayScore != null &&
      Number.isFinite(Number(m.homeScore)) &&
      Number.isFinite(Number(m.awayScore))
  );
}

/** Opening calendar year of a season label (e.g. 1992 from "1992/1993" or "92/93"). */
function seasonOpeningYear(season) {
  const s = String(season ?? "").trim();
  if (!s) return null;
  const m4 = s.match(/^(\d{4})(?=[/-]|$)/);
  if (m4) return parseInt(m4[1], 10);
  const m2 = s.match(/^(\d{2})[/-](\d{2})/);
  if (m2) {
    const y = parseInt(m2[1], 10);
    return y >= 70 ? 1900 + y : 2000 + y;
  }
  return null;
}

/**
 * EPL: 22 teams from 1992–93 through 1994–95 → 42 matches; 20 teams from 1995–96 → 38 matches.
 */
export function maxGameweekForSeason(season) {
  const y = seasonOpeningYear(season);
  if (y != null && y >= 1992 && y <= 1994) return 42;
  return 38;
}

function parseGameweek(raw, maxAllowed) {
  if (raw == null || raw === "") return null;
  const cap = maxAllowed ?? 42;
  const n = parseInt(String(raw).trim(), 10);
  return Number.isFinite(n) && n >= 1 && n <= cap ? n : null;
}

function addTeamGameweek(teamGws, team, gw) {
  if (!teamGws.has(team)) teamGws.set(team, new Set());
  teamGws.get(team).add(gw);
}

function inferFinishedGameweeks(allSeasonMatches) {
  const maxGw = maxGameweekForSeason(allSeasonMatches[0]?.season);
  const teamGws = new Map();
  for (const m of allSeasonMatches) {
    if (!isMatchCompleted(m) || m.gameweek == null) continue;
    addTeamGameweek(teamGws, m.homeTeam, m.gameweek);
    addTeamGameweek(teamGws, m.awayTeam, m.gameweek);
  }
  const toInfer = allSeasonMatches
    .filter((m) => isMatchCompleted(m) && m.gameweek == null)
    .sort(
      (a, b) =>
        String(a.date).localeCompare(String(b.date)) ||
        String(a.homeTeam).localeCompare(String(b.homeTeam))
    );
  for (const m of toInfer) {
    let g = 1;
    while (g <= maxGw) {
      const hs = teamGws.get(m.homeTeam) || new Set();
      const as = teamGws.get(m.awayTeam) || new Set();
      if (!hs.has(g) && !as.has(g)) break;
      g += 1;
    }
    const gw = Math.min(g, maxGw);
    m.gameweek = gw;
    addTeamGameweek(teamGws, m.homeTeam, gw);
    addTeamGameweek(teamGws, m.awayTeam, gw);
  }
}

function assignScheduledGameweeks(allSeasonMatches) {
  const maxGw = maxGameweekForSeason(allSeasonMatches[0]?.season);
  const teamGws = new Map();
  for (const m of allSeasonMatches) {
    if (m.gameweek == null) continue;
    addTeamGameweek(teamGws, m.homeTeam, m.gameweek);
    addTeamGameweek(teamGws, m.awayTeam, m.gameweek);
  }
  const scheduled = allSeasonMatches
    .filter((m) => m.status === "scheduled" && m.gameweek == null)
    .sort(
      (a, b) =>
        String(a.date).localeCompare(String(b.date)) ||
        String(a.homeTeam).localeCompare(String(b.homeTeam))
    );
  for (const m of scheduled) {
    let g = 1;
    while (g <= maxGw) {
      const hs = teamGws.get(m.homeTeam) || new Set();
      const as = teamGws.get(m.awayTeam) || new Set();
      if (!hs.has(g) && !as.has(g)) break;
      g += 1;
    }
    const gw = Math.min(g, maxGw);
    m.gameweek = gw;
    addTeamGameweek(teamGws, m.homeTeam, gw);
    addTeamGameweek(teamGws, m.awayTeam, gw);
  }
}

export function applyGameweekInference(matches) {
  const bySeason = new Map();
  for (const m of matches) {
    if (!bySeason.has(m.season)) bySeason.set(m.season, []);
    bySeason.get(m.season).push(m);
  }
  for (const arr of bySeason.values()) {
    inferFinishedGameweeks(arr);
    assignScheduledGameweeks(arr);
  }
}

/** Unify season labels so shorthand and hyphen forms match "YYYY/YYYY" in the UI. */
export function normalizeSeason(raw) {
  const s = String(raw ?? "").trim();
  if (s === "2425" || s === "2024-25" || s === "2024-2025") {
    return "2024/2025";
  }
  if (s === "2526" || s === "2025-26" || s === "2025-2026") {
    return "2025/2026";
  }
  const hy = s.match(/^(\d{4})-(\d{2})$/);
  if (hy) {
    const y1 = parseInt(hy[1], 10);
    const y2short = parseInt(hy[2], 10);
    const y2 = y2short < 70 ? 2000 + y2short : 1900 + y2short;
    return `${y1}/${y2}`;
  }
  return s;
}

const byDateDesc = (a, b) => String(b.date).localeCompare(String(a.date));

function matchKey(m) {
  return `${m.season}|${m.date}|${String(m.homeTeam).toLowerCase()}|${String(m.awayTeam).toLowerCase()}`;
}

function parseScoreDashCell(scoreRaw) {
  const s = String(scoreRaw ?? "").trim();
  if (!s) return null;
  const parts = s.split(/\s*[–-]\s*/);
  if (parts.length !== 2) return null;
  const homeScore = parseScore(parts[0]);
  const awayScore = parseScore(parts[1]);
  if (homeScore === null || awayScore === null) return null;
  return { homeScore, awayScore };
}

function parseFootballDataUkDate(raw) {
  const s = String(raw ?? "").trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return s;
  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  return `${m[3]}-${mm}-${dd}`;
}

/** Align football-data.co.uk names with club logos / prior CSVs. */
const FOOTBALL_DATA_TEAM_DISPLAY = {
  "Man City": "Manchester City",
  "Man United": "Manchester Utd",
  Newcastle: "Newcastle Utd",
  "Nott'm Forest": "Nott'ham Forest",
  Leeds: "Leeds United",
};

function mapFootballDataTeamName(raw) {
  const s = String(raw ?? "").trim();
  return FOOTBALL_DATA_TEAM_DISPLAY[s] || s;
}

const SEASON_2024_25 = "2024/2025";
const SEASON_2025_26 = "2025/2026";

/**
 * League-wide results (matches.2.csv), 2024/25 (pl_matches), 2025/26 (football-data E0).
 */
export function normalizeMatchRow(row) {
  const dateLeague = row.Date ?? row.date;

  if (row.home_team && row.away_team && row.date) {
    const scores = parseScoreDashCell(row.score);
    if (!scores) return null;
    const seasonNorm = normalizeSeason(row.season ?? row.Season ?? SEASON_2024_25);
    return {
      season: seasonNorm,
      date: String(row.date).trim(),
      homeTeam: String(row.home_team).trim(),
      awayTeam: String(row.away_team).trim(),
      homeScore: scores.homeScore,
      awayScore: scores.awayScore,
      gameweek: parseGameweek(row.gameweek, maxGameweekForSeason(seasonNorm)),
      status: "finished",
      kickoff: null,
    };
  }

  if (row.HomeTeam && row.AwayTeam && dateLeague) {
    const homeScore = parseScore(row.FTHG);
    const awayScore = parseScore(row.FTAG);
    const finished = homeScore !== null && awayScore !== null;
    if (!finished) {
      return {
        season: SEASON_2025_26,
        date: parseFootballDataUkDate(dateLeague),
        homeTeam: mapFootballDataTeamName(row.HomeTeam),
        awayTeam: mapFootballDataTeamName(row.AwayTeam),
        homeScore: null,
        awayScore: null,
        gameweek: null,
        status: "scheduled",
        kickoff: row.Time != null ? String(row.Time).trim() : null,
      };
    }
    return {
      season: SEASON_2025_26,
      date: parseFootballDataUkDate(dateLeague),
      homeTeam: mapFootballDataTeamName(row.HomeTeam),
      awayTeam: mapFootballDataTeamName(row.AwayTeam),
      homeScore,
      awayScore,
      gameweek: null,
      status: "finished",
      kickoff: row.Time != null ? String(row.Time).trim() : null,
    };
  }

  if (row.Home && row.Away && dateLeague) {
    const homeScore = parseScore(row["Home Goals"]);
    const awayScore = parseScore(row["Away Goals"]);
    if (homeScore === null || awayScore === null) {
      return null;
    }
    const seasonNorm = normalizeSeason(row.Season ?? row.season ?? "");
    return {
      season: seasonNorm,
      date: String(dateLeague).trim(),
      homeTeam: String(row.Home).trim(),
      awayTeam: String(row.Away).trim(),
      homeScore,
      awayScore,
      gameweek: parseGameweek(row.GW ?? row.gameweek ?? row.Gameweek, maxGameweekForSeason(seasonNorm)),
      status: "finished",
      kickoff: null,
    };
  }

  if (row.date && row.team && row.opponent && row.venue) {
    const gf = parseScore(row.gf ?? row.GF);
    const ga = parseScore(row.ga ?? row.GA);
    if (gf === null || ga === null) {
      return null;
    }
    const isHome = String(row.venue).trim().toLowerCase() === "home";
    const seasonNorm = normalizeSeason(row.season ?? row.Season ?? "");
    return {
      season: seasonNorm,
      date: String(row.date).trim(),
      homeTeam: isHome ? String(row.team).trim() : String(row.opponent).trim(),
      awayTeam: isHome ? String(row.opponent).trim() : String(row.team).trim(),
      homeScore: isHome ? gf : ga,
      awayScore: isHome ? ga : gf,
      gameweek: parseGameweek(row.GW ?? row.gameweek ?? row.Gameweek, maxGameweekForSeason(seasonNorm)),
      status: "finished",
      kickoff: null,
    };
  }

  return null;
}

async function fetchTextFirstOk(urls, label) {
  const errors = [];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        return await res.text();
      }
      errors.push(`${url} → HTTP ${res.status}`);
    } catch (err) {
      errors.push(`${url} → ${err?.message || err}`);
    }
  }
  console.warn(`[matchDatasets] All fetch attempts failed for ${label}:`, errors.join("; "));
  return null;
}

export async function loadNormalizedMatches() {
  const texts = [];
  for (const { label, urls } of MATCH_SOURCES) {
    const urlList = urls();
    const text = await fetchTextFirstOk(urlList, label);
    if (text !== null) {
      texts.push(text);
    }
  }

  if (texts.length === 0) {
    throw new Error(
      "No match CSV files could be loaded. Add CSVs under Frontend/public and/or deploy Backend with match-data on the classpath."
    );
  }

  const merged = [];
  for (const text of texts) {
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    for (const row of parsed.data || []) {
      const m = normalizeMatchRow(row);
      if (m) {
        merged.push(m);
      }
    }
  }

  const byKey = new Map();
  for (const m of merged) {
    const k = matchKey(m);
    const prev = byKey.get(k);
    if (!prev) {
      byKey.set(k, m);
    } else if ((prev.gameweek == null || prev.gameweek === "") && m.gameweek != null) {
      byKey.set(k, m);
    }
  }

  const deduped = [...byKey.values()];
  applyGameweekInference(deduped);
  deduped.sort(byDateDesc);
  return deduped;
}
