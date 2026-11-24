import { Fragment } from "react";
import { formatClock } from "../lib/format.js";
import styles from "./SelectionPanel.module.css";

const INSPECT_COPY = {
  held: {
    status: "On hold",
    body: "Another visitor is holding this seat. It will be available again when the hold is released.",
    action: "Release hold",
  },
  sold: {
    status: "Booked",
    body: "This seat is already booked.",
    action: "Make available again",
  },
};

export function SelectionPanel({
  panelRef,
  hold,
  remainingMs,
  totalMs,
  pendingAction,
  actionError,
  inspect,
  bookedSeatNumber,
  notice,
  onConfirm,
  onRelease,
  onInspectAction,
  onBack,
  onChooseAgain,
  onSuggestion,
  onDismissNotice,
}) {
  const busy = Boolean(pendingAction);
  const remaining = remainingMs ?? 0;
  const progress =
    totalMs > 0 ? Math.max(0, Math.min(100, (remaining / totalMs) * 100)) : 0;
  const seconds = Math.ceil(remaining / 1000);
  const milestone = hold
    ? seconds === 5
      ? "5 seconds remaining."
      : seconds === 10
        ? "10 seconds remaining."
        : ""
    : "";
  const inspectCopy = inspect ? INSPECT_COPY[inspect.kind] : null;

  return (
    <aside
      className={styles.panel}
      aria-labelledby="selection-title"
      ref={panelRef}
    >
      <h2 id="selection-title" className={styles.title}>
        Your selection
      </h2>

      {notice && (
        <div
          className={styles.notice}
          role={notice.kind === "info" ? "status" : "alert"}
        >
          <p
            className={
              notice.kind === "error"
                ? `${styles.noticeTitle} ${styles.noticeTitleError}`
                : styles.noticeTitle
            }
          >
            {notice.title}
          </p>
          {notice.text && <p className={styles.noticeText}>{notice.text}</p>}
          {notice.suggestions?.length > 0 && (
            <p className={styles.suggestions}>
              <span>Available seats: </span>
              {notice.suggestions.map((seat, index) => (
                <Fragment key={seat.id}>
                  {index > 0 && ", "}
                  <button
                    type="button"
                    className={styles.seatLink}
                    onClick={() => onSuggestion(seat)}
                    disabled={busy}
                  >
                    {seat.seatNumber}
                  </button>
                </Fragment>
              ))}
            </p>
          )}
          <button
            type="button"
            className={styles.textButton}
            onClick={onDismissNotice}
          >
            Dismiss
          </button>
        </div>
      )}

      {hold ? (
        <div>
          <p className={styles.seatCode}>{hold.seatNumber}</p>
          <p className={styles.status}>On hold</p>
          <p className={styles.body}>
            The seat is held for you for 10 seconds.
          </p>

          <div className={styles.timerRow}>
            <span className={styles.timerLabel}>Time remaining</span>
            <span className={styles.timer} role="timer" aria-live="off">
              {formatClock(remaining)}
            </span>
          </div>
          <div className={styles.progress} aria-hidden="true">
            <span style={{ inlineSize: `${progress}%` }} />
          </div>

          {actionError && (
            <p className={styles.error} role="alert">
              {actionError}
            </p>
          )}

          <button
            type="button"
            className={styles.primary}
            onClick={onConfirm}
            disabled={busy}
          >
            {pendingAction === "buy" ? "Booking..." : "Confirm booking"}
          </button>
          <button
            type="button"
            className={styles.secondary}
            onClick={onRelease}
            disabled={busy}
          >
            {pendingAction === "release" ? "Releasing..." : "Release seat"}
          </button>

          <p className={styles.fineprint}>
            The timer runs in your browser. When it ends, the seat is released.
          </p>
          <span className="sr-only" role="status" aria-live="polite">
            {milestone}
          </span>
        </div>
      ) : bookedSeatNumber ? (
        <div>
          <p className={styles.seatCode}>{bookedSeatNumber}</p>
          <p className={styles.status}>Booked</p>
          <p className={styles.body}>The API confirmed the purchase.</p>
          <button
            type="button"
            className={styles.secondary}
            onClick={onChooseAgain}
          >
            Select another seat
          </button>
          <span className="sr-only" role="status" aria-live="polite">
            Seat {bookedSeatNumber} booked.
          </span>
        </div>
      ) : inspect ? (
        <div>
          <p className={styles.seatCode}>{inspect.seat.seatNumber}</p>
          <p className={styles.status}>{inspectCopy.status}</p>
          <p className={styles.body}>{inspectCopy.body}</p>

          {actionError && (
            <p className={styles.error} role="alert">
              {actionError}
            </p>
          )}

          <button
            type="button"
            className={styles.secondary}
            onClick={onInspectAction}
            disabled={busy}
          >
            {pendingAction === "release" || pendingAction === "sell"
              ? "Working..."
              : inspectCopy.action}
          </button>
          <button type="button" className={styles.textButton} onClick={onBack}>
            Back to selection
          </button>
          <p className={styles.fineprint}>
            Demo action. The API has no accounts.
          </p>
        </div>
      ) : !notice ? (
        <div>
          <p className={styles.emptyTitle}>No seat selected</p>
          <p className={styles.body}>Select an available seat from the map.</p>
        </div>
      ) : null}
    </aside>
  );
}