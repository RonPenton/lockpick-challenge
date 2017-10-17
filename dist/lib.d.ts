/** A score to be calculated between two lock configurations */
export declare type Score = {
    white: number;
    black: number;
};
/** a function that will asynchronously return a score based on a given lock guess. */
export declare type Guesser = (guess: string) => Promise<Score>;
/** An answer, representing the final result and the number of attempts to reach that result. */
export declare type Answer = {
    answer: string;
    attempts: number;
};
/**
 * An object containing callbacks to be called, given various events that can happen during calculation
 * of a guess.
 */
export declare type Delegates = {
    guess: Guesser;
    error: (error: any) => void;
    solved: (answer: Answer) => void;
};
/** Perform the main loop of the solver. */
export declare function loop(delegates: Delegates, guess?: string, possibilities?: string[], usedCodes?: Set<string>): Promise<void>;
/** Determine if the scores are equivalent */
export declare function scoreEquals(left: Score, right: Score): boolean;
export declare function calculateScore(guess: string, possibility: string): Score;
/**
 * Parses a score in text format into a structure we can use. Doesn't do error-handling.
 * Any invalid string is simply { w: 0, b: 0 } for simplicity. A production app should naturally
 * be more protective.
 */
export declare function parseScore(score: string): Score;
/** Prints a score in AR challenge format, for output purposes. */
export declare function printScore(score: Score): string;
/** Computes a set of all possible combinations */
export declare function initializeSet(): string[];
/**
 * Gets a random configuration from the set of all possible combinations.
 * There's way faster ways to do this, but it's only for testing so I opted for easiest.
 */
export declare function getRandomConfig(): string;
