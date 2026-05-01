import { useCallback, useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import AnimatedLetters from "../AnimatedLetters";
import "./index.scss";

const parseScore = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const normalizeMatch = (row) => {
  // Dataset style 1 (league fixtures): Date, Home, Home Goals, Away Goals, Away
  if (row.Date && row.Home && row.Away) {
    const homeScore = parseScore(row["Home Goals"]);
    const awayScore = parseScore(row["Away Goals"]);
    if (homeScore === null || awayScore === null) return null;
    return {
      season: String(row.Season || row.season || "").trim(),
      date: String(row.Date).trim(),
      homeTeam: String(row.Home).trim(),
      awayTeam: String(row.Away).trim(),
      homeScore,
      awayScore,
    };
  }

  // Dataset style 2 (single-team logs): date, venue, team, opponent, gf, ga
  if (row.date && row.team && row.opponent && row.venue) {
    const gf = parseScore(row.gf);
    const ga = parseScore(row.ga);
    if (gf === null || ga === null) return null;

    const isHome = String(row.venue).trim().toLowerCase() === "home";
    return {
      season: String(row.season || row.Season || "").trim(),
      date: String(row.date).trim(),
      homeTeam: isHome ? String(row.team).trim() : String(row.opponent).trim(),
      awayTeam: isHome ? String(row.opponent).trim() : String(row.team).trim(),
      homeScore: isHome ? gf : ga,
      awayScore: isHome ? ga : gf,
    };
  }

  return null;
};

const byDateDesc = (a, b) => String(b.date).localeCompare(String(a.date));
const normalizeText = (value) => String(value || "").trim().toLowerCase();
const seasonSortDesc = (a, b) => String(b).localeCompare(String(a));
const ALL_SEASONS_VALUE = "__all_seasons__";
const TEAM_LOGOS = {
  arsenal: "https://media.api-sports.io/football/teams/42.png",
  "aston villa": "https://media.api-sports.io/football/teams/66.png",
  bournemouth: "https://media.api-sports.io/football/teams/35.png",
  brentford: "https://media.api-sports.io/football/teams/55.png",
  brighton: "https://media.api-sports.io/football/teams/51.png",
  burnley: "https://media.api-sports.io/football/teams/44.png",
  chelsea: "https://media.api-sports.io/football/teams/49.png",
  "crystal palace": "https://media.api-sports.io/football/teams/52.png",
  everton: "https://media.api-sports.io/football/teams/45.png",
  fulham: "https://media.api-sports.io/football/teams/36.png",
  ipswich: "https://media.api-sports.io/football/teams/57.png",
  "ipswich town": "https://media.api-sports.io/football/teams/57.png",
  leeds: "https://media.api-sports.io/football/teams/63.png",
  "leeds united": "https://media.api-sports.io/football/teams/63.png",
  leicester: "https://media.api-sports.io/football/teams/46.png",
  "leicester city": "https://media.api-sports.io/football/teams/46.png",
  liverpool: "https://media.api-sports.io/football/teams/40.png",
  "manchester city": "https://media.api-sports.io/football/teams/50.png",
  "man city": "https://media.api-sports.io/football/teams/50.png",
  "manchester utd": "https://media.api-sports.io/football/teams/33.png",
  "manchester united": "https://media.api-sports.io/football/teams/33.png",
  "man utd": "https://media.api-sports.io/football/teams/33.png",
  "newcastle utd": "https://media.api-sports.io/football/teams/34.png",
  "newcastle united": "https://media.api-sports.io/football/teams/34.png",
  norwich: "https://media.api-sports.io/football/teams/71.png",
  "norwich city": "https://media.api-sports.io/football/teams/71.png",
  "nott'ham forest": "https://media.api-sports.io/football/teams/65.png",
  "nottingham forest": "https://media.api-sports.io/football/teams/65.png",
  southampton: "https://media.api-sports.io/football/teams/41.png",
  tottenham: "https://media.api-sports.io/football/teams/47.png",
  "tottenham hotspur": "https://media.api-sports.io/football/teams/47.png",
  watford: "https://media.api-sports.io/football/teams/38.png",
  "west ham": "https://media.api-sports.io/football/teams/48.png",
  "west ham united": "https://media.api-sports.io/football/teams/48.png",
  wolves: "https://media.api-sports.io/football/teams/39.png",
  "wolverhampton wanderers": "https://media.api-sports.io/football/teams/39.png",
  "sheffield utd": "https://media.api-sports.io/football/teams/62.png",
  "sheffield united": "https://media.api-sports.io/football/teams/62.png",
};

const createInitialRow = (team) => ({
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

const compareTableRows = (a, b) =>
  b.points - a.points ||
  b.gd - a.gd ||
  b.gf - a.gf ||
  a.team.localeCompare(b.team);

const buildSeasonTables = (normalizedMatches) => {
  const seasonMap = new Map();

  normalizedMatches.forEach((match) => {
    const season = String(match.season || "").trim();
    if (!season) return;

    if (!seasonMap.has(season)) {
      seasonMap.set(season, new Map());
    }

    const teamRows = seasonMap.get(season);
    const homeName = match.homeTeam;
    const awayName = match.awayTeam;
    const homeGoals = Number(match.homeScore);
    const awayGoals = Number(match.awayScore);

    if (!teamRows.has(homeName)) teamRows.set(homeName, createInitialRow(homeName));
    if (!teamRows.has(awayName)) teamRows.set(awayName, createInitialRow(awayName));

    const home = teamRows.get(homeName);
    const away = teamRows.get(awayName);

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
  });

  return [...seasonMap.entries()]
    .map(([season, rows]) => {
      const sorted = [...rows.values()].map((row) => ({
        ...row,
        gd: row.gf - row.ga,
      })).sort(compareTableRows);

      return { season, rows: sorted };
    })
    .sort((a, b) => seasonSortDesc(a.season, b.season));
};

const getTeamLogo = (teamName) => TEAM_LOGOS[normalizeText(teamName)] || null;

const Results = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matches, setMatches] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [teamQuery, setTeamQuery] = useState("");
  const [selectedSeason, setSelectedSeason] = useState("");
  const [expandedSeasons, setExpandedSeasons] = useState({});
  const [letterClass] = useState("text-animate");

  const fetchResults = useCallback(async (isInitialLoad = false) => {
    try {
      if (!isInitialLoad) {
        setIsRefreshing(true);
      }

      // Load canonical match results dataset from public folder.
      const response = await fetch("/matches.2.csv");
      const csvText = await response.text();

      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
      });

      const normalized = (parsed.data || [])
        .map(normalizeMatch)
        .filter(Boolean)
        .sort(byDateDesc);

      setMatches(normalized);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchResults(true);
  }, [fetchResults]);

  const seasons = useMemo(() => {
    const unique = new Set(
      matches
        .map((m) => String(m.season || "").trim())
        .filter(Boolean)
    );
    return [...unique].sort(seasonSortDesc);
  }, [matches]);

  const seasonTables = useMemo(() => buildSeasonTables(matches), [matches]);

  useEffect(() => {
    if (!selectedSeason && seasons.length > 0) {
      setSelectedSeason(seasons[0]);
    }
  }, [selectedSeason, seasons]);

  useEffect(() => {
    if (!selectedSeason) return;
    setExpandedSeasons((prev) => {
      if (Object.prototype.hasOwnProperty.call(prev, selectedSeason)) return prev;
      return { ...prev, [selectedSeason]: true };
    });
  }, [selectedSeason]);

  const allTeams = useMemo(() => {
    const names = new Set();
    matches.forEach((match) => {
      names.add(match.homeTeam);
      names.add(match.awayTeam);
    });
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [matches]);

  const filteredMatches = useMemo(() => {
    const query = normalizeText(teamQuery);
    const season = normalizeText(selectedSeason);
    const useAllSeasons = selectedSeason === ALL_SEASONS_VALUE;

    return matches.filter((match) => {
      if (!useAllSeasons && season && normalizeText(match.season) !== season) return false;
      if (!query) return true;
      const home = normalizeText(match.homeTeam);
      const away = normalizeText(match.awayTeam);
      return home.includes(query) || away.includes(query);
    });
  }, [matches, selectedSeason, teamQuery]);

  const teamStats = useMemo(() => {
    const query = normalizeText(teamQuery);
    if (!query) return null;

    const exactTeam = allTeams.find((team) => normalizeText(team) === query);
    const teamName = exactTeam || teamQuery.trim();
    const target = normalizeText(teamName);

    let wins = 0;
    let losses = 0;
    let draws = 0;

    filteredMatches.forEach((match) => {
      const isHomeTeam = normalizeText(match.homeTeam) === target || (!exactTeam && normalizeText(match.homeTeam).includes(target));
      const isAwayTeam = normalizeText(match.awayTeam) === target || (!exactTeam && normalizeText(match.awayTeam).includes(target));
      if (!isHomeTeam && !isAwayTeam) return;

      if (match.homeScore === match.awayScore) {
        draws += 1;
        return;
      }

      const teamWon = (isHomeTeam && match.homeScore > match.awayScore) || (isAwayTeam && match.awayScore > match.homeScore);
      if (teamWon) wins += 1;
      else losses += 1;
    });

    return { teamName, wins, losses, draws };
  }, [allTeams, filteredMatches, teamQuery]);

  const visibleSeasonTables = useMemo(() => {
    if (!selectedSeason || selectedSeason === ALL_SEASONS_VALUE) return seasonTables;
    return seasonTables.filter((table) => table.season === selectedSeason);
  }, [seasonTables, selectedSeason]);

  const toggleSeasonTable = (season) => {
    setExpandedSeasons((prev) => ({ ...prev, [season]: !prev[season] }));
  };

  if (loading) return <p>Loading results...</p>;
  if (error) return <p>Error loading results: {error.message}</p>;

  return (
    <div className="container results-page">
      <h1 className="page-title">
        <AnimatedLetters
          letterClass={letterClass}
          strArray={"Recent Results".split("")}
          idx={12}
        />
      </h1>

      <p className="status">
        Last updated:{" "}
        {lastUpdated ? lastUpdated.toLocaleTimeString() : "N/A"}
      </p>

      <button
        className="refresh-button"
        onClick={() => fetchResults(false)}
        disabled={isRefreshing}
      >
        {isRefreshing ? "Refreshing..." : "Refresh now"}
      </button>

      <div className="results-controls">
        <select
          className="team-search-input"
          value={selectedSeason}
          onChange={(event) => setSelectedSeason(event.target.value)}
        >
          <option value={ALL_SEASONS_VALUE}>All seasons</option>
          {seasons.map((season) => (
            <option key={season} value={season}>
              {season}
            </option>
          ))}
        </select>
        <input
          className="team-search-input"
          type="text"
          placeholder="Search by team (e.g. Arsenal)"
          value={teamQuery}
          list="results-team-list"
          onChange={(event) => setTeamQuery(event.target.value)}
        />
        <datalist id="results-team-list">
          {allTeams.map((team) => (
            <option key={team} value={team} />
          ))}
        </datalist>
      </div>

      {teamStats && (
        <p className="team-stats">
          {teamStats.teamName} - Wins: {teamStats.wins} | Losses: {teamStats.losses} | Draws: {teamStats.draws}
        </p>
      )}

      <div className="match-list">
        {filteredMatches.length === 0 && (
          <p>No recent EPL results available.</p>
        )}

        {filteredMatches.map((match, index) => (
          <div className="match-card" key={index}>
            <p className="date">{match.date}</p>

            <div className="teams">
              <span className="team-cell">
                {getTeamLogo(match.homeTeam) && (
                  <img
                    src={getTeamLogo(match.homeTeam)}
                    alt={`${match.homeTeam} logo`}
                    className="team-logo"
                    loading="lazy"
                  />
                )}
                <span>{match.homeTeam}</span>
              </span>
              <span>{match.homeScore}</span>
            </div>

            <div className="teams">
              <span className="team-cell">
                {getTeamLogo(match.awayTeam) && (
                  <img
                    src={getTeamLogo(match.awayTeam)}
                    alt={`${match.awayTeam} logo`}
                    className="team-logo"
                    loading="lazy"
                  />
                )}
                <span>{match.awayTeam}</span>
              </span>
              <span>{match.awayScore}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="season-tables">
        <h2>Season Tables</h2>
        {visibleSeasonTables.map((seasonTable) => (
          <div key={seasonTable.season} className="season-table-card">
            <button
              type="button"
              className="season-table-toggle"
              onClick={() => toggleSeasonTable(seasonTable.season)}
            >
              <span>{seasonTable.season}</span>
              <span>{expandedSeasons[seasonTable.season] ? "Hide" : "Show"}</span>
            </button>
            {expandedSeasons[seasonTable.season] && (
              <div className="season-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Team</th>
                      <th>P</th>
                      <th>W</th>
                      <th>D</th>
                      <th>L</th>
                      <th>GF</th>
                      <th>GA</th>
                      <th>GD</th>
                      <th>Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seasonTable.rows.map((row, index) => (
                      <tr key={`${seasonTable.season}-${row.team}`}>
                        <td>{index + 1}</td>
                        <td>{row.team}</td>
                        <td>{row.played}</td>
                        <td>{row.wins}</td>
                        <td>{row.draws}</td>
                        <td>{row.losses}</td>
                        <td>{row.gf}</td>
                        <td>{row.ga}</td>
                        <td>{row.gd}</td>
                        <td>{row.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Results;