import { Fragment, useMemo, useRef, useState } from "react";
import { cabinGridTemplate, seatPosition, seatState } from "../lib/cabin.js";
import styles from "./SeatMap.module.css";

const STATE_LABELS = {
  available: "available",
  mine: "selected",
  held: "on hold",
  sold: "booked",
};

const LEGEND = [
  { state: "available", label: "Available" },
  { state: "mine", label: "Selected" },
  { state: "held", label: "On hold" },
  { state: "sold", label: "Booked" },
];

const cx = (...values) => values.filter(Boolean).join(" ");

function LockIcon() {
  return (
    <svg className={styles.lock} viewBox="0 0 12 12" aria-hidden="true">
      <rect
        x="2.5"
        y="5.2"
        width="7"
        height="4.8"
        rx="1"
        fill="none"
        stroke="currentColor"
      />
      <path
        d="M4.2 5.2V3.9a1.8 1.8 0 0 1 3.6 0v1.3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SeatLegend() {
  return (
    <ul className={styles.legend} aria-label="Seat states">
      {LEGEND.map(({ state, label }) => (
        <li key={state}>
          <span
            className={cx(styles.seat, styles.swatch, styles[`seat--${state}`])}
            aria-hidden="true"
          />
          <span>{label}</span>
        </li>
      ))}
    </ul>
  );
}

export function SeatMap({
  cabin,
  holdSeatId = null,
  pendingSeatId = null,
  onSeatAction,
}) {
  const seatRefs = useRef(new Map());
  const [focusId, setFocusId] = useState(null);

  const gridTemplateColumns = useMemo(
    () => cabinGridTemplate(cabin),
    [cabin],
  );
  const allSeats = useMemo(
    () => cabin.rows.flatMap((row) => row.seats.filter(Boolean)),
    [cabin],
  );
  const activeSeatId = allSeats.some((seat) => seat.id === focusId)
    ? focusId
    : (allSeats[0]?.id ?? null);

  const focusSeat = (seat) => {
    if (!seat) return;
    setFocusId(seat.id);
    seatRefs.current.get(seat.id)?.focus();
  };

  const handleKeyDown = (event, seat) => {
    const position = seatPosition(cabin, seat.id);
    if (!position) return;

    const { rowIndex, columnIndex } = position;
    const currentRow = cabin.rows[rowIndex].seats;

    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      const step = event.key === "ArrowRight" ? 1 : -1;
      for (
        let index = columnIndex + step;
        index >= 0 && index < currentRow.length;
        index += step
      ) {
        if (currentRow[index]) {
          event.preventDefault();
          focusSeat(currentRow[index]);
          return;
        }
      }
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      const step = event.key === "ArrowDown" ? 1 : -1;
      for (
        let index = rowIndex + step;
        index >= 0 && index < cabin.rows.length;
        index += step
      ) {
        const nextRow = cabin.rows[index].seats;
        let next = nextRow[columnIndex] ?? null;
        for (let offset = 1; !next && offset < nextRow.length; offset += 1) {
          next =
            nextRow[columnIndex - offset] ?? nextRow[columnIndex + offset] ?? null;
        }
        if (next) {
          event.preventDefault();
          focusSeat(next);
          return;
        }
      }
      return;
    }

    if (event.key === "Home" || event.key === "End") {
      const ordered =
        event.key === "Home" ? currentRow : [...currentRow].reverse();
      const next = ordered.find(Boolean);
      if (next) {
        event.preventDefault();
        focusSeat(next);
      }
    }
  };

  const firstLetter = cabin.letters[0];
  const lastLetter = cabin.letters[cabin.letters.length - 1];
  const cabinLabel = cabin.letters.length
    ? `Seat map, ${cabin.rows.length === 1 ? "1 row" : `${cabin.rows.length} rows`}, seats ${firstLetter} to ${lastLetter}`
    : "Seat map";

  return (
    <div
      className={styles.map}
      role="group"
      aria-label={cabinLabel}
      aria-describedby="seat-map-help"
    >
      <p className={styles.front} aria-hidden="true">
        Front
      </p>

      <div
        className={styles.columns}
        style={{ gridTemplateColumns }}
        aria-hidden="true"
      >
        <span />
        {cabin.letters.slice(0, cabin.leftCount).map((letter) => (
          <span key={letter} className={styles.colLabel}>
            {letter}
          </span>
        ))}
        {cabin.hasAisle && <span />}
        {cabin.letters.slice(cabin.leftCount).map((letter) => (
          <span key={letter} className={styles.colLabel}>
            {letter}
          </span>
        ))}
      </div>

      <div className={styles.rows}>
        {cabin.rows.map((row) => (
          <div
            key={row.number}
            className={styles.row}
            style={{ gridTemplateColumns }}
          >
            <span className={styles.rowNumber} aria-hidden="true">
              {row.number}
            </span>
            {row.seats.map((seat, columnIndex) => {
              const letter = cabin.letters[columnIndex];
              const isAisle = cabin.hasAisle && columnIndex === cabin.leftCount;
              const state = seat ? seatState(seat, holdSeatId) : null;
              const isPending = seat?.id === pendingSeatId;
              const bookedBy = seat?.bookedBy
                ? ` by ${seat.bookedBy}`
                : "";

              return (
                <Fragment key={`${row.number}-${letter}`}>
                  {isAisle && (
                    <span className={styles.aisle} aria-hidden="true" />
                  )}
                  {seat ? (
                    <button
                      ref={(node) => {
                        if (node) seatRefs.current.set(seat.id, node);
                        else seatRefs.current.delete(seat.id);
                      }}
                      type="button"
                      className={cx(
                        styles.seat,
                        styles[`seat--${state}`],
                        isPending && styles["seat--pending"],
                      )}
                      aria-label={`Seat ${seat.seatNumber}, ${
                        isPending ? "reserving" : STATE_LABELS[state]
                      }${bookedBy}`}
                      aria-busy={isPending || undefined}
                      data-tooltip={
                        seat.bookedBy
                          ? `Booked by ${seat.bookedBy}`
                          : undefined
                      }
                      tabIndex={seat.id === activeSeatId ? 0 : -1}
                      disabled={isPending}
                      onFocus={() => setFocusId(seat.id)}
                      onClick={() => onSeatAction(seat)}
                      onKeyDown={(event) => handleKeyDown(event, seat)}
                    >
                      <span className={styles.letter} aria-hidden="true">
                        {letter}
                      </span>
                      {state === "held" && <LockIcon />}
                    </button>
                  ) : (
                    <span className={styles.emptySeat} aria-hidden="true" />
                  )}
                </Fragment>
              );
            })}
          </div>
        ))}
      </div>

      <p id="seat-map-help" className="sr-only">
        Use the arrow keys to move between seats and press Enter to select one.
      </p>
    </div>
  );
}