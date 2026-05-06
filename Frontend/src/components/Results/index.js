import { useCallback, useEffect, useMemo, useState } from "react";
import AnimatedLetters from "../AnimatedLetters";
import { loadNormalizedMatches, isMatchCompleted } from "../../utils/matchDatasets";
import { getEplTeamLogoUrl } from "../../utils/eplTeamLogos";
import "./index.scss";
const normalizeText = (value) => String(value || "").trim().toLowerCase();
const seasonSortDesc = (a, b) => String(b).localeCompare(String(a));
const ALL_SEASONS_VALUE = "__all_seasons__";

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
    if (!isMatchCompleted(match)) return;
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

const getTeamLogo = (teamName) => getEplTeamLogoUrl(teamName);

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

      const normalized = await loadNormalizedMatches();

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
      if (!isMatchCompleted(match)) return;
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
    <div className="container results-page browse-page">
      <div className="browse-page__glass">
        <p className="browse-page__eyebrow">Fixtures</p>
        <h1 className="page-title">
          <AnimatedLetters
            letterClass={letterClass}
            strArray={"Recent Results".split("")}
            idx={12}
          />
        </h1>
        <p className="browse-page__intro">
          Scan recent scorelines, filter by club or season, and expand full mini-tables when you need detail.
        </p>

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
            <p className="date">
              {match.date}
              {match.kickoff ? ` · ${match.kickoff}` : ""}
              {match.gameweek != null ? ` · GW ${match.gameweek}` : ""}
            </p>

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
              <span>{isMatchCompleted(match) ? match.homeScore : "—"}</span>
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
              <span>{isMatchCompleted(match) ? match.awayScore : "—"}</span>
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
    </div>
  );
};

export default Results;