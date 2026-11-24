import styles from "./TopBar.module.css";

export const GITHUB_URL =
  "https://github.com/Ouscqr/seat-reservation-fullstack";

export function TopBar() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <span className={styles.name}>Seat Reservation</span>
        <a
          className={styles.link}
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
        >
          GitHub
          <span aria-hidden="true">↗</span>
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
    </header>
  );
}