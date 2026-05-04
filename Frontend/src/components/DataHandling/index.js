import React, { useState, useEffect } from "react";
import "./index.scss";
import {
  loadPlayersForSeason,
  filterPlayers,
  normalizePlayerSeasonParam,
  formatPlayerCell,
} from "../../utils/playerDataset";
import { axiosErrorMessage } from "../../utils/axiosErrorMessage";

const DataHandling = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playerData, setPlayerData] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const teamValue = params.get("team");
    const season = normalizePlayerSeasonParam(params.get("season"));

    if (teamValue) {
      (async () => {
        try {
          const all = await loadPlayersForSeason(season);
          if (cancelled) return;
          const filtered = filterPlayers(all, { team: teamValue });
          setPlayerData(filtered);
          setError(null);
        } catch (err) {
          if (!cancelled) setError(new Error(axiosErrorMessage(err)));
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p>Error: {error.message}</p>;
  }

  return (
    <div className="table-container">
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
          {(Array.isArray(playerData) ? playerData : []).map((player, rowIndex) => (
            <tr key={player.id || `${player.name}-${rowIndex}`}>
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
    </div>
  );
};

export default DataHandling;
