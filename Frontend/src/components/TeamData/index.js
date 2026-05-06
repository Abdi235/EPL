import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import "./index.scss";
import AnimatedLetters from "../AnimatedLetters";
import {
  loadPlayersForSeason,
  filterPlayers,
  normalizePlayerSeasonParam,
  PLAYER_SEASON_CONFIG,
  formatPlayerCell,
} from "../../utils/playerDataset";
import { axiosErrorMessage } from "../../utils/axiosErrorMessage";

const TeamData = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playerData, setPlayerData] = useState([]);
  const [playersToShow, setPlayersToShow] = useState(10);
  const [letterClass] = useState("text-animate");

  const season = useMemo(
    () => normalizePlayerSeasonParam(searchParams.get("season")),
    [searchParams]
  );

  const rowsToShow = useMemo(() => {
    const base = Array.isArray(playerData) ? playerData : [];
    const n = Math.max(0, Number(playersToShow) || 0);
    return base.slice(0, n);
  }, [playerData, playersToShow]);

  useEffect(() => {
    let cancelled = false;
    const teamValue = searchParams.get("team");
    const nationValue = searchParams.get("nation");
    const positionValue = searchParams.get("position");
    const nameValue = searchParams.get("name");

    const run = async () => {
      try {
        const all = await loadPlayersForSeason(season);
        if (cancelled) return;
        const filtered = filterPlayers(all, {
          team: teamValue,
          nation: nationValue,
          position: positionValue,
          name: nameValue,
        });
        setPlayerData(filtered);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(new Error(axiosErrorMessage(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (teamValue || nationValue || positionValue || nameValue) {
      setLoading(true);
      run();
    } else {
      setLoading(false);
      setPlayerData([]);
      setError(null);
    }

    return () => {
      cancelled = true;
    };
  }, [searchParams, season]);

  const setSeasonInUrl = (nextSeason) => {
    const next = new URLSearchParams(searchParams);
    next.set("season", nextSeason);
    setSearchParams(next, { replace: true });
    setPlayersToShow(10);
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p>Error: {error.message}</p>;
  }

  const totalRows = Array.isArray(playerData) ? playerData.length : 0;
  const hasFilter =
    searchParams.get("team") ||
    searchParams.get("nation") ||
    searchParams.get("position") ||
    searchParams.get("name");

  return (
    <div className={`fade-in ${loading ? "loading" : ""}`}>
      <div className="container browse-page">
        <div className="table-container browse-page__glass">
          <p className="browse-page__eyebrow">Squad</p>
          <h1 className="page-title">
            <AnimatedLetters letterClass={letterClass} strArray={"Player Data".split("")} idx={12} />
          </h1>
          <p className="browse-page__intro">
            Rosters and per-player stats for the season you select—open this view from teams, nations, positions, or search.
          </p>
        {hasFilter && (
          <div className="player-data-toolbar">
            <label className="player-data-season-label" htmlFor="player-season">
              Season
            </label>
            <select
              id="player-season"
              className="player-season-select"
              value={season}
              onChange={(e) => setSeasonInUrl(e.target.value)}
            >
              {PLAYER_SEASON_CONFIG.map((c) => (
                <option key={c.season} value={c.season}>
                  {c.season.replace("/", " / ")}
                </option>
              ))}
            </select>
            <span className="player-data-season-hint">
              Roster and stats for the selected season only.
            </span>
          </div>
        )}
        {!hasFilter && (
          <p className="player-data-empty-hint">
            Open a squad from Teams, Nation, Position, or Search — then pick a season to see that roster and
            stats.
          </p>
        )}
        {hasFilter && totalRows === 0 && (
          <p className="player-data-empty-hint">No players found for this season and filters.</p>
        )}
        {hasFilter && (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Position</th>
              <th>Age</th>
              <th>Matches Played</th>
              <th>Starts</th>
              <th>Minutes Played</th>
              <th>Goals</th>
              <th>Assists</th>
              <th>Penalties Kicked</th>
              <th>Yellow Cards</th>
              <th>Red Cards</th>
              <th>Expected Goals (xG)</th>
              <th>Expected Assists (xAG)</th>
              <th>Team</th>
            </tr>
          </thead>
          <tbody>
            {rowsToShow.map((player, index) => (
              <tr key={player.id || `${player.name}-${index}`}>
                <td>{formatPlayerCell(player.name)}</td>
                <td>{formatPlayerCell(player.pos)}</td>
                <td>{formatPlayerCell(player.age)}</td>
                <td>{formatPlayerCell(player.mp)}</td>
                <td>{formatPlayerCell(player.starts)}</td>
                <td>{formatPlayerCell(player.min)}</td>
                <td>{formatPlayerCell(player.gls)}</td>
                <td>{formatPlayerCell(player.ast)}</td>
                <td>{formatPlayerCell(player.pk)}</td>
                <td>{formatPlayerCell(player.crdy)}</td>
                <td>{formatPlayerCell(player.crdr)}</td>
                <td>{formatPlayerCell(player.xg)}</td>
                <td>{formatPlayerCell(player.xag)}</td>
                <td>{formatPlayerCell(player.team)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
        {hasFilter && playersToShow < totalRows && (
          <button
            type="button"
            onClick={() => setPlayersToShow((n) => n + 10)}
            style={{ marginTop: "10px", marginBottom: "10px" }}
            className={`show-more-button ${loading ? "loading" : ""}`}
          >
            Show More
          </button>
        )}
        </div>
      </div>
    </div>
  );
};

export default TeamData;
