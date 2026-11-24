// Seat numbers from the API look like "A1": a letter (column) plus a row
// number. Rows, letters and the aisle are derived from the response.
const SEAT_CODE = /^([A-Z]+)(\d+)$/;

export function buildCabin(seats) {
  const byRow = new Map();
  const letters = new Set();
  const unplaced = [];

  for (const seat of seats) {
    const match = SEAT_CODE.exec(seat.seatNumber);
    if (!match) {
      unplaced.push(seat);
      continue;
    }

    const letter = match[1];
    const rowNumber = Number(match[2]);
    if (!byRow.has(rowNumber)) byRow.set(rowNumber, new Map());

    const rowSeats = byRow.get(rowNumber);
    if (rowSeats.has(letter)) {
      unplaced.push(seat);
      continue;
    }

    rowSeats.set(letter, seat);
    letters.add(letter);
  }

  const orderedLetters = [...letters].sort((a, b) => a.localeCompare(b));
  const rows = [...byRow.entries()]
    .sort(([a], [b]) => a - b)
    .map(([number, seatsByLetter]) => ({
      number,
      seats: orderedLetters.map((letter) => seatsByLetter.get(letter) ?? null),
    }));

  // A 3-3 cabin gets its aisle between C and D, a 2-2 between B and C.
  const leftCount = Math.ceil(orderedLetters.length / 2);

  return {
    letters: orderedLetters,
    rows,
    leftCount,
    rightCount: orderedLetters.length - leftCount,
    hasAisle: orderedLetters.length > 1,
    total: seats.length,
    unplaced,
  };
}

export function cabinGridTemplate(cabin) {
  const left = `repeat(${cabin.leftCount}, minmax(0, 1fr))`;
  const right =
    cabin.rightCount > 0
      ? ` repeat(${cabin.rightCount}, minmax(0, 1fr))`
      : "";
  const aisle = cabin.hasAisle ? " var(--aisle-width)" : "";
  return `var(--row-number) ${left}${aisle}${right}`;
}

export function cabinSummary(cabin) {
  if (cabin.rows.length === 0) return "";
  const first = cabin.rows[0].number;
  const last = cabin.rows[cabin.rows.length - 1].number;
  const rows = first === last ? `Row ${first}` : `Rows ${first} to ${last}`;
  const seats = cabin.total === 1 ? "1 seat" : `${cabin.total} seats`;
  return `${rows}. ${seats}.`;
}

export function seatPosition(cabin, seatId) {
  for (let rowIndex = 0; rowIndex < cabin.rows.length; rowIndex += 1) {
    const columnIndex = cabin.rows[rowIndex].seats.findIndex(
      (seat) => seat?.id === seatId,
    );
    if (columnIndex !== -1) return { rowIndex, columnIndex };
  }
  return null;
}

export function nearestAvailableSeats(cabin, seatId, limit = 3) {
  const origin = seatPosition(cabin, seatId);
  const candidates = [];

  cabin.rows.forEach((row, rowIndex) => {
    row.seats.forEach((seat, columnIndex) => {
      if (!seat || seat.status !== "AVAILABLE" || seat.id === seatId) return;
      const distance = origin
        ? Math.abs(origin.rowIndex - rowIndex) * 2 +
          Math.abs(origin.columnIndex - columnIndex)
        : 0;
      candidates.push({ seat, distance });
    });
  });

  candidates.sort(
    (a, b) => a.distance - b.distance || a.seat.id - b.seat.id,
  );
  return candidates.slice(0, limit).map((entry) => entry.seat);
}

export function seatState(seat, holdSeatId) {
  if (!seat) return null;
  if (seat.status === "LOCKED") return seat.id === holdSeatId ? "mine" : "held";
  if (seat.status === "SOLD") return "sold";
  return "available";
}