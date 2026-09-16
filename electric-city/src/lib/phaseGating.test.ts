import { describe, it, expect } from "vitest";
import { shouldPhaseUnlock } from "./phaseGating";

describe("shouldPhaseUnlock", () => {
  it("unlocks a phase that doesn't require Telekom once the previous one is done", () => {
    expect(
      shouldPhaseUnlock({ requiresTelekomApproval: false, telekomApproved: false, previousDone: true })
    ).toBe(true);
  });

  it("keeps a phase locked while the previous one isn't done, regardless of Telekom", () => {
    expect(
      shouldPhaseUnlock({ requiresTelekomApproval: false, telekomApproved: true, previousDone: false })
    ).toBe(false);
    expect(
      shouldPhaseUnlock({ requiresTelekomApproval: true, telekomApproved: true, previousDone: false })
    ).toBe(false);
  });

  it("keeps a Telekom-gated phase locked until Telekom clears, even if the previous phase is done", () => {
    expect(
      shouldPhaseUnlock({ requiresTelekomApproval: true, telekomApproved: false, previousDone: true })
    ).toBe(false);
  });

  it("unlocks a Telekom-gated phase once both conditions are met", () => {
    expect(
      shouldPhaseUnlock({ requiresTelekomApproval: true, telekomApproved: true, previousDone: true })
    ).toBe(true);
  });

  it("a Telekom approval that hasn't happened never unlocks a gated phase on its own", () => {
    // Guards against a future refactor accidentally treating "approved" as
    // the only condition and dropping the previous-phase check.
    expect(
      shouldPhaseUnlock({ requiresTelekomApproval: true, telekomApproved: true, previousDone: false })
    ).toBe(false);
  });
});
