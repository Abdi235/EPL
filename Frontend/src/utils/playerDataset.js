import Papa from "papaparse";
import nationData from "../data/nations.json";

/**
 * Per-season player CSVs. Add a row here and place the file in `public/` to support
 * another season (same "epl2024" column layout as epl_player_stats_24_25.csv), or
 * "premLegacy" for the prem_stats-style export.
 */
export const PLAYER_SEASON_CONFIG = [
  { season: "2024/2025", csv: "/epl_player_stats_24_25.csv", format: "epl2024" },
  { season: "2023/2024", csv: "/epl_player_stats_23_24.csv", format: "premLegacy" },
];

export const defaultPlayerSeason = () => PLAYER_SEASON_CONFIG[0].season;

/** URL query uses GK/DF/MF/FW; CSV uses GKP/DEF/MID/FWD */
const POSITION_URL_TO_CSV = {
  GK: "GKP",
  DF: "DEF",
  MF: "MID",
  FW: "FWD",
};

const PREM_POS_TO_CSV = {
  GK: "GKP",
  DF: "DEF",
  MF: "MID",
  FW: "FWD",
};

/** Align club strings across datasets (StatsBomb/FPL vs FBref vs site titles). */
const TEAM_SYNONYM_GROUPS = [
  ["manchester united", "manchester utd", "man utd"],
  ["wolverhampton wanderers", "wolves"],
  ["brighton & hove albion", "brighton"],
  ["newcastle united", "newcastle"],
  ["tottenham hotspur", "tottenham"],
  ["west ham united", "west ham"],
  ["nottingham forest", "nott'm forest"],
];

function teamCanonicalId(name) {
  const n = normalizeTeamTitleForCsv(name).toLowerCase();
  for (const group of TEAM_SYNONYM_GROUPS) {
    const hits = group.map((g) => normalizeTeamTitleForCsv(g).toLowerCase());
    if (hits.includes(n)) return group[0];
  }
  return n;
}

export function normalizePlayerSeasonParam(raw) {
  if (raw == null || String(raw).trim() === "") return defaultPlayerSeason();
  const decoded = decodeURIComponent(String(raw)).trim();
  const hit = PLAYER_SEASON_CONFIG.find((c) => c.season === decoded);
  if (hit) return hit.season;
  const lower = decoded.toLowerCase().replace(/\s+/g, "");
  if (lower === "2024-25" || lower === "2024/25" || lower === "2024-2025") {
    return "2024/2025";
  }
  if (lower === "2023-24" || lower === "2023/24" || lower === "2023-2024") {
    return "2023/2024";
  }
  return defaultPlayerSeason();
}

/** Consistent table display: same headers every season; missing source values show as an en dash. */
export function formatPlayerCell(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number" && Number.isFinite(value)) {
    if (Number.isInteger(value)) return String(value);
    return String(value);
  }
  return String(value);
}

export function parseNum(value) {
  const raw = String(value ?? "")
    .trim()
    .replace(/%/g, "");
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function normalizeTeamTitleForCsv(title) {
  if (title == null) return "";
  return String(title).trim().replace(/-/g, " ").trim();
}

function resolveNationNameFromQuery(param) {
  if (!param) return null;
  const p = String(param).trim();
  const hit = nationData.nations.find(
    (n) =>
      String(n.search || "").toLowerCase() === p.toLowerCase() ||
      String(n.code || "").toLowerCase() === p.toLowerCase()
  );
  if (hit?.name) return hit.name;
  return p;
}

function resolveNationFromAbbrevCell(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const m = s.match(/\b([A-Za-z]{3})\s*$/);
  if (m) {
    const code = m[1].toUpperCase();
    const hit = nationData.nations.find(
      (n) => String(n.search || "").toUpperCase() === code
    );
    if (hit?.name) return hit.name;
  }
  return s.replace(/^[a-z]{2,3}\s+/i, "").trim() || s;
}

function resolveCsvPositionFromQuery(param) {
  if (!param) return null;
  const u = String(param).trim().toUpperCase();
  return POSITION_URL_TO_CSV[u] || String(param).trim();
}

/** First numeric match across possible CSV header spellings (for richer exports). */
function parseNumFirst(row, keys) {
  for (const k of keys) {
    if (row[k] === undefined || row[k] === "") continue;
    const n = parseNum(row[k]);
    if (n != null) return n;
  }
  return null;
}

/**
 * "Penalties Kicked": penalty goals for outfield; for GKP prefer saves only if no PK-scored column exists.
 */
function penaltiesKickedFromEplRow(row, position) {
  const scored = parseNumFirst(row, [
    "Penalty Goals",
    "Penalties",
    "PK",
    "Penalties Scored",
    "Perf_PK",
  ]);
  if (scored != null) return scored;
  if (String(position).toUpperCase() === "GKP") {
    return parseNum(row["Penalties Saved"]);
  }
  return null;
}

/**
 * Maps the wide StatsPerform-style export (`epl_player_stats_24_25.csv`).
 * Same logical columns as other seasons; optional fields appear when present in the file.
 */
export function csvRowToPlayer(row, index, season) {
  const pos = String(row.Position ?? "").trim();
  return {
    id: `${season}-${index + 1}`,
    name: String(row["Player Name"] ?? "").trim(),
    team: String(row.Club ?? "").trim(),
    nation: String(row.Nationality ?? "").trim(),
    pos,
    age: parseNumFirst(row, ["Age", "age"]),
    mp: parseNumFirst(row, ["Appearances", "MP", "Playing Time_MP"]),
    starts: parseNumFirst(row, ["Starts", "starts", "Playing Time_Starts"]),
    min: parseNumFirst(row, ["Minutes", "Min", "Playing Time_Min"]),
    gls: parseNumFirst(row, ["Goals", "Gls", "Performance_Gls"]),
    ast: parseNumFirst(row, ["Assists", "Ast", "Performance_Ast"]),
    pk: penaltiesKickedFromEplRow(row, pos),
    crdy: parseNumFirst(row, ["Yellow Cards", "CrdY", "Performance_CrdY"]),
    crdr: parseNumFirst(row, ["Red Cards", "CrdR", "Performance_CrdR"]),
    xg: parseNumFirst(row, ["xG", "xg", "Expected Goals", "Expected_xG", "npxG"]),
    xag: parseNumFirst(row, ["xAG", "xag", "Expected Assists", "xA"]),
    season,
  };
}

function csvRowFromPremLegacy(row, index, season) {
  const posRaw = String(row.pos ?? "").trim().toUpperCase();
  const pos = PREM_POS_TO_CSV[posRaw] || posRaw;
  return {
    id: `${season}-${index + 1}`,
    name: String(row.name ?? "").trim(),
    team: normalizeTeamTitleForCsv(row.team),
    nation: resolveNationFromAbbrevCell(row.nation),
    pos,
    age: parseNum(row.age),
    mp: parseNum(row.mp),
    starts: parseNum(row.starts),
    min: parseNum(row.min),
    gls: parseNum(row.gls),
    ast: parseNum(row.ast),
    pk: parseNum(row.pk),
    crdy: parseNum(row.crdy),
    crdr: parseNum(row.crdr),
    xg: parseNum(row.xg),
    xag: parseNum(row.xag),
    season,
  };
}

const playersCache = new Map();

export async function loadPlayersForSeason(seasonKey) {
  const season = normalizePlayerSeasonParam(seasonKey);
  if (playersCache.has(season)) return playersCache.get(season);

  const entry = PLAYER_SEASON_CONFIG.find((c) => c.season === season);
  if (!entry) {
    throw new Error(`Unknown player season: ${season}`);
  }

  const res = await fetch(entry.csv);
  if (!res.ok) {
    throw new Error(`Could not load player CSV (${entry.csv}): HTTP ${res.status}`);
  }
  const text = await res.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  const rows = parsed.data || [];

  let players;
  if (entry.format === "epl2024") {
    players = rows
      .map((row, i) => csvRowToPlayer(row, i, season))
      .filter((p) => p.name);
  } else if (entry.format === "premLegacy") {
    players = rows
      .map((row, i) => csvRowFromPremLegacy(row, i, season))
      .filter((p) => p.name);
  } else {
    throw new Error(`Unsupported player CSV format: ${entry.format}`);
  }

  playersCache.set(season, players);
  return players;
}

/** @deprecated Prefer loadPlayersForSeason — uses the default (latest) season. */
export async function loadAllPlayersFromPublicCsv() {
  return loadPlayersForSeason(defaultPlayerSeason());
}

export function filterPlayers(all, { team, nation, position, name }) {
  let list = Array.isArray(all) ? [...all] : [];

  if (team) {
    const want = teamCanonicalId(team);
    list = list.filter((p) => teamCanonicalId(p.team) === want);
  }
  if (nation) {
    const wantNat = resolveNationNameFromQuery(nation);
    if (wantNat) {
      const w = wantNat.toLowerCase();
      list = list.filter((p) => String(p.nation).toLowerCase() === w);
    }
  }
  if (position) {
    const csvPos = resolveCsvPositionFromQuery(position);
    if (csvPos) {
      const u = String(csvPos).toUpperCase();
      list = list.filter((p) => String(p.pos).toUpperCase() === u);
    }
  }
  if (name) {
    const q = String(name).trim().toLowerCase();
    if (q) {
      list = list.filter((p) => String(p.name).toLowerCase().includes(q));
    }
  }
  return list;
}
