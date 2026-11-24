import { useEffect, useMemo, useRef, useState } from "react";
import {
  buySeat,
  describeError,
  releaseSeat,
  reserveSeat,
  sellSeat,
} from "./api/seats.js";
import {
  buildCabin,
  nearestAvailableSeats,
  seatState,
} from "./lib/cabin.js";
import { HOLD_MS, loadStoredHold, saveStoredHold } from "./lib/hold.js";
import { useCountdown } from "./hooks/useCountdown.js";
import { useSeats } from "./hooks/useSeats.js";
import { ConcurrencySection } from "./components/ConcurrencySection.jsx";
import { SeatMapSection } from "./components/SeatMapSection.jsx";
import { SelectionPanel } from "./components/SelectionPanel.jsx";
import { TopBar } from "./components/TopBar.jsx";
import styles from "./App.module.css";

function App() {
  const { seats, rejectedCount, loading, error, lastUpdated, refresh } =
    useSeats();
  const cabin = useMemo(() => buildCabin(seats), [seats]);

  const [hold, setHold] = useState(() => loadStoredHold());
  const [pendingSeatId, setPendingSeatId] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [actionError, setActionError] = useState("");
  const [inspectSeatId, setInspectSeatId] = useState(null);
  const [bookedSeatNumber, setBookedSeatNumber] = useState(null);
  const [notice, setNotice] = useState(null);
  const [attemptStartedAt] = useState(() => Date.now());

  const panelRef = useRef(null);
  const holdRef = useRef(hold);
  const releasingRef = useRef(false);
  const mountedRef = useRef(true);

  const remainingMs = useCountdown(hold?.deadline ?? null);
  const holdSeatId = hold?.seatId ?? null;

  const inspect = useMemo(() => {
    if (!inspectSeatId || hold) return null;
    const seat = seats.find((entry) => entry.id === inspectSeatId);
    if (!seat || seat.status === "AVAILABLE") return null;
    return { seat, kind: seat.status === "SOLD" ? "sold" : "held" };
  }, [inspectSeatId, seats, hold]);

  useEffect(() => {
    holdRef.current = hold;
  }, [hold]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    saveStoredHold(hold);
  }, [hold]);

  // The API is the source of truth. If a hold disappears there, reflect it here.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!hold || !lastUpdated || seats.length === 0) return;
    if (hold.verifiedAt && lastUpdated <= hold.verifiedAt) return;

    const seat = seats.find((entry) => entry.id === hold.seatId);
    if (!seat) {
      setHold(null);
      setInspectSeatId(null);
      setNotice({
        kind: "error",
        title: `Seat ${hold.seatNumber} is no longer on the map.`,
      });
      return;
    }

    if (seat.status !== "LOCKED") {
      setHold(null);
      setInspectSeatId(null);
      setNotice(
        seat.status === "SOLD"
          ? {
              kind: "info",
              title: `Seat ${hold.seatNumber} was booked by someone else.`,
              text: "The map shows the current state.",
            }
          : {
              kind: "info",
              title: `The hold on ${hold.seatNumber} ended.`,
              text: "The seat is available again.",
            },
      );
    }
  }, [seats, lastUpdated, hold]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const releaseHold = async (reason = "user") => {
    const activeHold = holdRef.current;
    if (!activeHold || releasingRef.current) return;

    releasingRef.current = true;
    setPendingAction("release");
    setActionError("");

    try {
      const result = await releaseSeat(activeHold.seatId);
      if (!mountedRef.current) return;

      if (result.outcome === "released" || result.outcome === "not-locked") {
        setHold(null);
        setBookedSeatNumber(null);
        setInspectSeatId(null);
        setNotice(
          reason === "expired"
            ? {
                kind: "info",
                title: `The hold on ${activeHold.seatNumber} ended.`,
                text: "The seat is available again.",
              }
            : {
                kind: "info",
                title: `Seat ${activeHold.seatNumber} released.`,
                text: "The seat is available again.",
              },
        );
        refresh();
      } else {
        setActionError("The seat could not be released. Try again.");
      }
    } catch {
      if (mountedRef.current) {
        setActionError("The seat could not be released. Try again.");
      }
    } finally {
      releasingRef.current = false;
      if (mountedRef.current) setPendingAction(null);
    }
  };

  const releaseRef = useRef(releaseHold);
  useEffect(() => {
    releaseRef.current = releaseHold;
  });

  useEffect(() => {
    if (remainingMs !== 0) return;
    const activeHold = holdRef.current;
    if (!activeHold || activeHold.deadline == null) return;
    releaseRef.current("expired");
  }, [remainingMs]);

  useEffect(() => {
    if (!holdSeatId) return;
    if (!window.matchMedia("(max-width: 900px)").matches) return;
    panelRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [holdSeatId]);

  const reserve = async (seat) => {
    if (pendingSeatId != null) return;
    if (holdRef.current) {
      setNotice({
        kind: "info",
        title: `Release seat ${holdRef.current.seatNumber} before selecting another seat.`,
      });
      return;
    }

    setPendingSeatId(seat.id);
    setNotice(null);
    setActionError("");
    setInspectSeatId(null);
    setBookedSeatNumber(null);

    try {
      const result = await reserveSeat(seat.id);
      if (!mountedRef.current) return;

      if (result.outcome === "reserved") {
        const now = Date.now();
        setHold({
          seatId: seat.id,
          seatNumber: seat.seatNumber,
          deadline: now + HOLD_MS,
          verifiedAt: now,
        });
        refresh();
      } else if (result.outcome === "taken") {
        setNotice({
          kind: "conflict",
          title: `Seat ${seat.seatNumber} is no longer available.`,
          text: "Another request reserved it first. Choose another seat.",
          suggestions: nearestAvailableSeats(cabin, seat.id, 3),
        });
        refresh();
      } else {
        setNotice({
          kind: "error",
          title: "The seat could not be reserved.",
          text: "Try again.",
        });
        refresh();
      }
    } catch (err) {
      if (!mountedRef.current) return;
      const described = describeError(err);
      setNotice({
        kind: "error",
        title: "The seat could not be reserved.",
        text: described.detail,
      });
    } finally {
      if (mountedRef.current) setPendingSeatId(null);
    }
  };

  const handleSeatAction = (seat) => {
    if (pendingSeatId != null) return;

    const currentHold = holdRef.current;
    const state = seatState(seat, currentHold?.seatId ?? null);

    if (state === "available") {
      reserve(seat);
      return;
    }

    if (state === "mine") {
      setNotice(null);
      setActionError("");
      setInspectSeatId(null);
      setBookedSeatNumber(null);
      return;
    }

    if (currentHold) {
      setNotice({
        kind: "info",
        title: `Release seat ${currentHold.seatNumber} before selecting another seat.`,
      });
      return;
    }

    setInspectSeatId(seat.id);
    setBookedSeatNumber(null);
    setNotice(null);
    setActionError("");
  };

  const confirmBooking = async () => {
    const activeHold = holdRef.current;
    if (!activeHold || pendingAction) return;

    setPendingAction("buy");
    setActionError("");
    setNotice(null);

    try {
      const result = await buySeat(activeHold.seatId);
      if (!mountedRef.current) return;

      if (result.outcome === "booked") {
        setHold(null);
        setBookedSeatNumber(activeHold.seatNumber);
        setInspectSeatId(null);
        refresh();
      } else if (result.outcome === "already-booked") {
        setHold(null);
        setNotice({
          kind: "error",
          title: `Seat ${activeHold.seatNumber} was already booked.`,
          text: "The map will refresh.",
        });
        refresh();
      } else {
        setActionError("The booking could not be completed. Try again.");
      }
    } catch (err) {
      if (!mountedRef.current) return;
      const described = describeError(err);
      setActionError(`The booking could not be completed. ${described.detail}`);
    } finally {
      if (mountedRef.current) setPendingAction(null);
    }
  };

  const inspectAction = async () => {
    if (!inspect || pendingAction) return;
    const { seat, kind } = inspect;

    setPendingAction(kind === "sold" ? "sell" : "release");
    setActionError("");
    setNotice(null);

    try {
      if (kind === "sold") {
        const result = await sellSeat(seat.id);
        if (result.outcome === "relisted") {
          setInspectSeatId(null);
          setNotice({
            kind: "info",
            title: `Seat ${seat.seatNumber} is available again.`,
          });
          refresh();
        } else if (result.outcome === "not-sold") {
          setInspectSeatId(null);
          setNotice({
            kind: "info",
            title: `Seat ${seat.seatNumber} is not booked.`,
            text: "The map will refresh.",
          });
          refresh();
        } else {
          setActionError("The seat could not be updated. Try again.");
        }
      } else {
        const result = await releaseSeat(seat.id);
        if (result.outcome === "released") {
          setInspectSeatId(null);
          setNotice({
            kind: "info",
            title: `Seat ${seat.seatNumber} released.`,
          });
          refresh();
        } else if (result.outcome === "not-locked") {
          setInspectSeatId(null);
          setNotice({
            kind: "info",
            title: `Seat ${seat.seatNumber} is no longer on hold.`,
            text: "The map will refresh.",
          });
          refresh();
        } else {
          setActionError("The seat could not be updated. Try again.");
        }
      }
    } catch {
      if (mountedRef.current) {
        setActionError("The seat could not be updated. Try again.");
      }
    } finally {
      if (mountedRef.current) setPendingAction(null);
    }
  };

  const focusMap = () => {
    const title = document.getElementById("seat-map-title");
    title?.scrollIntoView({ block: "start", behavior: "smooth" });
    title?.focus({ preventScroll: true });
  };

  const backToSelection = () => {
    setInspectSeatId(null);
    setActionError("");
    setNotice(null);
  };

  const chooseAgain = () => {
    setBookedSeatNumber(null);
    setActionError("");
    setNotice(null);
    focusMap();
  };

  const handleSuggestion = (seat) => {
    setNotice(null);
    setActionError("");
    reserve(seat);
  };

  return (
    <div className={styles.page} id="top">
      <a className="skip-link" href="#seat-map-title">
        Skip to the seat map
      </a>

      <TopBar />

      <main className={styles.main}>
        <div className={styles.layout}>
          <SeatMapSection
            cabin={cabin}
            seats={seats}
            loading={loading}
            error={error}
            lastUpdated={lastUpdated}
            attemptStartedAt={attemptStartedAt}
            rejectedCount={rejectedCount}
            holdSeatId={holdSeatId}
            pendingSeatId={pendingSeatId}
            onSeatAction={handleSeatAction}
            onRetry={refresh}
          />

          <SelectionPanel
            panelRef={panelRef}
            hold={hold}
            remainingMs={remainingMs ?? 0}
            totalMs={HOLD_MS}
            pendingAction={pendingAction}
            actionError={actionError}
            inspect={inspect}
            bookedSeatNumber={bookedSeatNumber}
            notice={notice}
            onConfirm={confirmBooking}
            onRelease={() => releaseHold("user")}
            onInspectAction={inspectAction}
            onBack={backToSelection}
            onChooseAgain={chooseAgain}
            onSuggestion={handleSuggestion}
            onDismissNotice={() => setNotice(null)}
          />
        </div>

        <ConcurrencySection seats={seats} loading={loading} onRefresh={refresh} />
      </main>
    </div>
  );
}

export default App;