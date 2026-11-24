import { useMemo, useRef, useState } from "react";
import {
  describeError,
  releaseSeat,
  runReservationRace,
} from "../api/seats.js";
import styles from "./ConcurrencySection.module.css";

const ATTEMPTS = 10;

export function ConcurrencySection({ seats, onRefresh }) {
  const [phase, setPhase] = useState("idle");
  const [result, setResult] = useState(null);
  const [cleanup, setCleanup] = useState(null);
  const [seatNumber, setSeatNumber] = useState("");
  const [error, setError] = useState("");
  const runningRef = useRef(false);

  const target = useMemo(
    () => seats.find((seat) => seat.status === "AVAILABLE") ?? null,
    [seats],
  );
  const running = phase === "running";

  const run = async () => {
    if (!target || runningRef.current) return;
    runningRef.current = true;
    setPhase("running");
    setResult(null);
    setCleanup(null);
    setError("");
    setSeatNumber(target.seatNumber);

    try {
      const race = await runReservationRace(target.id, ATTEMPTS);
      let release = "none";

      if (race.acquired === 1) {
        release = "failed";
        try {
          const released = await releaseSeat(target.id);
          if (released.ok || released.outcome === "not-locked") {
            release = "released";
          }
        } catch {
          release = "failed";
        }
      }

      setResult(race);
      setCleanup(release);
      setPhase("done");
      onRefresh?.();
    } catch (err) {
      setError(describeError(err).detail);
      setPhase("error");
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
            When you select a seat, the server starts a transaction and locks
            that seat row in the database.
          </p>
          <p>
            Other requests for the same seat wait until the first transaction
            finishes.
          </p>
          <p>
            The first request marks the seat as on hold. The others continue,
            see that state, and are rejected.
          </p>
          <p>
            Confirm the booking to mark the seat booked, or let the 10 second
            timer release it.
          </p>
        </div>
      </div>

      <div className={styles.test}>
        <p className={styles.testTitle}>Test the lock</p>
        <p className={styles.muted}>
          This sends 10 parallel reserve requests for one available seat, then
          releases it.
        </p>
        <button
          type="button"
          className={styles.run}
          onClick={run}
          disabled={!target || running}
          aria-busy={running || undefined}
        >
          {running ? "Sending..." : "Send 10 parallel requests"}
        </button>
        {!target && (
          <p className={styles.muted}>
            There is no available seat to test right now.
          </p>
        )}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <div className={styles.results} role="status" aria-live="polite">
          {result ? (
            <>
              <table className={styles.table}>
                <caption className="sr-only">
                  Results of the parallel request test
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Requests</th>
                    <th scope="col">Succeeded</th>
                    <th scope="col">Rejected</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{result.requests.length}</td>
                    <td>{result.acquired}</td>
                    <td>{result.rejected}</td>
                  </tr>
                </tbody>
              </table>
              {result.failed > 0 && (
                <p className={styles.muted}>
                  {result.failed} requests failed before the server answered.
                </p>
              )}
              {cleanup === "released" && (
                <p className={styles.muted}>
                  Seat {seatNumber} was released after the test.
                </p>
              )}
              {cleanup === "failed" && (
                <p className={styles.muted}>
                  Seat {seatNumber} is still on hold.
                </p>
              )}
              {cleanup === "none" && (
                <p className={styles.muted}>
                  The seat was not released because another request holds it.
                </p>
              )}
            </>
          ) : (
            <p className={styles.placeholder}>No test run yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}