export function formatRelativeTime(timestamp, now = Date.now()) {
  if (!timestamp) return "not yet";
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds <= 1) return "just now";
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  return `${Math.floor(minutes / 60)}h ago`;
}

// 9_400ms -> "0:10". Ceil keeps a live hold from showing 0:00.
export function formatClock(ms) {
  const totalSeconds = Math.max(0, Math.ceil((ms ?? 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}