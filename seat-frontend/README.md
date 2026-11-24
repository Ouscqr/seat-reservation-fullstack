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
  api/seats.js                   fetch, POST actions, named bot reserve, cabin status
  hooks/useSeats.js              2 second polling, visibility pause, in-flight guard
  hooks/useCountdown.js          deadline based timer
  lib/cabin.js                   rows, letters, aisle and nearest seats from the API
  lib/hold.js                    10 second hold and sessionStorage persistence
  components/TopBar.jsx          app name and GitHub link
  components/SeatMapSection.jsx  map header, start-up, stale and empty states
  components/SeatMap.jsx         seat grid, pattern states, keyboard navigation
  components/SelectionPanel.jsx  selection, countdown, confirm, release and seat details
  components/ConcurrencySection.jsx  bot test, streaming log and reset time
```

## Notes

- One font: the system stack. Styles are CSS Modules; there is no UI kit. The
  request log uses monospace because it is log output.
- Desktop layout is the seat map with the selection panel on the right. On
  phones the panel stacks below the map.
- The first `GET /seats` waits up to 90 seconds. While it is pending the UI
  shows "Starting the server" and keeps retrying, so a sleeping free instance is
  not shown as an error.
- Polling is 2 seconds, with an immediate refresh after every action. The Page
  Visibility API stops polling while the tab is hidden and refreshes once when
  it becomes visible.
- The 10 second timer runs in the browser. Holds have no server-side expiry.
- The bot test sends 2 to 50 named reserve requests at once. The winner is stored
  as `bookedBy` and the seat goes straight to SOLD. There is no release after
  the test.
- The cabin resets lazily on the next seat request after an hour, with no
  scheduled job. The page shows the next reset time when no seats are available.
- There are no accounts or payments. The API allows releasing a hold or
  relisting a booked seat.
