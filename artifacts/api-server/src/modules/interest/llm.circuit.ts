/**
 * modules/interest/llm.circuit.ts
 *
 * Circuit breaker for LLM (OpenAI) calls in the interest scoring pipeline.
 *
 * States:
 *   CLOSED    — Normal. LLM calls allowed.
 *   OPEN      — Failing. LLM calls blocked. Layer 1 only.
 *   HALF_OPEN — Testing. One trial call allowed.
 *
 * Transitions:
 *   CLOSED -> OPEN      : 3 consecutive failures
 *   OPEN -> HALF_OPEN   : 60 seconds elapsed
 *   HALF_OPEN -> CLOSED : trial call succeeds
 *   HALF_OPEN -> OPEN   : trial call fails (timer resets)
 *
 * Process-level singleton — all interest analysis jobs share one circuit.
 */

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

const FAILURE_THRESHOLD = 3;
const OPEN_DURATION_MS = 60_000;

let state: CircuitState = "CLOSED";
let failureCount = 0;
let openedAt = 0;
let halfOpenTrialActive = false;

export const llmCircuit = {
  /**
   * Returns true if LLM calls are allowed in the current state.
   * Also handles the OPEN -> HALF_OPEN transition if enough time has passed.
   */
  isAllowed(): boolean {
    if (state === "CLOSED") return true;

    if (state === "OPEN") {
      if (Date.now() - openedAt >= OPEN_DURATION_MS) {
        state = "HALF_OPEN";
        halfOpenTrialActive = false;
        console.log("[llm.circuit] OPEN -> HALF_OPEN");
        return !halfOpenTrialActive;
      }
      return false;
    }

    if (state === "HALF_OPEN") {
      if (halfOpenTrialActive) return false;
      halfOpenTrialActive = true;
      return true;
    }

    return false;
  },

  /**
   * Record a successful LLM call.
   * If in HALF_OPEN, transition back to CLOSED.
   */
  recordSuccess(): void {
    if (state === "HALF_OPEN") {
      state = "CLOSED";
      failureCount = 0;
      halfOpenTrialActive = false;
      console.log("[llm.circuit] HALF_OPEN -> CLOSED (success)");
      return;
    }
    if (state === "CLOSED") {
      failureCount = 0;
    }
  },

  /**
   * Record a failed LLM call.
   * Increments failure count; transitions CLOSED -> OPEN at threshold,
   * or HALF_OPEN -> OPEN on any failure.
   */
  recordFailure(): void {
    if (state === "HALF_OPEN") {
      state = "OPEN";
      openedAt = Date.now();
      halfOpenTrialActive = false;
      console.log("[llm.circuit] HALF_OPEN -> OPEN (failure)");
      return;
    }

    failureCount++;
    if (state === "CLOSED" && failureCount >= FAILURE_THRESHOLD) {
      state = "OPEN";
      openedAt = Date.now();
      console.log(`[llm.circuit] CLOSED -> OPEN (${failureCount} consecutive failures)`);
    }
  },

  getState(): CircuitState {
    return state;
  },

  /** For testing only — reset to CLOSED */
  _reset(): void {
    state = "CLOSED";
    failureCount = 0;
    openedAt = 0;
    halfOpenTrialActive = false;
  },
};
