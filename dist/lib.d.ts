export declare type Score = {
    white: number;
    black: number;
};
export declare type Guesser = (guess: string) => Promise<Score>;
export declare type Answer = {
    answer: string;
    attempts: number;
};
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
/** Parses a score in text format into a structure we can use. Doesn't do error-handling. */
export declare function parseScore(score: string): Score;
/** Prints a score in AR challenge format. */
export declare function printScore(score: Score): string;
/**
 * Gets a random configuration from the set of all possible combinations.
 * There's way faster ways to do this, but it's only for testing so I opted for easiest.
 */
export declare function getRandomConfig(): string;
