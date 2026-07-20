/**
 * Clock port (constitution: Determinism — "Use a Clock interface for time").
 * Production uses systemClock; tests inject a fixed clock so time-dependent
 * logic (e.g. the upcoming-events feed) is deterministic.
 */
export interface Clock {
	now(): Date;
}

export const systemClock: Clock = {
	// The Clock implementation is the one sanctioned place to read wall-clock time.
	// eslint-disable-next-line no-restricted-syntax
	now: () => new Date()
};
