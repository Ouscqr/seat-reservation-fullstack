# Seat Reservation

A tiny seat reservation app I built to learn backend and frontend development.

You get a cinema-style seat map, you click a seat, and it's yours for 10 seconds. Pay before the timer runs out or the seat goes back to everyone else.

This is a hobby project, not a product. No login, no real payments, no roadmap. Just me breaking things and fixing them again.

**Try it here:** [seat-reservation-fullstack.vercel.app](https://seat-reservation-fullstack.vercel.app)

Heads up: it runs on free hosting, so the first load can take ~30 seconds while the backend wakes up. Give it a moment.

## What it does

- Shows the seats (columns A–F, with a little aisle in the middle)
- Green = free, orange = someone's holding it, red = sold
- Click a free seat → it's locked for you for 10 seconds
- Timer hits 0, or you hit "Annuleer" → the seat is free again
- A score counter, because why not
- Refreshes every 5 seconds, so you kind of see what other people are doing

## Built with

- **Frontend:** React + Vite (plain JavaScript, inline styles, no UI library)
- **Backend:** Spring Boot (Java)
- **Database:** H2 in memory when running locally, Postgres when it's online
- **Hosting:** frontend on Vercel, backend on Render

## Run it locally

You need Java + Maven for the backend and Node for the frontend. Two terminals.

**Backend (port 8080)**

```bash
cd seat-backend
mvn spring-boot:run
```

No database setup needed. It starts with an in-memory H2 database and adds 12 seats for you.

**Frontend (port 5173)**

```bash
cd seat-frontend
npm install
npm run dev
```

Then open <http://localhost:5173>.

Want the frontend to talk to a different backend? Put `VITE_API_URL=https://your-backend-url` in `seat-frontend/.env`.

## The fun part: 1 seat, 10 people

The whole point of the backend is that two people can't grab the same seat. So there's a test that throws 10 people at one seat, all at the same time.

The right answer is 1 happy person and 9 times "this seat is taken". That works because the backend locks the seat in the database before changing it.

Curious? Delete the `@Lock` line in `SeatRepository`, run the test again, and suddenly all 10 people get the seat. That one took me a while to figure out.

Run the tests with:

```bash
cd seat-backend
mvn test
```

## Still on my list

- "Betaal Nu" doesn't actually pay, it just reserves again. A real "sold" status is on the list.
- No login, so anyone can free anyone's seat. Sorry.
- Live updates with WebSockets would be nicer than refreshing every 2 seconds.
- Nicer styling. It's all inline styles right now.
- The seat layout is hardcoded, there's no admin page to change it.

## Why I made this

To learn Spring Boot and to finally deploy something real with a real database behind it.
