import { useCallback, useEffect, useRef, useState } from "react";
import { fetchSeats, describeError } from "../api/seats.js";

// 5s matches the backend's comfort zone (Render free tier + Neon). Every
// mutation triggers an immediate refresh on top of this.
export const POLL_INTERVAL_MS = 5000;

export function useSeats(pollMs = POLL_INTERVAL_MS) {
  const [seats, setSeats] = useState([]);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const activeRequest = useRef(null);
  const requestSeq = useRef(0);
  const mounted = useRef(false);

  const load = useCallback(async ({ force = false } = {}) => {
    // One request in flight at a time; a forced refresh supersedes the poll
    // that is currently running so stale data cannot land after an action.
    if (activeRequest.current) {
      if (!force) return;
      activeRequest.current.abort();
      activeRequest.current = null;
    }

    const controller = new AbortController();
    const seq = requestSeq.current + 1;
    requestSeq.current = seq;
    activeRequest.current = controller;

    try {
      const { seats: nextSeats, rejected } = await fetchSeats({
        signal: controller.signal,
      });
      if (!mounted.current || seq !== requestSeq.current) return;
      setSeats(nextSeats);
      setRejectedCount(rejected.length);
      setLastUpdated(Date.now());
      setError(null);
    } catch (err) {
      if (
        !mounted.current ||
        seq !== requestSeq.current ||
        err.name === "AbortError"
      ) {
        return;
      }
      setError(describeError(err));
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
      if (mounted.current && seq === requestSeq.current) setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => load({ force: true }), [load]);

  useEffect(() => {
    mounted.current = true;
    // Initial fetch plus the polling subscription. The rule targets render
    // cascades; this is synchronising with an external API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();

    const interval = setInterval(() => load(), pollMs);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      mounted.current = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      activeRequest.current?.abort();
      activeRequest.current = null;
    };
  }, [load, pollMs]);

  return {
    seats,
    rejectedCount,
    loading,
    error,
    lastUpdated,
    refresh,
  };
}