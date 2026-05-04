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

/** Unify season labels so shorthand and hyphen forms match "YYYY/YYYY" in the UI. */
export function normalizeSeason(raw) {
  const s = String(raw ?? "").trim();
  if (s === "2425" || s === "2024-25" || s === "2024-2025") {
    return "2024/2025";
  }
  if (s === "2526" || s === "2025-26" || s === "2025-2026") {
    return "2025/2026";
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
    return {
      season: normalizeSeason(row.season ?? row.Season ?? SEASON_2024_25),
      date: String(row.date).trim(),
      homeTeam: String(row.home_team).trim(),
      awayTeam: String(row.away_team).trim(),
      homeScore: scores.homeScore,
      awayScore: scores.awayScore,
    };
  }

  if (row.HomeTeam && row.AwayTeam && dateLeague && row.FTHG !== undefined && row.FTAG !== undefined) {
    const homeScore = parseScore(row.FTHG);
    const awayScore = parseScore(row.FTAG);
    if (homeScore === null || awayScore === null) {
      return null;
    }
    return {
      season: SEASON_2025_26,
      date: parseFootballDataUkDate(dateLeague),
      homeTeam: mapFootballDataTeamName(row.HomeTeam),
      awayTeam: mapFootballDataTeamName(row.AwayTeam),
      homeScore,
      awayScore,
    };
  }

  if (row.Home && row.Away && dateLeague) {
    const homeScore = parseScore(row["Home Goals"]);
    const awayScore = parseScore(row["Away Goals"]);
    if (homeScore === null || awayScore === null) {
      return null;
    }
    return {
      season: normalizeSeason(row.Season ?? row.season ?? ""),
      date: String(dateLeague).trim(),
      homeTeam: String(row.Home).trim(),
      awayTeam: String(row.Away).trim(),
      homeScore,
      awayScore,
    };
  }

  if (row.date && row.team && row.opponent && row.venue) {
    const gf = parseScore(row.gf ?? row.GF);
    const ga = parseScore(row.ga ?? row.GA);
    if (gf === null || ga === null) {
      return null;
    }
    const isHome = String(row.venue).trim().toLowerCase() === "home";
    return {
      season: normalizeSeason(row.season ?? row.Season ?? ""),
      date: String(row.date).trim(),
      homeTeam: isHome ? String(row.team).trim() : String(row.opponent).trim(),
      awayTeam: isHome ? String(row.opponent).trim() : String(row.team).trim(),
      homeScore: isHome ? gf : ga,
      awayScore: isHome ? ga : gf,
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

  const seen = new Set();
  const deduped = [];
  for (const m of merged) {
    const k = matchKey(m);
    if (seen.has(k)) {
      continue;
    }
    seen.add(k);
    deduped.push(m);
  }

  deduped.sort(byDateDesc);
  return deduped;
}
