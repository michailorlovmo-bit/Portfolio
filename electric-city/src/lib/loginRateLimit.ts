// In-process, in-memory login throttle. Deliberately simple — this app runs
// as a single Node process for one company (see README's SQLite/local-disk
// notes for the same scale assumption), so there's no need for a shared
// store like Redis. Locks a login identifier out after repeated failures
// rather than an IP, since IP headers aren't trustworthy behind an arbitrary
// reverse proxy and this is the more meaningful unit to protect anyway.

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;
// Crude backstop against unbounded memory growth if something hammers the
// login endpoint with many distinct emails — not a real DoS defense, just a
// safety valve appropriate for this app's scale.
const MAX_TRACKED = 5000;

interface Entry {
  failures: number;
  windowStart: number;
  lockedUntil: number | null;
}

const attempts = new Map<string, Entry>();

export function isLoginLocked(identifier: string): boolean {
  const entry = attempts.get(identifier);
  if (!entry?.lockedUntil) return false;
  if (Date.now() >= entry.lockedUntil) {
    attempts.delete(identifier);
    return false;
  }
  return true;
}

export function recordLoginFailure(identifier: string): void {
  if (attempts.size > MAX_TRACKED) attempts.clear();

  const now = Date.now();
  const existing = attempts.get(identifier);
  const entry: Entry =
    existing && now - existing.windowStart <= WINDOW_MS
      ? existing
      : { failures: 0, windowStart: now, lockedUntil: null };

  entry.failures += 1;
  if (entry.failures >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
  }
  attempts.set(identifier, entry);
}

export function recordLoginSuccess(identifier: string): void {
  attempts.delete(identifier);
}
