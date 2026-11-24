import { useNow } from "../hooks/useNow.js";
import { cabinSummary } from "../lib/cabin.js";
import { formatRelativeTime } from "../lib/format.js";
import { POLL_INTERVAL_MS } from "../hooks/useSeats.js";
import { SeatLegend, SeatMap } from "./SeatMap.jsx";
import styles from "./SeatMapSection.module.css";

const STARTUP_STATUSES = new Set([502, 503, 504]);

export function SeatMapSection({
  cabin,
  seats,
  loading,
  error,
  lastUpdated,
  attemptStartedAt,
  rejectedCount = 0,
  holdSeatId,
  pendingSeatId,
  onSeatAction,
  onRetry,
}) {
  const now = useNow(1000);
  const hasSeats = seats.length > 0;
  const startupError =
    error &&
    (error.code === "network" ||
      error.code === "timeout" ||
      STARTUP_STATUSES.has(error.status));
  const booting = !hasSeats && (loading || !error || startupError);
  const loadError = !hasSeats && Boolean(error) && !startupError;
  const empty = !hasSeats && !loading && !error;
  const waitingSeconds = Math.max(
    0,
    Math.floor((now - attemptStartedAt) / 1000),
  );
  const updated = formatRelativeTime(lastUpdated, now);

  return (
    <section
      className={styles.section}
      aria-labelledby="seat-map-title"
      aria-busy={booting || loading || undefined}
    >
      <div className={styles.header}>
        <div>
          <h1 id="seat-map-title" tabIndex={-1}>
            Choose a seat
          </h1>
          {hasSeats && <p className={styles.summary}>{cabinSummary(cabin)}</p>}
        </div>
        {hasSeats && (
          <div className={styles.tools}>
            <span className={styles.updated}>Updated {updated}</span>
            <button
              type="button"
              className={styles.refresh}
              onClick={onRetry}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
        )}
      </div>

      {booting && (
        <div className={styles.starting} role="status">
          <span className={styles.spinner} aria-hidden="true" />
          <div>
            <p className={styles.stateTitle}>Starting the server</p>
            <p className={styles.muted}>
              This can take up to a minute. Retrying automatically.
            </p>
            {waitingSeconds >= 60 && (
              <p className={styles.muted}>
                The server is taking longer than usual. It will keep retrying.
              </p>
            )}
            <button
              type="button"
              className={styles.textButton}
              onClick={onRetry}
              disabled={loading}
            >
              Retry now
            </button>
          </div>
        </div>
      )}

      {loadError && (
        <div className={styles.state} role="alert">
          <p className={styles.stateTitle}>Could not load seats</p>
          <p className={styles.muted}>
            {error.title} {error.detail}
          </p>
          <button
            type="button"
            className={styles.textButton}
            onClick={onRetry}
          >
            Retry now
          </button>
        </div>
      )}

      {empty && (
        <div className={styles.state} role="status">
          <p className={styles.stateTitle}>No seats available</p>
          <p className={styles.muted}>
            The API returned an empty list. Try again in a moment.
          </p>
          <button
            type="button"
            className={styles.textButton}
            onClick={onRetry}
          >
            Refresh
          </button>
        </div>
      )}

      {hasSeats && (
        <>
          {error && (
            <p className={styles.stale} role="status">
              Live updates paused. Showing the last update from {updated}.
              Retrying automatically.
            </p>
          )}

          <SeatMap
            cabin={cabin}
            holdSeatId={holdSeatId}
            pendingSeatId={pendingSeatId}
            onSeatAction={onSeatAction}
          />
          <SeatLegend />
          <p className={styles.note}>
            Refreshes every {Math.round(POLL_INTERVAL_MS / 1000)} seconds.
          </p>
          {rejectedCount > 0 && (
            <p className={styles.note}>
              Some records from the API could not be read.
            </p>
          )}
          {cabin.unplaced.length > 0 && (
            <p className={styles.note}>
              Some seats could not be placed on the map.
            </p>
          )}
        </>
      )}
    </section>
  );
}