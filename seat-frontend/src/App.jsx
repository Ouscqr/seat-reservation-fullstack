import { useState, useEffect, useRef } from "react";

// Kleuren per stoelstatus: SOLD (verkocht) is rood.
const SEAT_COLORS = {
  AVAILABLE: "#4CAF50",
  LOCKED: "#FF9800",
  SOLD: "#F44336",
};

const seatColor = (status) => SEAT_COLORS[status] ?? "#9E9E9E";

function App() {
  const [seats, setSeats] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState(null); // De stoel voor de popup
  // Aangeklikte gereserveerde (LOCKED) stoel: kopen of vrijgeven
  const [lockedSeat, setLockedSeat] = useState(null);
  const [timeLeft, setTimeLeft] = useState(10);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Zonder trailing slash, anders vraag je //seats aan
  const API_URL = (
    import.meta.env.VITE_API_URL || "http://localhost:8080"
  ).replace(/\/+$/, "");
  const inFlight = useRef(false);

  const fetchSeats = async () => {
    // Geen overlappende requests: bij een koude Render/Neon start duurt een
    // request lang en dan stapelen de polls zich anders op.
    if (inFlight.current) return;
    inFlight.current = true;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${API_URL}/seats`, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (!Array.isArray(data))
        throw new Error("Onverwacht antwoord van de server");

      // Altijd op id sorteren: de volgorde mag nooit van de database afhangen
      setSeats([...data].sort((a, b) => a.id - b.id));
      setError(null);
    } catch (err) {
      // De al getoonde stoelen blijven staan; alleen de fout wordt gemeld
      setError(err.name === "AbortError" ? "timeout" : err.message);
      console.error("Fout bij ophalen:", err);
    } finally {
      clearTimeout(timeout);
      inFlight.current = false;
      setLoading(false);
    }
  };

  // poll elke 5s (2s is te agressief voor Render free + Neon)
  useEffect(() => {
    fetchSeats();
    const interval = setInterval(fetchSeats, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const releaseSeat = async (seatId) => {
    try {
      const response = await fetch(`${API_URL}/seats/${seatId}/release`, {
        method: "POST",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setSelectedSeat(null);
      setLockedSeat(null);
      fetchSeats();
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!selectedSeat) return;

    if (timeLeft === 0) {
      releaseSeat(selectedSeat.id);
      setSelectedSeat(null);
      return;
    }

    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, selectedSeat]);

  const reserveSeat = async (seat) => {
    try {
      const response = await fetch(`${API_URL}/seats/${seat.id}/reserve`, {
        method: "POST",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setSelectedSeat(seat);
      setTimeLeft(10);
      fetchSeats();
    } catch (error) {
      console.error(error);
    }
  };

  // seat is optioneel: de popup geeft selectedSeat mee, de LOCKED-popup lockedSeat
  const buySeat = async (seat) => {
    const seatToBuy = seat ?? selectedSeat;
    if (!seatToBuy) return;
    try {
      const response = await fetch(`${API_URL}/seats/${seatToBuy.id}/buy`, {
        method: "POST",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setScore((prevScore) => prevScore + 1);
      setSelectedSeat(null);
      setLockedSeat(null);
      fetchSeats();
    } catch (error) {
      console.error(error);
    }
  };

  // Verkoop een gekochte (SOLD) stoel: hij komt weer beschikbaar.
  const sellSeat = async (seat) => {
    if (
      !window.confirm(
        `Wil je stoel ${seat.seatNumber} verkopen? De stoel komt weer beschikbaar.`,
      )
    )
      return;

    try {
      const response = await fetch(`${API_URL}/seats/${seat.id}/sell`, {
        method: "POST",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setScore((prevScore) => Math.max(0, prevScore - 1));
      fetchSeats();
    } catch (error) {
      console.error(error);
    }
  };

  // "Reserveer nu": de stoel blijft LOCKED voor jou, de countdown stopt.
  const keepReservation = () => {
    setSelectedSeat(null);
  };

  // Eén klik-afhandeling voor beide kanten van het gangpad.
  const handleSeatClick = (seat) => {
    if (seat.status === "AVAILABLE") {
      reserveSeat(seat);
    } else if (seat.status === "LOCKED") {
      // Oranje: popup met "kopen" of "vrijgeven"
      setLockedSeat(seat);
    } else if (seat.status === "SOLD") {
      // Rood: jouw stoel, klik om hem te verkopen
      sellSeat(seat);
    }
  };

  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "Arial",
        backgroundColor: "#e0e0e0",
        minHeight: "100vh",
      }}
    >
      <h1>Pick</h1>
      <h2 style={{ color: "blue" }}>Jouw Score: {score}</h2>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "20px",
          flexWrap: "wrap",
          marginBottom: "20px",
        }}
      >
        {[
          ["AVAILABLE", "Beschikbaar"],
          ["LOCKED", "Gereserveerd"],
          ["SOLD", "Verkocht"],
        ].map(([status, label]) => (
          <div
            key={status}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <span
              style={{
                width: "16px",
                height: "16px",
                display: "inline-block",
                backgroundColor: seatColor(status),
                border: "2px solid #333",
                borderRadius: "4px",
              }}
            />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {error && (
        <p style={{ color: "#b00020", textAlign: "center" }}>
          Kan stoelen niet laden ({error}) — opnieuw proberen…
        </p>
      )}
      {loading && seats.length === 0 && !error && (
        <p style={{ textAlign: "center" }}>Stoelen laden…</p>
      )}
      {!loading && !error && seats.length === 0 && (
        <p style={{ textAlign: "center" }}>
          Geen stoelen gevonden in de database.
        </p>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          backgroundColor: "#ffffff",
          padding: "40px",
          borderRadius: "100px 100px 20px 20px",
          border: "4px solid #333",
          width: "fit-content",
          margin: "0 auto",
          boxShadow: "0 10px 20px rgba(0,0,0,0.2)",
        }}
      >
        {seats.map((seat) => {
          const rowLetter = seat.seatNumber.charAt(0);

          return (
            <div
              key={seat.id}
              style={{ display: "flex", gap: "10px", marginBottom: "10px" }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  width: "180px",
                  justifyContent: "flex-end",
                }}
              >
                {["A", "B", "C"].includes(rowLetter) && (
                  <div
                    onClick={() => handleSeatClick(seat)}
                    style={{
                      width: "50px",
                      height: "50px",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      borderRadius: "10px 10px 0 0",
                      border: "2px solid #333",
                      cursor:
                        seat.status === "AVAILABLE" ? "pointer" : "not-allowed",
                      backgroundColor: seatColor(seat.status),
                      color: "white",
                      fontWeight: "bold",
                      fontSize: "14px",
                    }}
                  >
                    {seat.seatNumber}
                  </div>
                )}
              </div>

              <div
                style={{
                  width: "40px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  color: "#999",
                  fontWeight: "bold",
                }}
              >
                {rowLetter}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  width: "180px",
                  justifyContent: "flex-start",
                }}
              >
                {["D", "E", "F"].includes(rowLetter) && (
                  <div
                    onClick={() => handleSeatClick(seat)}
                    style={{
                      width: "50px",
                      height: "50px",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      borderRadius: "10px 10px 0 0",
                      border: "2px solid #333",
                      cursor:
                        seat.status === "AVAILABLE" ? "pointer" : "not-allowed",
                      backgroundColor: seatColor(seat.status),
                      color: "white",
                      fontWeight: "bold",
                      fontSize: "14px",
                    }}
                  >
                    {seat.seatNumber}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedSeat && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "10px",
              textAlign: "center",
              boxShadow: "0 5px 15px rgba(0,0,0,0.3)",
            }}
          >
            <h2>Stoel {selectedSeat.seatNumber} Reserveren</h2>
            <p
              style={{
                fontSize: "24px",
                color: timeLeft <= 3 ? "red" : "black",
              }}
            >
              Je hebt nog <strong>{timeLeft}</strong> seconden!
            </p>
            <p style={{ marginTop: 0, color: "#555" }}>
              Reserveer nu = stoel blijft voor jou gereserveerd. Koop =
              definitief afrekenen.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={keepReservation}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#4CAF50",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: "bold",
                }}
              >
                Reserveer nu
              </button>
              <button
                onClick={() => buySeat(selectedSeat)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#1976D2",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: "bold",
                }}
              >
                Koop
              </button>
              <button
                onClick={() => releaseSeat(selectedSeat.id)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#f44336",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontSize: "16px",
                }}
              >
                Annuleer
              </button>
            </div>
          </div>
        </div>
      )}

      {lockedSeat && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "30px",
              borderRadius: "10px",
              textAlign: "center",
              boxShadow: "0 5px 15px rgba(0,0,0,0.3)",
            }}
          >
            <h2>Stoel {lockedSeat.seatNumber} is gereserveerd</h2>
            <p style={{ marginTop: 0, color: "#555" }}>
              Je kunt de reservering vrijgeven of de stoel direct kopen.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => buySeat(lockedSeat)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#1976D2",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: "bold",
                }}
              >
                Kopen
              </button>
              <button
                onClick={() => releaseSeat(lockedSeat.id)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#FF9800",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: "bold",
                }}
              >
                Vrijgeven
              </button>
              <button
                onClick={() => setLockedSeat(null)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#757575",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontSize: "16px",
                }}
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
