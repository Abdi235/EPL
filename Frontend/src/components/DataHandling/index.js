import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_BASE_URL from "../../config/api";
import { normalizePlayerListResponse } from "../../utils/playerList";
import { buildPlayerListUrl } from "../../utils/playerApiUrl";
import { axiosErrorMessage } from "../../utils/axiosErrorMessage";
import "./index.scss";

const DataHandling = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playerData, setPlayerData] = useState([]);
  
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const teamValue = params.get("team");

    if (teamValue) {
      axios
        .get(buildPlayerListUrl(API_BASE_URL, { team: teamValue }))
        .then((response) => {
          if (cancelled) return;
          const { players, invalid, hint } = normalizePlayerListResponse(response.data);
          const safePlayers = Array.isArray(players) ? players : [];
          if (invalid) {
            setError(new Error(hint));
          } else {
            setError(null);
          }
          setPlayerData(safePlayers);
          setLoading(false);
        })
        .catch((err) => {
          if (!cancelled) {
            setError(new Error(axiosErrorMessage(err)));
            setLoading(false);
          }
        });
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
    <div className = "table-container">
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
                <td>{player.name}</td>
                <td>{player.pos}</td>
                <td>{player.age}</td>
                <td>{player.mp}</td>
                <td>{player.starts}</td>
                <td>{player.min}</td>
                <td>{player.gls}</td>
                <td>{player.ast}</td>
                <td>{player.pk}</td>
                <td>{player.crdy}</td>
                <td>{player.crdr}</td>
                <td>{player.xg}</td>
                <td>{player.xag}</td>
                <td>{player.team}</td>
            </tr>
            ))}
        </tbody>
        </table>
    </div>
  );
  
};

export default DataHandling;
