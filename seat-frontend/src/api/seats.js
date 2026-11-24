// The backend answers every seat action with HTTP 200 and a plain-text body,
// including failures ("This seat is taken"). So outcomes must be read from the
// body; there is no 409 to rely on. Nothing here changes the API contract.
const RAW_API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

// Without the trailing-slash trim we would request //seats.
const API_URL = RAW_API_URL.replace(/\/+$/, "");

const STATUSES = new Set(["AVAILABLE", "LOCKED", "SOLD"]);

export class ApiError extends Error {
  constructor(message, { code = "http", status = null, detail = "" } = {}) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

async function request(path, { method = "GET", signal, timeoutMs = 20000 } = {}) {
  const controller = new AbortController();
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const forwardAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", forwardAbort, { once: true });
  }

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers: { Accept: "application/json, text/plain" },
      signal: controller.signal,
    });
    const text = await response.text();

    if (!response.ok) {
      let detail = text;
      try {
        const parsed = JSON.parse(text);
        detail = parsed.message || parsed.error || text;
      } catch {
        // The API sent plain text; that is a valid error detail too.
      }
      throw new ApiError(`The API responded with HTTP ${response.status}.`, {
        code: "http",
        status: response.status,
        detail,
      });
    }

    return { status: response.status, text };
  } catch (error) {
    if (timedOut) {
      throw new ApiError(
        `The API did not answer within ${Math.round(timeoutMs / 1000)} seconds.`,
        { code: "timeout" },
      );
    }
    if (error instanceof ApiError) throw error;
    if (signal?.aborted) throw error;
    throw new ApiError(
      "Could not reach the API. The backend may be asleep or offline.",
      { code: "network", detail: error.message },
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", forwardAbort);
  }
}

function normalizeSeat(raw) {
  const id = Number(raw?.id);
  const seatNumber =
    typeof raw?.seatNumber === "string" ? raw.seatNumber.trim().toUpperCase() : "";
  const status = typeof raw?.status === "string" ? raw.status.toUpperCase() : "";

  if (!Number.isFinite(id) || !seatNumber || !STATUSES.has(status)) return null;
  return { id, seatNumber, status };
}

export async function fetchSeats({ signal } = {}) {
  // A sleeping free instance can take close to a minute to wake. A short
  // timeout here is what turns a cold start into a false "Failed to fetch".
  const { text } = await request("/seats", { signal, timeoutMs: 90000 });

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new ApiError("The API returned a response that was not JSON.", {
      code: "invalid",
      detail: text.slice(0, 180),
    });
  }

  if (!Array.isArray(data)) {
    throw new ApiError("The API returned an unexpected shape instead of a seat list.", {
      code: "invalid",
      detail: JSON.stringify(data).slice(0, 180),
    });
  }

  const seats = [];
  const rejected = [];
  for (const raw of data) {
    const seat = normalizeSeat(raw);
    if (seat) seats.push(seat);
    else rejected.push(raw);
  }

  if (seats.length === 0 && data.length > 0) {
    throw new ApiError("The API returned seats in a shape this app cannot read.", {
      code: "invalid",
      detail: JSON.stringify(data).slice(0, 180),
    });
  }

  // Always sort by id so the order never depends on the database.
  seats.sort((a, b) => a.id - b.id);
  return { seats, rejected };
}

const ACTION_SPECS = {
  reserve: {
    successOutcome: "reserved",
    isSuccess: (body) => body === "Reserved Sucesfully, pay now",
    failures: { "This seat is taken": "taken" },
  },
  release: {
    successOutcome: "released",
    isSuccess: (body) => body.endsWith("is released and available again"),
    failures: { "Seat is not LOCKED": "not-locked" },
  },
  buy: {
    successOutcome: "booked",
    isSuccess: (body) => body === "Paid for the seat congrats",
    failures: { "Seat is already bought": "already-booked" },
  },
  sell: {
    successOutcome: "relisted",
    isSuccess: (body) => body === "Sold your seat Good",
    failures: { "Cant sell what you never bought": "not-sold" },
  },
};

async function postSeatAction(seatId, action, options) {
  const spec = ACTION_SPECS[action];
  const { text } = await request(`/seats/${seatId}/${action}`, {
    method: "POST",
    timeoutMs: 20000,
    ...options,
  });
  const body = text.trim();

  if (spec.isSuccess(body)) {
    return { ok: true, outcome: spec.successOutcome, message: body };
  }
  for (const [expected, outcome] of Object.entries(spec.failures)) {
    if (body === expected) return { ok: false, outcome, message: body };
  }
  return { ok: false, outcome: "unexpected", message: body };
}

export const reserveSeat = (seatId, options) =>
  postSeatAction(seatId, "reserve", options);
export const releaseSeat = (seatId, options) =>
  postSeatAction(seatId, "release", options);
export const buySeat = (seatId, options) =>
  postSeatAction(seatId, "buy", options);
export const sellSeat = (seatId, options) =>
  postSeatAction(seatId, "sell", options);

// Fires N parallel reserve requests at one real seat. Pessimistic locking in
// the backend means at most one can win; we report what actually happened.
export async function runReservationRace(seatId, attempts = 10, { signal } = {}) {
  const started = performance.now();

  const requests = await Promise.all(
    Array.from({ length: attempts }, async (_, index) => {
      const requestStart = performance.now();
      try {
        const result = await reserveSeat(seatId, { signal });
        return {
          index: index + 1,
          ok: result.ok,
          outcome: result.outcome,
          message: result.message,
          status: 200,
          ms: Math.round(performance.now() - requestStart),
        };
      } catch (error) {
        return {
          index: index + 1,
          ok: false,
          outcome: error.code ?? "error",
          message: error.detail || error.message,
          status: error.status ?? null,
          ms: Math.round(performance.now() - requestStart),
        };
      }
    }),
  );

  return {
    requests,
    acquired: requests.filter((r) => r.outcome === "reserved").length,
    rejected: requests.filter((r) => r.outcome === "taken").length,
    failed: requests.filter(
      (r) => r.outcome !== "reserved" && r.outcome !== "taken",
    ).length,
    durationMs: Math.round(performance.now() - started),
  };
}

export function describeError(error) {
  const detail = error?.detail || "";
  if (error?.code === "timeout") {
    return {
      code: "timeout",
      status: null,
      title: "The server did not answer.",
      detail: "It may be starting up. Retrying automatically.",
    };
  }
  if (error?.code === "network") {
    return {
      code: "network",
      status: null,
      title: "Could not reach the server.",
      detail: "The server may be starting or offline. Retrying automatically.",
    };
  }
  if (error?.status === 404) {
    return {
      code: "http",
      status: 404,
      title: "The requested seat no longer exists.",
      detail: "Refresh the map to get the current seats.",
    };
  }
  if (error?.status) {
    return {
      code: "http",
      status: error.status,
      title: `The server returned an error (HTTP ${error.status}).`,
      detail: detail || "Retrying automatically.",
    };
  }
  return {
    code: error?.code ?? "error",
    status: null,
    title: "Something went wrong.",
    detail: detail || "Retrying automatically.",
  };
}