import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import AnimatedLetters from "../AnimatedLetters";
import API_BASE_URL from "../../config/api";
import "./index.scss";

const LiveScores = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matches, setMatches] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [letterClass] = useState("text-animate");

  const fetchLiveScores = useCallback(async (isInitialLoad = false) => {
    try {
      if (!isInitialLoad) {
        setIsRefreshing(true);
      }
      const response = await axios.get(`${API_BASE_URL}/api/v1/epl/live`);
      setMatches(response.data?.matches || []);
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
    fetchLiveScores(true);
    const intervalId = setInterval(() => {
      fetchLiveScores(false);
    }, 30000);

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchLiveScores]);

  if (loading) return <p>Loading live scores...</p>;
  if (error) return <p>Error loading live scores: {error.message}</p>;

  return (
    <div className="container live-page">
      <h1 className="page-title">
        <AnimatedLetters letterClass={letterClass} strArray={"Live Scores".split("")} idx={12} />
      </h1>
      <p className="status">Auto refresh: every 30s {lastUpdated ? `| Last updated: ${lastUpdated.toLocaleTimeString()}` : ""}</p>
      <button className="refresh-button" onClick={() => fetchLiveScores(false)} disabled={isRefreshing}>
        {isRefreshing ? "Refreshing..." : "Refresh now"}
      </button>
      <div className="match-list">
        {matches.length === 0 && <p>No live EPL matches right now.</p>}
        {matches.map((match) => (
          <div className="match-card" key={match.id}>
            <div className="teams">
              <span>{match.homeTeam.name}</span>
              <span>{match.score?.fullTime?.home ?? "-"}</span>
            </div>
            <div className="teams">
              <span>{match.awayTeam.name}</span>
              <span>{match.score?.fullTime?.away ?? "-"}</span>
            </div>
            <p className="status">{match.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveScores;
