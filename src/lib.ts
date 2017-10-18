import * as _ from 'lodash';

/** A score to be calculated between two lock configurations */
export type Score = { white: number, black: number };

/** a function that will asynchronously return a score based on a given lock guess. */
export type Guesser = (guess: string) => Promise<Score>;

/** An answer, representing the final result and the number of attempts to reach that result. */
export type Answer = { answer: string, attempts: number };

/** 
 * An object containing callbacks to be called, given various events that can happen during calculation
 * of a guess.
 */
export type Delegates = {
    guess: Guesser,
    error: (error: any) => void,
    solved: (answer: Answer) => void;
}

/** All of the colors valid in the system. */
const colors = ['B', 'G', 'O', 'R', 'Y', 'P'];

/** 
 * The maximum length of the combination. This value becomes invalid if it surpasses the length of colors,
 * as it violates the precondition "No two slots can have the same color simultaneously."
 */
const combinationLength = 4;
if (combinationLength > colors.length) {
    throw new Error("An invalid combination length was provided, and it requires that the rules of the system be broken.");
}

/** A precalculated list of all possible score permutations. An optimization for the hot-loop calculateScore() function. */
const allScores = getAllPossibleScores();

/** Perform the main loop of the solver. */
export async function loop(delegates: Delegates, guess?: string, possibilities = getAllCombinations(), usedCodes = new Set<string>()) {
    if (!guess) {
        // Calculate the first guess. Since no locks can have multiples of the same letter, simply pick the first X
        // colors and use those as the guess. 
        guess = colors.slice(0, combinationLength).join('');
    }

    // Give the user our guess. 
    usedCodes.add(guess);
    const score = await delegates.guess(guess);

    // We got it!
    if (score.black == combinationLength) {
        delegates.solved({ answer: guess, attempts: usedCodes.size })
        return;
    }

    // Just in case. This should never happen if the algorithm is working properly.
    if (possibilities.length <= 1) {
        delegates.error("Something's gone horribly wrong. Sorry, I don't have an answer.");
        return;
    }

    // Pare down the remaining possibilities based on what we've learned from the score. 
    const remaining = parePossibilities(possibilities, guess, score);

    // Come up with another guess and recurse. 
    const nextGuess = findNextGuess(remaining, usedCodes);
    loop(delegates, nextGuess, remaining, usedCodes);
}

/** Find the next value to present */
function findNextGuess(remaining: string[], usedCodes: Set<string>) {

    // bail out if there's only one option left. That means we know the answer.
    if (remaining.length == 1)
        return remaining[0];

    // We're not actually making a guess. What we're doing is trying to find an answer that has the 
    // potential to eliminate the maximum number of remaining values, so that the size of the pool
    // shrinks by an order of magnitude. We're basically trying to find more information out, rather
    // than make an honest guess. 
    let min = Number.MAX_VALUE;
    let minCombination: string = "";

    // Turned this iterative to speed it up.
    // Functional looked nicer, but it's a hot O(n^3) loop. Everything counts. 
    for (let possibility of remaining) {
        if (usedCodes.has(possibility))
            continue;

        let max = 0;
        for (let score of allScores) {
            let count = 0;
            for (let guess of remaining) {
                if (scoreEquals(calculateScore(guess, possibility), score))
                    count++;
            }
            max = Math.max(count, max);
        }
        if (max < min) {
            min = max;
            minCombination = possibility;
        }
    }

    return minCombination;
}

/** Determine if the scores are equivalent */
export function scoreEquals(left: Score, right: Score) {
    return left.white == right.white && left.black == right.black;
}

/** 
 * Removes all possibilities from the remaining list that don't match the score we were given.
 * Since we know that score(x,y) == score(y,x), we can assume that any remaining possibility
 * that doesn't give us the score that was returned with our guess can never be a match. 
 */
function parePossibilities(possibilities: string[], guess: string, score: Score) {
    return possibilities.filter(p => isValidScore(p, guess, score));
}

/** Determines, for the given two combinations, whether the score matches. */
function isValidScore(possibility: string, guess: string, score: Score) {
    const c = calculateScore(possibility, guess);
    return scoreEquals(c, score);
}

/** Calculates a score given two combinations. */
const memoizedScores = new Map<string, Score>();
const combinationIndices = _.range(combinationLength);
export function calculateScore(guess: string, possibility: string) {
    // return cached version if it exists. Hot-loop optimization.
    const memo = memoizedScores.get(guess + possibility);
    if (memo)
        return memo;

    // Get all indices in the strings that don't exactly match. 
    const nonMatchingIndices = combinationIndices.filter(i => guess[i] != possibility[i]);

    // Filter out the exact matches leaving us with arrays of strings that may match, but the positional data
    // is unimportant at this point.
    const g = nonMatchingIndices.map(i => guess[i]);
    const p = nonMatchingIndices.map(i => possibility[i]);

    // white is the number of non-matching indices where there exists at least one matching entry in p
    // for every entry in g. If the "No two slots can have the same color simultaneously" rule
    // were not in place, this calculation becomes more complex, because of the following situation:
    // "BBOO" vs "OOBG". This current version would erroneously report the score as 4W, because
    // it would match both B's in the first with the single B in the second. Instead the correct 
    // answer is 3W, as you're supposed to cross out the eliminated items as you run across them.
    let white = g.filter(x => p.indexOf(x) != -1).length;

    // black is the number of items that matched; ie len(guess) - len(nonmatching)
    const score = { white, black: guess.length - nonMatchingIndices.length };

    // Memoize the calculations to speed things up, and set the reverse case too, because 
    // calculateScores(x, y) == calculateScores(y, x).
    memoizedScores.set(guess + possibility, score);
    memoizedScores.set(possibility + guess, score);
    return score;
}

/** 
 * Parses a score in text format into a structure we can use. Doesn't do error-handling. 
 * Any invalid string is simply { w: 0, b: 0 } for simplicity. A production app should naturally
 * be more protective. 
 */
export function parseScore(score: string): Score {
    score = score.toLowerCase();
    const w = /(\d)w/g.exec(score);
    const b = /(\d)b/g.exec(score);
    return {
        white: w ? parseInt(w[1]) : 0,
        black: b ? parseInt(b[1]) : 0
    }
}

/** Prints a score in AR challenge format, for output purposes. */
export function printScore(score: Score) {
    let str = "";
    if (score.white) str += score.white + "W";
    if (score.black) str += score.black + "B";
    return str;
}

/** Computes a set of all possible combinations */
export function getAllCombinations() {
    return permutateString(_.range(0, colors.length), [], combinationLength);
}

/** Recursive function that permutates a set of numbers for a set depth. */
function permutateString(set: number[], current: number[], depth: number): string[] {
    // Use recursion to calculate the string permutations. Start by calculating "1, 2, 3, 4, 5, 6",
    // then recurse down a level, calculating "12, 13, 14, 15, 16" and "21, 23, 24, 25, 26", etc.
    // Continue until the desired depth is reached.

    // base case. No more permutations to explore, convert the "current" array into letters,
    // and join them into a string representing the lock combination. 
    if (depth == 0) {
        return [current.map(x => colors[x]).join('')];
    }

    // More iterations to perform. Recurse down another level. 
    return set
        .filter(i => current.indexOf(i) == -1)   // filtering added when the no-duplicates rule was discovered.
        .map(i => permutateString(set, current.concat(i), depth - 1))
        .reduce((p, c) => p.concat(c), []);
}

/** Permutates a list of all possible scores that can exist. */
function getAllPossibleScores() {
    // Scores are of the form xWyB, where the sum of x+y can be at most "combinationlength", and at least 0. 
    // Therefore, iterate through the number 0..combinationlength, and for each sum, calculate
    // the permutations of scores that equal that sum. 
    // For example, getScoresForSum(3) returns: {0,3}, {1,2}, {2,1}, {3,0}.
    // Concatenate all permutations and we have all valid scores. 
    return _.range(0, combinationLength + 1)
        .map(sum => getScoresForSum(sum))
        .reduce((p, c) => p.concat(c), []);
}

/** Permutates a list of all possible scores that have the given sum. */
function getScoresForSum(sum: number) {
    return _.range(0, sum + 1)
        .map(white => { return { white, black: sum - white } });
}

/** 
 * Gets a random configuration from the set of all possible combinations. 
 * There's way faster ways to do this, but it's only for testing so I opted for easiest.
 */
export function getRandomConfig(): string {
    const set = getAllCombinations();
    return set[_.random(0, set.length - 1, false)];
}
