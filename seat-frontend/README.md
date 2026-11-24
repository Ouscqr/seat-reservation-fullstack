# Seat Reservation frontend

React 19 and Vite client for the [Seat Reservation demo](../README.md). The root
README has the live demo, screenshots and the locking explanation.

## Scripts

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run preview
npm run lint
```

## Configuration

`VITE_API_URL` points the app at the backend. It defaults to
`http://localhost:8080`; trailing slashes are trimmed.

## Structure

```text
src/
  api/seats.js                   fetch and action client, parses the API text responses
  hooks/useSeats.js              polling, in-flight guard, forced refresh after actions
  hooks/useCountdown.js          deadline based timer
  lib/cabin.js                   rows, letters, aisle and nearest seats from the API
  lib/hold.js                    10 second hold and sessionStorage persistence
  components/TopBar.jsx          app name and GitHub link
  components/SeatMapSection.jsx  map header, start-up, stale and empty states
  components/SeatMap.jsx         seat grid, pattern states, keyboard navigation
  components/SelectionPanel.jsx  selection, countdown, confirm, release and seat details
  components/ConcurrencySection.jsx  explanation and 10 request test
```

## Notes

- One font: the system stack. Styles are CSS Modules; there is no UI kit.
- Desktop layout is the seat map with the selection panel on the right. On
  phones the panel stacks below the map.
- The first `GET /seats` waits up to 90 seconds. While it is pending the UI
  shows "Starting the server" and keeps retrying, so a sleeping free instance is
  not shown as an error.
- Polling is 5 seconds, with an immediate refresh after every action and when the
  tab becomes visible again.
- The 10 second timer runs in the browser. Holds have no server-side expiry.
- There are no accounts or payments. The API allows releasing a hold or
  relisting a booked seat.
