import { useCallback, useEffect, useMemo, useState } from "react";
import AnimatedLetters from "../AnimatedLetters";
import { loadNormalizedMatches, isMatchCompleted } from "../../utils/matchDatasets";
import { getEplTeamLogoUrl } from "../../utils/eplTeamLogos";
import "./index.scss";

const seasonSortDesc = (a, b) => String(b).localeCompare(String(a));
const compareRows = (a, b) =>
  b.points - a.points ||
  b.goalDifference - a.goalDifference ||
  b.goalsFor - a.goalsFor ||
  a.team.name.localeCompare(b.team.name);

const CHAMPIONS_LEAGUE_SPOTS = 4;
const EUROPA_LEAGUE_SPOTS = 2;
const CONFERENCE_LEAGUE_SPOTS = 1;

const buildStandingsTable = (matches, season) => {
  const tableMap = new Map();
  matches
    .filter((m) => m.season === season && isMatchCompleted(m))
    .forEach((match) => {
      const ensure = (name) => {
        if (!tableMap.has(name)) {
          tableMap.set(name, {
            team: { id: name, name },
            playedGames: 0,
            won: 0,
            draw: 0,
            lost: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            points: 0,
          });
        }
        return tableMap.get(name);
      };

      const home = ensure(match.homeTeam);
      const away = ensure(match.awayTeam);
      const hg = match.homeScore;
      const ag = match.awayScore;

      home.playedGames += 1;
      away.playedGames += 1;
      home.goalsFor += hg;
      home.goalsAgainst += ag;
      away.goalsFor += ag;
      away.goalsAgainst += hg;

      if (hg > ag) {
        home.won += 1;
        home.points += 3;
        away.lost += 1;
      } else if (ag > hg) {
        away.won += 1;
        away.points += 3;
        home.lost += 1;
      } else {
        home.draw += 1;
        away.draw += 1;
        home.points += 1;
        away.points += 1;
      }
    });

  return [...tableMap.values()]
    .map((row) => ({
      ...row,
      goalDifference: row.goalsFor - row.goalsAgainst,
    }))
    .sort(compareRows)
    .map((row, index) => ({ ...row, position: index + 1 }));
};

const getQualificationClass = (position) => {
  if (position <= CHAMPIONS_LEAGUE_SPOTS) return "qual-cl";
  if (position <= CHAMPIONS_LEAGUE_SPOTS + EUROPA_LEAGUE_SPOTS) return "qual-el";
  if (position <= CHAMPIONS_LEAGUE_SPOTS + EUROPA_LEAGUE_SPOTS + CONFERENCE_LEAGUE_SPOTS) return "qual-ecl";
  return "";
};

const getTeamLogo = (teamName) => getEplTeamLogoUrl(teamName);

const Standings = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allMatches, setAllMatches] = useState([]);
  const [table, setTable] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState("");
  const [letterClass] = useState("text-animate");

  const fetchStandings = useCallback(async (isInitialLoad = false) => {
    try {
      if (!isInitialLoad) setIsRefreshing(true);
      const normalized = await loadNormalizedMatches();
      setAllMatches(normalized);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      if (isInitialLoad) setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStandings(true);
  }, [fetchStandings]);

  const seasons = useMemo(() => {
    const unique = new Set(allMatches.map((m) => m.season).filter(Boolean));
    return [...unique].sort(seasonSortDesc);
  }, [allMatches]);

  useEffect(() => {
    if (!selectedSeason && seasons.length > 0) {
      setSelectedSeason(seasons[0]);
    }
  }, [selectedSeason, seasons]);

  useEffect(() => {
    if (!selectedSeason) return;
    setTable(buildStandingsTable(allMatches, selectedSeason));
  }, [allMatches, selectedSeason]);

  if (loading) return <p>Loading standings...</p>;
  if (error) return <p>Error loading standings: {error.message}</p>;

  return (
    <div className="container standings-page browse-page">
      <div className="browse-page__glass">
        <p className="browse-page__eyebrow">League table</p>
        <h1 className="page-title">
          <AnimatedLetters letterClass={letterClass} strArray={"Standings".split("")} idx={12} />
        </h1>
        <p className="browse-page__intro">Separate table view by season.</p>
        <p className="status">Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : "N/A"}</p>
        <button className="refresh-button" onClick={() => fetchStandings(false)} disabled={isRefreshing}>
          {isRefreshing ? "Refreshing..." : "Refresh now"}
        </button>
        <div className="season-filter">
          <select
            className="season-select"
            value={selectedSeason}
            onChange={(event) => setSelectedSeason(event.target.value)}
          >
            {seasons.map((season) => (
              <option key={season} value={season}>
                {season}
              </option>
            ))}
          </select>
        </div>
        <div className="standings-table-wrapper">
          <table className="standings-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Club</th>
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
              {table.map((row) => (
                <tr key={row.team.id} className={getQualificationClass(row.position)}>
                  <td>{row.position}</td>
                  <td>
                    <span className="club-cell">
                      {getTeamLogo(row.team.name) && (
                        <img
                          src={getTeamLogo(row.team.name)}
                          alt={`${row.team.name} logo`}
                          className="club-logo"
                          loading="lazy"
                        />
                      )}
                      <span>{row.team.name}</span>
                    </span>
                  </td>
                  <td>{row.playedGames}</td>
                  <td>{row.won}</td>
                  <td>{row.draw}</td>
                  <td>{row.lost}</td>
                  <td>{row.goalsFor}</td>
                  <td>{row.goalsAgainst}</td>
                  <td>{row.goalDifference}</td>
                  <td>{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="qualification-legend">
          <span className="legend-item cl">Champions League</span>
          <span className="legend-item el">Europa League</span>
          <span className="legend-item ecl">Conference League</span>
        </div>
      </div>
    </div>
  );
};

export default Standings;
