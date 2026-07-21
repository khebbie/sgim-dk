/**
 * RandomGenerator port (constitution: Determinism — inject randomness rather
 * than reaching for a global). Used for per-request ids; tests inject a
 * deterministic generator so behaviour is reproducible.
 */
export interface RandomGenerator {
	uuid(): string;
}

export const systemRandom: RandomGenerator = {
	// The one sanctioned place to read real randomness.
	 
	uuid: () => crypto.randomUUID()
};
