import { useState, useEffect } from "react";

function App() {
  const [seats, setSeats] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState(null); // De stoel voor de popup
  const [timeLeft, setTimeLeft] = useState(10);
  const [score, setScore] = useState(0);
  // Helemaal bovenaan, buiten de App functie (of er direct in)
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

  const fetchSeats = async () => {
    try {
      const response = await fetch({ API_URL });
      const data = await response.json();
      setSeats(data);
    } catch (error) {
      console.error("Fout bij ophalen:", error);
    }
  };

  //auto2s poll
  useEffect(() => {
    fetchSeats();
    const interval = setInterval(fetchSeats, 2000);
    return () => clearInterval(interval);
  }, []);

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
      await fetch(`${API_URL}/seats/${seat.id}/reserve`, {
        method: "POST",
      });
      setSelectedSeat(seat);
      setTimeLeft(10);
      fetchSeats();
    } catch (error) {
      console.error(error);
    }
  };

  const paySeat = async () => {
    if (!selectedSeat) return;
    try {
      await fetch(`${API_URL}/seats/${selectedSeat.id}/reserve`, {
        method: "POST",
      });
      setScore((prevScore) => prevScore + 1);
      setSelectedSeat(null);
      fetchSeats();
    } catch (error) {
      console.error(error);
    }
  };

  const releaseSeat = async (seatId) => {
    try {
      await fetch(`${API_URL}/seats/${seatId}/release`, {
        method: "POST",
      });
      setSelectedSeat(null);
      fetchSeats();
    } catch (error) {
      console.error(error);
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
                    onClick={() => {
                      if (seat.status === "AVAILABLE") reserveSeat(seat);
                      else if (
                        seat.status === "LOCKED" &&
                        window.confirm("Wil je deze stoel vrijgeven?")
                      )
                        releaseSeat(seat.id);
                    }}
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
                      backgroundColor:
                        seat.status === "AVAILABLE"
                          ? "#4CAF50"
                          : seat.status === "LOCKED"
                            ? "#FF9800"
                            : "#F44336",
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
                    onClick={() => {
                      if (seat.status === "AVAILABLE") reserveSeat(seat);
                      else if (
                        seat.status === "LOCKED" &&
                        window.confirm("Wil je deze stoel vrijgeven?")
                      )
                        releaseSeat(seat.id);
                    }}
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
                      backgroundColor:
                        seat.status === "AVAILABLE"
                          ? "#4CAF50"
                          : seat.status === "LOCKED"
                            ? "#FF9800"
                            : "#F44336",
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
            <button
              onClick={paySeat}
              style={{
                padding: "10px 20px",
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                marginRight: "10px",
                fontSize: "16px",
                fontWeight: "bold",
              }}
            >
              Betaal Nu
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
      )}
    </div>
  );
}

export default App;
