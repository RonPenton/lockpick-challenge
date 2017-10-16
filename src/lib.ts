import * as _ from 'lodash';

export type Score = { white: number, black: number };
export type Guesser = (guess: string) => Promise<Score>;
export type Answer = { answer: string, attempts: number };
export type Delegates = {
    guess: Guesser,
    error: (error: any) => void,
    solved: (answer: Answer) => void;
}


const colors = ['B', 'G', 'O', 'R', 'Y', 'P'];
const combinationLength = 4;
const combinationIndices = _.range(combinationLength);
const allCodes = initializeSet();
const allScores = getAllPossibleScores();

/** Perform the main loop of the solver. */
export async function loop(delegates: Delegates, guess = 'BGOO', possibilities = initializeSet(), usedCodes = new Set<string>()) {

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

    // optimization tweak. If there's 2 left, pick one. 50/50 chance we're right and we can skip that last step.
    if(remaining.length == 2)
        return remaining[_.random(0,1)];

    // We're not actually making a guess. In all likelihood the guess we're going to pick here
    // has already been eliminated. What we're doing is trying to find an answer that has the 
    // potential to eliminate the maximum number of remaining values, so that the size of the pool
    // shrinks by an order of magnitude. We're basically trying to find more information out, rather
    // than make an honest guess. 
    let min = Number.MAX_VALUE;
    let minCombination: string = "";

    // Turned this iterative to speed it up.
    // Functional looked nicer, but it's a hot O(n^3) loop. Everything counts. 
    for (let p = 0; p < allCodes.length; p++) {
        const possibility = allCodes[p];
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
    const memo = memoizedScores.get(guess + possibility);
    if (memo)
        return memo;

    const nonMatchingIndices = combinationIndices.filter(i => guess[i] != possibility[i]);
    const g = nonMatchingIndices.map(i => guess[i]);
    const p = nonMatchingIndices.map(i => possibility[i]);
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

    // Memoize the calculations to speed things up, and set the reverse too, because they're reversible.
    memoizedScores.set(guess + possibility, score);
    memoizedScores.set(possibility + guess, score);
    return score;
}

/** Parses a score in text format into a structure we can use. Doesn't do error-handling. */
export function parseScore(score: string): Score {
    const w = /(\d)W/g.exec(score);
    const b = /(\d)B/g.exec(score);

    return {
        white: w ? parseInt(w[1]) : 0,
        black: b ? parseInt(b[1]) : 0
    }
}

/** Prints a score in AR challenge format. */
export function printScore(score: Score) {
    let str = "";
    if (score.white) str += score.white + "W";
    if (score.black) str += score.black + "B";
    return str;
}

/** Computes a set of all possible combinations */
function initializeSet() {
    return permutateString(_.range(0, colors.length), "", combinationLength);
}

/** Recursive function that permutates a set of numbers for a set depth. */
function permutateString(numbers: number[], current: string, depth: number): string[] {
    if (depth == 0) {
        return [current]
    }

    return numbers.map(i => permutateString(numbers, current + colors[i], depth - 1))
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