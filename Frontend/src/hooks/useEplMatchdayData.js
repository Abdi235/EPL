import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchMatchdayData, fetchLiveLeagueTable } from "../utils/eplApi";
import {
  loadNormalizedMatches,
  MATCH_DATA_REFRESH_INTERVAL_MS,
  MATCH_DATA_LIVE_REFRESH_INTERVAL_MS,
} from "../utils/matchDatasets";

function hasLiveFixtures(list) {
  return (list || []).some((m) => String(m?.status || "").toLowerCase() === "live");
}

/**
 * Shared live EPL data for Home, Results, and Standings (backend matchday-data endpoint).
 * Polls frequently while games are live and force-refreshes when the user returns to the tab
 * or clicks Refresh so FT scores and the table update promptly.
 */
export function useEplMatchdayData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [matches, setMatches] = useState([]);
  const [liveLeague, setLiveLeague] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const loadInFlight = useRef(false);
  const matchesRef = useRef(matches);
  matchesRef.current = matches;

  const load = useCallback(async ({ forceRefresh = false, isInitialLoad = false } = {}) => {
    if (loadInFlight.current && !isInitialLoad) return;
    loadInFlight.current = true;
    try {
      if (!isInitialLoad) setIsRefreshing(true);
      const pack = await fetchMatchdayData(forceRefresh || isInitialLoad);
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
      loadInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    load({ isInitialLoad: true, forceRefresh: true });
  }, [load]);

  const pollMs = useMemo(
    () =>
      hasLiveFixtures(matches)
        ? MATCH_DATA_LIVE_REFRESH_INTERVAL_MS
        : MATCH_DATA_REFRESH_INTERVAL_MS,
    [matches]
  );

  useEffect(() => {
    const id = setInterval(() => {
      load({ forceRefresh: hasLiveFixtures(matchesRef.current) });
    }, pollMs);
    return () => clearInterval(id);
  }, [load, pollMs]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        load({ forceRefresh: true });
      }
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
    refresh: () => load({ forceRefresh: true }),
  };
}
