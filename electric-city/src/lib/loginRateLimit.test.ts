import { describe, it, expect } from "vitest";
import { isLoginLocked, recordLoginFailure, recordLoginSuccess } from "./loginRateLimit";

// The module holds one process-wide Map, so each test uses its own unique
// identifier to stay isolated from the others.
let counter = 0;
function freshIdentifier() {
  counter += 1;
  return `test-user-${counter}@example.com`;
}

describe("login rate limiting", () => {
  it("is not locked before any failures", () => {
    const id = freshIdentifier();
    expect(isLoginLocked(id)).toBe(false);
  });

  it("stays unlocked below the failure threshold", () => {
    const id = freshIdentifier();
    recordLoginFailure(id);
    recordLoginFailure(id);
    expect(isLoginLocked(id)).toBe(false);
  });

  it("locks out after 5 failures", () => {
    const id = freshIdentifier();
    for (let i = 0; i < 5; i++) recordLoginFailure(id);
    expect(isLoginLocked(id)).toBe(true);
  });

  it("a success clears the failure count", () => {
    const id = freshIdentifier();
    recordLoginFailure(id);
    recordLoginFailure(id);
    recordLoginFailure(id);
    recordLoginSuccess(id);
    // Should take a fresh 5 failures to lock out again, not just 2 more.
    recordLoginFailure(id);
    recordLoginFailure(id);
    expect(isLoginLocked(id)).toBe(false);
  });

  it("tracks each identifier independently", () => {
    const a = freshIdentifier();
    const b = freshIdentifier();
    for (let i = 0; i < 5; i++) recordLoginFailure(a);
    expect(isLoginLocked(a)).toBe(true);
    expect(isLoginLocked(b)).toBe(false);
  });
});
