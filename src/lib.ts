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

/** A list of indices into a given combination string. This is more a performance optimization than anything. */
const combinationIndices = _.range(combinationLength);

/** A precalculated list of all possible score permutations. An optimization for the hot-loop calculateScore() function. */
const allScores = getAllPossibleScores();

/** Perform the main loop of the solver. */
export async function loop(delegates: Delegates, guess?: string, possibilities = initializeSet(), usedCodes = new Set<string>()) {
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
    for (let p = 0; p < remaining.length; p++) {
        const possibility = remaining[p];
        if (usedCodes.has(possibility))
            continue;

        let max = 0;
        for (let s = 0; s < allScores.length; s++) {
            const score = allScores[s];
            let count = 0;
            for (let g = 0; g < remaining.length; g++) {
                if (scoreEquals(calculateScore(remaining[g], possibility), score))
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

/** Removes all possibilities from the remaining list that don't match the score we were given. */
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

    // Not a fan of iteration here but couldn't think of a simpler way to represent what's going on
    // while also being performant. Iteration it is. Remove items from P if they exist in Q.
    // Actually this was more important in the earlier version of the app, when combinations could
    // hold duplicate values. Now that I think about it, this becomes much simpler in the current version.
    // Still, I'm leaving it, because this function works in all cases, whether duplicates are allowed
    // or not. You never know when the future is going to change requirements I guess. Maybe should be 
    // exposed for unit tests in that case but it's a private function, and it works, so... bother.
    let white = 0;
    g.forEach(v => {
        const i = p.indexOf(v);
        if (i != -1) {
            white++;
            p.splice(i, 1);
        }
    });

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
export function initializeSet() {
    return permutateString(_.range(0, colors.length), [], combinationLength);
}

/** Recursive function that permutates a set of numbers for a set depth. */
function permutateString(set: number[], current: number[], depth: number): string[] {
    if (depth == 0) {
        return [current.map(x => colors[x]).join('')];
    }

    return set
        .filter(i => current.indexOf(i) == -1)   // filtering added when the no-duplicates rule was discovered.
        .map(i => permutateString(set, current.concat(i), depth - 1))
        .reduce((p, c) => p.concat(c), []);
}

/** Permutates a list of all possible scores that can exist. */
function getAllPossibleScores() {
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
    const set = initializeSet();
    return set[_.random(0, set.length - 1, false)];
}