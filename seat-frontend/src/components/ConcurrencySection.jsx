import { useEffect, useMemo, useRef, useState } from "react";
import { fetchCabinStatus, reserveSeat } from "../api/seats.js";
import styles from "./ConcurrencySection.module.css";

const MIN_BOTS = 2;
const MAX_BOTS = 50;
const DEFAULT_BOTS = 10;

function clampBots(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return DEFAULT_BOTS;
  return Math.min(MAX_BOTS, Math.max(MIN_BOTS, parsed));
}

function formatLogTime(timestamp) {
  const date = new Date(timestamp);
  const pad = (value, width = 2) => String(value).padStart(width, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds(),
  )}.${pad(date.getMilliseconds(), 3)}`;
}

function formatResetTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unavailable";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function resultLabel(outcome) {
  if (outcome === "reserved") return "reserved";
  if (outcome === "taken") return "rejected (taken)";
  return "failed";
}

export function ConcurrencySection({ seats, loading = false, onRefresh }) {
  const [phase, setPhase] = useState("idle");
  const [botInput, setBotInput] = useState(String(DEFAULT_BOTS));
  const [targetId, setTargetId] = useState("");
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [nextResetAt, setNextResetAt] = useState(null);
  const [statusError, setStatusError] = useState("");
  const runningRef = useRef(false);
  const runIdRef = useRef(0);

  const availableSeats = useMemo(
    () => seats.filter((seat) => seat.status === "AVAILABLE"),
    [seats],
  );
  const selectedTarget = availableSeats.find(
    (seat) => String(seat.id) === targetId,
  );
  const botCount = clampBots(botInput);
  const running = phase === "running";
  const orderedResults = useMemo(
    () => [...results].sort((a, b) => a.completedAt - b.completedAt),
    [results],
  );

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (loading || availableSeats.length > 0) return undefined;

    const controller = new AbortController();
    let cancelled = false;

    setNextResetAt(null);
    setStatusError("");

    fetchCabinStatus({ signal: controller.signal })
      .then((status) => {
        if (!cancelled) setNextResetAt(status.nextResetAt);
      })
      .catch((err) => {
        if (cancelled || err.name === "AbortError") return;
        setStatusError("The next reset time is unavailable.");
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [availableSeats.length, loading]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const run = async () => {
    if (runningRef.current || availableSeats.length === 0) return;

    const bots = clampBots(botInput);
    const target =
      selectedTarget ??
      availableSeats[Math.floor(Math.random() * availableSeats.length)];

    if (!target) return;

    setBotInput(String(bots));
    runningRef.current = true;
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;

    setPhase("running");
    setError("");
    setResults([]);
    setSummary(null);

    const startedAt = performance.now();
    const collected = [];

    const requests = Array.from({ length: bots }, (_, index) => {
      const bot = `Bot ${index + 1}`;
      const requestStart = performance.now();

      return reserveSeat(target.id, { requester: bot })
        .then((result) => {
          const entry = {
            bot,
            seatNumber: target.seatNumber,
            outcome: result.outcome,
            message: result.message,
            completedAt: Date.now(),
            ms: Math.round(performance.now() - requestStart),
          };
          collected.push(entry);
          if (runId === runIdRef.current) {
            setResults((current) => [...current, entry]);
          }
          return entry;
        })
        .catch((cause) => {
          const entry = {
            bot,
            seatNumber: target.seatNumber,
            outcome: "failed",
            message: cause?.detail || cause?.message || "Request failed",
            completedAt: Date.now(),
            ms: Math.round(performance.now() - requestStart),
          };
          collected.push(entry);
          if (runId === runIdRef.current) {
            setResults((current) => [...current, entry]);
          }
          return entry;
        });
    });

    try {
      await Promise.all(requests);
      if (runId !== runIdRef.current) return;

      setSummary({
        requests: requests.length,
        reserved: collected.filter((entry) => entry.outcome === "reserved")
          .length,
        rejected: collected.filter((entry) => entry.outcome === "taken").length,
        failed: collected.filter(
          (entry) =>
            entry.outcome !== "reserved" && entry.outcome !== "taken",
        ).length,
        totalMs: Math.round(performance.now() - startedAt),
      });
      setPhase("done");
      onRefresh?.();
    } catch {
      if (runId === runIdRef.current) {
        setError("The test could not be completed. Try again.");
        setPhase("done");
      }
    } finally {
      runningRef.current = false;
    }
  };

  return (
    <section className={styles.section} aria-labelledby="concurrency-title">
      <div>
        <h2 id="concurrency-title">How double bookings are prevented</h2>
        <div className={styles.copy}>
          <p>
            When a request arrives, the server starts a transaction and locks
            that seat row in the database.
          </p>
          <p>
            Other requests for the same seat wait until the first transaction
            finishes.
          </p>
          <p>
            The first request changes the seat. The others continue, see the new
            status, and are rejected.
          </p>
          <p>
            A normal booking is held for 10 seconds before purchase. The bot
            test books the seat immediately under the winner's name.
          </p>
        </div>
      </div>

      <div className={styles.test}>
        <p className={styles.testTitle}>Test the lock</p>
        <p className={styles.muted}>
          Choose a seat and a number of bots. Each bot sends a reserve request at
          the same time. The winner is saved as the booker.
        </p>

        <div className={styles.controls}>
          <label className={styles.field}>
            <span>Seat</span>
            <select
              value={selectedTarget ? String(selectedTarget.id) : ""}
              onChange={(event) => setTargetId(event.target.value)}
              disabled={running || availableSeats.length === 0}
            >
              <option value="">Random available</option>
              {availableSeats.map((seat) => (
                <option key={seat.id} value={seat.id}>
                  {seat.seatNumber}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Bots</span>
            <input
              type="number"
              min={MIN_BOTS}
              max={MAX_BOTS}
              step="1"
              inputMode="numeric"
              value={botInput}
              onChange={(event) => setBotInput(event.target.value)}
              onBlur={() => setBotInput(String(botCount))}
              disabled={running}
            />
          </label>
        </div>
        <p className={styles.hint}>2 to 50 bots.</p>

        <button
          type="button"
          className={styles.run}
          onClick={run}
          disabled={running || availableSeats.length === 0}
          aria-busy={running || undefined}
        >
          {running ? "Running..." : "Run test"}
        </button>

        <p className={styles.hint}>The cabin resets every hour.</p>

        {availableSeats.length === 0 && !loading && (
          <p className={styles.noSeats}>
            No seats are available.{" "}
            {nextResetAt
              ? `Next reset at ${formatResetTime(nextResetAt)}.`
              : statusError || "Checking the next reset time."}
          </p>
        )}

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        {summary && (
          <p className={styles.summary} role="status" aria-live="polite">
            {summary.requests} requests · {summary.reserved} reserved ·{" "}
            {summary.rejected} rejected
            {summary.failed > 0 ? ` · ${summary.failed} failed` : ""} ·{" "}
            {summary.totalMs} ms total
          </p>
        )}

        {orderedResults.length > 0 && (
          <div
            className={styles.logWrap}
            role="region"
            aria-label="Bot request log"
            tabIndex={0}
          >
            <table className={styles.log}>
              <caption className="sr-only">Bot request log</caption>
              <thead>
                <tr>
                  <th scope="col">Completed</th>
                  <th scope="col">Bot</th>
                  <th scope="col">Result</th>
                  <th scope="col">Seat</th>
                  <th scope="col">Response time</th>
                </tr>
              </thead>
              <tbody>
                {orderedResults.map((entry) => (
                  <tr
                    key={entry.bot}
                    className={
                      entry.outcome === "reserved" ? styles.winner : undefined
                    }
                  >
                    <td>{formatLogTime(entry.completedAt)}</td>
                    <td>{entry.bot}</td>
                    <td title={entry.message}>{resultLabel(entry.outcome)}</td>
                    <td>{entry.seatNumber}</td>
                    <td>{entry.ms} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {orderedResults.length === 0 && !running && !summary && (
          <p className={styles.placeholder}>No test run yet.</p>
        )}
      </div>
    </section>
  );
}