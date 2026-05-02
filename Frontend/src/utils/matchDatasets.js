import Papa from "papaparse";

const MATCH_SOURCES = ["/matches.2.csv", "/team_match_stats.csv"];

export function parseScore(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Unify season labels so 2025/26 data lines up with older "YYYY/YYYY" strings. */
export function normalizeSeason(raw) {
  const s = String(raw ?? "").trim();
  if (s === "2526" || s === "2025-26" || s === "2025-2026") {
    return "2025/2026";
  }
  return s;
}

const byDateDesc = (a, b) => String(b.date).localeCompare(String(a.date));

function matchKey(m) {
  return `${m.season}|${m.date}|${String(m.homeTeam).toLowerCase()}|${String(m.awayTeam).toLowerCase()}`;
}

/**
 * League-wide results (matches.2.csv) plus per-team logs (team_match_stats.csv, 2025/26).
 */
export function normalizeMatchRow(row) {
  const dateLeague = row.Date ?? row.date;

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
  const texts = await Promise.all(
    MATCH_SOURCES.map(async (url) => {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to load ${url}: ${res.status}`);
      }
      return res.text();
    })
  );

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
