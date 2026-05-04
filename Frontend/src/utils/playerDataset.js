import Papa from "papaparse";
import nationData from "../data/nations.json";

const PLAYER_SOURCE = "/epl_player_stats_24_25.csv";

/** URL query uses GK/DF/MF/FW; CSV uses GKP/DEF/MID/FWD */
const POSITION_URL_TO_CSV = {
  GK: "GKP",
  DF: "DEF",
  MF: "MID",
  FW: "FWD",
};

function parseNum(value) {
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

function resolveCsvPositionFromQuery(param) {
  if (!param) return null;
  const u = String(param).trim().toUpperCase();
  return POSITION_URL_TO_CSV[u] || String(param).trim();
}

export function csvRowToPlayer(row, index) {
  return {
    id: index + 1,
    name: String(row["Player Name"] ?? "").trim(),
    team: String(row.Club ?? "").trim(),
    nation: String(row.Nationality ?? "").trim(),
    pos: String(row.Position ?? "").trim(),
    age: null,
    mp: parseNum(row.Appearances),
    starts: null,
    min: parseNum(row.Minutes),
    gls: parseNum(row.Goals),
    ast: parseNum(row.Assists),
    pk: parseNum(row["Penalties Saved"]) ?? 0,
    crdy: parseNum(row["Yellow Cards"]),
    crdr: parseNum(row["Red Cards"]),
    xg: 0,
    xag: 0,
  };
}

let playersCache = null;

export async function loadAllPlayersFromPublicCsv() {
  if (playersCache) return playersCache;
  const res = await fetch(PLAYER_SOURCE);
  if (!res.ok) {
    throw new Error(`Could not load player CSV (${PLAYER_SOURCE}): HTTP ${res.status}`);
  }
  const text = await res.text();
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  const rows = parsed.data || [];
  playersCache = rows
    .map((row, i) => csvRowToPlayer(row, i))
    .filter((p) => p.name);
  return playersCache;
}

export function filterPlayers(all, { team, nation, position, name }) {
  let list = Array.isArray(all) ? [...all] : [];

  if (team) {
    const want = normalizeTeamTitleForCsv(team).toLowerCase();
    list = list.filter((p) => normalizeTeamTitleForCsv(p.team).toLowerCase() === want);
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
