import { useCallback, useEffect, useMemo, useState } from "react";
import AnimatedLetters from "../AnimatedLetters";
import { loadNormalizedMatches, isMatchCompleted } from "../../utils/matchDatasets";
import { getEplTeamLogoUrl } from "../../utils/eplTeamLogos";
import "./index.scss";
const normalizeText = (value) => String(value || "").trim().toLowerCase();
const seasonSortDesc = (a, b) => String(b).localeCompare(String(a));
const ALL_SEASONS_VALUE = "__all_seasons__";
const ALL_GAMEWEEKS_VALUE = "__all_gameweeks__";

const getTeamLogo = (teamName) => getEplTeamLogoUrl(teamName);

const Results = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matches, setMatches] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [teamQuery, setTeamQuery] = useState("");
  const [selectedSeason, setSelectedSeason] = useState("");
  const [selectedGameweek, setSelectedGameweek] = useState(ALL_GAMEWEEKS_VALUE);
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

  useEffect(() => {
    if (!selectedSeason && seasons.length > 0) {
      setSelectedSeason(seasons[0]);
    }
  }, [selectedSeason, seasons]);

  useEffect(() => {
    setSelectedGameweek(ALL_GAMEWEEKS_VALUE);
  }, [selectedSeason]);

  const allTeams = useMemo(() => {
    const names = new Set();
    matches.forEach((match) => {
      names.add(match.homeTeam);
      names.add(match.awayTeam);
    });
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [matches]);

  const availableGameweeks = useMemo(() => {
    if (!selectedSeason || selectedSeason === ALL_SEASONS_VALUE) return [];
    const set = new Set(
      matches
        .filter((m) => String(m.season || "").trim() === selectedSeason && m.gameweek != null)
        .map((m) => Number(m.gameweek))
        .filter((n) => Number.isFinite(n))
    );
    return [...set].sort((a, b) => b - a);
  }, [matches, selectedSeason]);

  const filteredMatches = useMemo(() => {
    const query = normalizeText(teamQuery);
    const season = normalizeText(selectedSeason);
    const useAllSeasons = selectedSeason === ALL_SEASONS_VALUE;
    const selectedGw = Number(selectedGameweek);
    const useAllGameweeks =
      selectedGameweek === ALL_GAMEWEEKS_VALUE || selectedSeason === ALL_SEASONS_VALUE;

    return matches.filter((match) => {
      if (!useAllSeasons && season && normalizeText(match.season) !== season) return false;
      if (!useAllGameweeks) {
        if (match.gameweek == null || Number(match.gameweek) !== selectedGw) return false;
      }
      if (!query) return true;
      const home = normalizeText(match.homeTeam);
      const away = normalizeText(match.awayTeam);
      return home.includes(query) || away.includes(query);
    });
  }, [matches, selectedSeason, selectedGameweek, teamQuery]);

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

  if (loading) return <p>Loading results...</p>;
  if (error) return <p>Error loading results: {error.message}</p>;

  return (
    <div className="container results-page browse-page">
      <div className="browse-page__glass">
        <p className="browse-page__eyebrow">Fixtures</p>
        <h1 className="page-title">
          <AnimatedLetters
            letterClass={letterClass}
            strArray={"Results".split("")}
            idx={12}
          />
        </h1>
        <p className="browse-page__intro">
          Filter by season, gameweek, and team to inspect specific results quickly.
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
          <select
            className="team-search-input"
            value={selectedGameweek}
            onChange={(event) => setSelectedGameweek(event.target.value)}
            disabled={selectedSeason === ALL_SEASONS_VALUE}
          >
            <option value={ALL_GAMEWEEKS_VALUE}>All gameweeks</option>
            {availableGameweeks.map((gw) => (
              <option key={gw} value={String(gw)}>
                Gameweek {gw}
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

      </div>
    </div>
  );
};

export default Results;