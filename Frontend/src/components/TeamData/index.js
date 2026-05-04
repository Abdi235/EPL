import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import "./index.scss";
import AnimatedLetters from "../AnimatedLetters";
import API_BASE_URL from "../../config/api";
import { normalizePlayerListResponse } from "../../utils/playerList";
import { buildPlayerListUrl } from "../../utils/playerApiUrl";
import { axiosErrorMessage } from "../../utils/axiosErrorMessage";

const TeamData = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playerData, setPlayerData] = useState([]);
  const [playersToShow, setPlayersToShow] = useState(10);
  const [letterClass] = useState("text-animate");

  const rowsToShow = useMemo(() => {
    const base = Array.isArray(playerData) ? playerData : [];
    const n = Math.max(0, Number(playersToShow) || 0);
    return base.slice(0, n);
  }, [playerData, playersToShow]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const teamValue = params.get("team");
    const nationValue = params.get("nation");
    const positionValue = params.get("position");
    const nameValue = params.get("name");

    const fetchData = async (query) => {
      try {
        const response = await axios.get(query);
        if (cancelled) return;
        const { players, invalid, hint } = normalizePlayerListResponse(response.data);
        const safePlayers = Array.isArray(players) ? players : [];
        if (invalid) {
          setError(new Error(hint));
        } else {
          setError(null);
        }
        setPlayerData(safePlayers);
      } catch (err) {
        if (!cancelled) setError(new Error(axiosErrorMessage(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (teamValue) {
      fetchData(buildPlayerListUrl(API_BASE_URL, { team: teamValue }));
    } else if (nationValue) {
      fetchData(buildPlayerListUrl(API_BASE_URL, { nation: nationValue }));
    } else if (positionValue) {
      fetchData(buildPlayerListUrl(API_BASE_URL, { position: positionValue }));
    } else if (nameValue) {
      fetchData(buildPlayerListUrl(API_BASE_URL, { name: nameValue }));
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

  const totalRows = Array.isArray(playerData) ? playerData.length : 0;

  return (
    <div className={`fade-in ${loading ? "loading" : ""}`}>
      <div className="table-container">
        <h1 className="page-title">
          <AnimatedLetters letterClass={letterClass} strArray={"Player Data".split("")} idx={12} />
        </h1>
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
        {playersToShow < totalRows && (
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
  );
};

export default TeamData;
