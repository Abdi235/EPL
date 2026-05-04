import Papa from "papaparse";

const MATCH_SOURCES = ["/matches.2.csv", "/pl_matches_2024_25.csv", "/team_match_stats.csv"];

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

const SEASON_2024_25 = "2024/2025";

/**
 * League-wide results (matches.2.csv), 2024/25 fixtures (pl_matches_2024_25.csv),
 * plus per-team logs (team_match_stats.csv).
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

export async function loadNormalizedMatches() {
  const texts = [];
  for (const url of MATCH_SOURCES) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        // Historical league file is optional on some deploys; team log may be enough for current season.
        console.warn(`[matchDatasets] Skipping ${url}: HTTP ${res.status}`);
        continue;
      }
      texts.push(await res.text());
    } catch (err) {
      console.warn(`[matchDatasets] Failed to fetch ${url}`, err);
    }
  }

  if (texts.length === 0) {
    throw new Error("No match CSV files could be loaded. Check that files exist under /public.");
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
