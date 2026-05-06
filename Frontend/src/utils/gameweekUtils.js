import { isMatchCompleted } from "./matchDatasets";

const compareTableRows = (a, b) =>
  b.points - a.points ||
  b.gd - a.gd ||
  b.gf - a.gf ||
  a.team.localeCompare(b.team);

const emptyRow = (team) => ({
  team,
  played: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  gf: 0,
  ga: 0,
  gd: 0,
  points: 0,
});

/**
 * @param {Array<{ homeTeam: string, awayTeam: string, homeScore: number, awayScore: number }>} matches — finished only
 */
export function buildMiniTableFromMatches(matches) {
  const map = new Map();
  const ensure = (name) => {
    if (!map.has(name)) map.set(name, emptyRow(name));
    return map.get(name);
  };

  for (const match of matches) {
    if (!isMatchCompleted(match)) continue;
    const homeName = match.homeTeam;
    const awayName = match.awayTeam;
    const homeGoals = Number(match.homeScore);
    const awayGoals = Number(match.awayScore);

    const home = ensure(homeName);
    const away = ensure(awayName);

    home.played += 1;
    away.played += 1;
    home.gf += homeGoals;
    home.ga += awayGoals;
    away.gf += awayGoals;
    away.ga += homeGoals;

    if (homeGoals > awayGoals) {
      home.wins += 1;
      home.points += 3;
      away.losses += 1;
    } else if (awayGoals > homeGoals) {
      away.wins += 1;
      away.points += 3;
      home.losses += 1;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  return [...map.values()].map((row) => ({
    ...row,
    gd: row.gf - row.ga,
  }));
}

/**
 * Full table before gameweek `beforeGameweek` (exclusive), with every team in `allTeams` present.
 * @returns {Array<{ position: number, team: string, played: number, wins: number, draws: number, losses: number, gf: number, ga: number, gd: number, points: number }>}
 */
export function buildSnapshotBeforeGameweek(seasonMatches, beforeGameweek, allTeams) {
  const ms = seasonMatches.filter(
    (m) =>
      isMatchCompleted(m) &&
      m.gameweek != null &&
      Number(m.gameweek) < beforeGameweek
  );
  const rows = buildMiniTableFromMatches(ms);
  const byName = new Map(rows.map((r) => [r.team, r]));
  const full = [...allTeams].map((name) => {
    const r = byName.get(name);
    return r ? { ...r } : emptyRow(name);
  });
  full.sort(compareTableRows);
  return full.map((r, i) => ({ ...r, position: i + 1 }));
}

/**
 * Last `limit` results for `team` before gameweek `gameweek` (strictly earlier GWs only).
 * Oldest on the left (array order); pads with null up to `limit`.
 * @returns {Array<'W'|'D'|'L'|null>}
 */
export function getFormDotsBeforeGameweek(team, seasonMatches, gameweek, limit = 5) {
  const ms = seasonMatches.filter(
    (m) =>
      isMatchCompleted(m) &&
      m.gameweek != null &&
      Number(m.gameweek) < gameweek &&
      (m.homeTeam === team || m.awayTeam === team)
  );
  ms.sort(
    (a, b) =>
      String(a.date).localeCompare(String(b.date)) ||
      String(a.homeTeam).localeCompare(String(b.homeTeam))
  );
  const last = ms.slice(-limit);
  const out = last.map((m) => {
    const isHome = m.homeTeam === team;
    const hg = Number(m.homeScore);
    const ag = Number(m.awayScore);
    if (hg > ag) return isHome ? "W" : "L";
    if (hg < ag) return isHome ? "L" : "W";
    return "D";
  });
  while (out.length < limit) out.unshift(null);
  return out.slice(-limit);
}

export function collectTeamsInSeason(seasonMatches) {
  const s = new Set();
  for (const m of seasonMatches) {
    s.add(m.homeTeam);
    s.add(m.awayTeam);
  }
  return [...s].sort((a, b) => a.localeCompare(b));
}

export function formatRecord(r) {
  if (!r) return "—";
  if (r.played === 0) return "0-0-0";
  return `${r.wins}-${r.draws}-${r.losses}`;
}
