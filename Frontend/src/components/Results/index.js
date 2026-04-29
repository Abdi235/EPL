import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import AnimatedLetters from "../AnimatedLetters";
import API_BASE_URL from "../../config/api";
import "./index.scss";

const Results = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matches, setMatches] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [letterClass] = useState("text-animate");

  const fetchResults = useCallback(async (isInitialLoad = false) => {
    try {
      if (!isInitialLoad) {
        setIsRefreshing(true);
      }
      const response = await axios.get(`${API_BASE_URL}/api/v1/epl/results`);
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
    fetchResults(true);
  }, [fetchResults]);

  if (loading) return <p>Loading results...</p>;
  if (error) return <p>Error loading results: {error.message}</p>;

  return (
    <div className="container results-page">
      <h1 className="page-title">
        <AnimatedLetters letterClass={letterClass} strArray={"Recent Results".split("")} idx={12} />
      </h1>
      <p className="status">Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : "N/A"}</p>
      <button className="refresh-button" onClick={() => fetchResults(false)} disabled={isRefreshing}>
        {isRefreshing ? "Refreshing..." : "Refresh now"}
      </button>
      <div className="match-list">
        {matches.length === 0 && <p>No recent EPL results available.</p>}
        {matches.map((match) => (
          <div className="match-card" key={match.id}>
            <p className="date">{new Date(match.utcDate).toLocaleString()}</p>
            <div className="teams">
              <span>{match.homeTeam.name}</span>
              <span>{match.score?.fullTime?.home ?? "-"}</span>
            </div>
            <div className="teams">
              <span>{match.awayTeam.name}</span>
              <span>{match.score?.fullTime?.away ?? "-"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Results;
