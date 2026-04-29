import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import AnimatedLetters from "../AnimatedLetters";
import API_BASE_URL from "../../config/api";
import "./index.scss";

const Standings = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [table, setTable] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [letterClass] = useState("text-animate");

  const fetchStandings = useCallback(async (isInitialLoad = false) => {
    try {
      if (!isInitialLoad) {
        setIsRefreshing(true);
      }
      const response = await axios.get(`${API_BASE_URL}/api/v1/epl/standings`);
      const standingsTable = response.data?.standings?.[0]?.table || [];
      setTable(standingsTable);
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
    fetchStandings(true);
  }, [fetchStandings]);

  if (loading) return <p>Loading standings...</p>;
  if (error) return <p>Error loading standings: {error.message}</p>;

  return (
    <div className="container standings-page">
      <h1 className="page-title">
        <AnimatedLetters letterClass={letterClass} strArray={"Standings".split("")} idx={12} />
      </h1>
      <p className="status">Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : "N/A"}</p>
      <button className="refresh-button" onClick={() => fetchStandings(false)} disabled={isRefreshing}>
        {isRefreshing ? "Refreshing..." : "Refresh now"}
      </button>
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
              <th>GD</th>
              <th>Pts</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row) => (
              <tr key={row.team.id}>
                <td>{row.position}</td>
                <td>{row.team.name}</td>
                <td>{row.playedGames}</td>
                <td>{row.won}</td>
                <td>{row.draw}</td>
                <td>{row.lost}</td>
                <td>{row.goalDifference}</td>
                <td>{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Standings;
