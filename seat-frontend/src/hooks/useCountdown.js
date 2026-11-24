import { useEffect, useState } from "react";

// Deadline-based countdown: recomputes from the clock on every tick, so it
// never drifts and catches up after a background tab.
export function useCountdown(deadline) {
  const [remainingMs, setRemainingMs] = useState(null);

  useEffect(() => {
    if (deadline == null) {
      // Resetting a timer when the hold disappears; not a render cascade.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRemainingMs(null);
      return;
    }

    const tick = () => setRemainingMs(Math.max(0, deadline - Date.now()));
    tick();
    const interval = setInterval(tick, 200);

    return () => clearInterval(interval);
  }, [deadline]);

  return remainingMs;
}