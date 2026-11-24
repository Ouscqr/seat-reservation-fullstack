export const HOLD_MS = 10_000;

const STORAGE_KEY = "seat-reservation.hold.v1";

// A hold is real server state, but ownership only exists in this tab. The API
// has no sessions. Persisting the deadline means a reload keeps the same hold.
export function loadStoredHold() {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const seatId = Number(parsed?.seatId);
    const seatNumber =
      typeof parsed?.seatNumber === "string" ? parsed.seatNumber : "";
    const deadline = Number(parsed?.deadline);

    if (!Number.isFinite(seatId) || !seatNumber) return null;
    if (!Number.isFinite(deadline)) return null;

    return { seatId, seatNumber, deadline, verifiedAt: 0 };
  } catch {
    return null;
  }
}

export function saveStoredHold(hold) {
  try {
    if (!hold || !Number.isFinite(hold.deadline)) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        seatId: hold.seatId,
        seatNumber: hold.seatNumber,
        deadline: hold.deadline,
      }),
    );
  } catch {
    // Private mode or a full quota. Persistence is optional.
  }
}