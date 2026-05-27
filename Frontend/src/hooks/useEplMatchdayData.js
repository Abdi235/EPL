import { useCallback, useEffect, useState } from "react";
import { fetchMatchdayData, fetchLiveLeagueTable } from "../utils/eplApi";
import { loadNormalizedMatches } from "../utils/matchDatasets";
import { MATCH_DATA_REFRESH_INTERVAL_MS } from "../utils/matchDatasets";

/**
 * Shared live EPL data for Home, Results, and Standings (backend matchday-data endpoint).
 */
export function useEplMatchdayData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matches, setMatches] = useState([]);
  const [liveLeague, setLiveLeague] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async (isInitialLoad = false) => {
    try {
      if (!isInitialLoad) setIsRefreshing(true);
      const pack = await fetchMatchdayData(isInitialLoad);
      if (pack) {
        setMatches(pack.matches);
        setLiveLeague(pack.liveLeague);
      } else {
        const [csvMatches, liveTable] = await Promise.all([
          loadNormalizedMatches(),
          fetchLiveLeagueTable(),
        ]);
        if (!csvMatches?.length) {
          throw new Error(
            "Could not load matchday data. Start the backend (port 9090) and set FOOTBALL_API_KEY for live scores."
          );
        }
        setMatches(csvMatches);
        setLiveLeague(liveTable);
      }
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
    load(true);
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => load(false), MATCH_DATA_REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") load(false);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  return {
    matches,
    liveLeague,
    loading,
    error,
    lastUpdated,
    isRefreshing,
    refresh: () => load(false),
  };
}
