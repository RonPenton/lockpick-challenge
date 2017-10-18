"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("lodash");
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
async function loop(delegates, guess, possibilities = getAllCombinations(), usedCodes = new Set()) {
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
        delegates.solved({ answer: guess, attempts: usedCodes.size });
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
exports.loop = loop;
/** Find the next value to present */
function findNextGuess(remaining, usedCodes) {
    // bail out if there's only one option left. That means we know the answer.
    if (remaining.length == 1)
        return remaining[0];
    // We're not actually making a guess. What we're doing is trying to find an answer that has the 
    // potential to eliminate the maximum number of remaining values, so that the size of the pool
    // shrinks by an order of magnitude. We're basically trying to find more information out, rather
    // than make an honest guess. 
    let min = Number.MAX_VALUE;
    let minCombination = "";
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
function scoreEquals(left, right) {
    return left.white == right.white && left.black == right.black;
}
exports.scoreEquals = scoreEquals;
/**
 * Removes all possibilities from the remaining list that don't match the score we were given.
 * Since we know that score(x,y) == score(y,x), we can assume that any remaining possibility
 * that doesn't give us the score that was returned with our guess can never be a match.
 */
function parePossibilities(possibilities, guess, score) {
    return possibilities.filter(p => isValidScore(p, guess, score));
}
/** Determines, for the given two combinations, whether the score matches. */
function isValidScore(possibility, guess, score) {
    const c = calculateScore(possibility, guess);
    return scoreEquals(c, score);
}
/** Calculates a score given two combinations. */
const memoizedScores = new Map();
const combinationIndices = _.range(combinationLength);
function calculateScore(guess, possibility) {
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
exports.calculateScore = calculateScore;
/**
 * Parses a score in text format into a structure we can use. Doesn't do error-handling.
 * Any invalid string is simply { w: 0, b: 0 } for simplicity. A production app should naturally
 * be more protective.
 */
function parseScore(score) {
    score = score.toLowerCase();
    const w = /(\d)w/g.exec(score);
    const b = /(\d)b/g.exec(score);
    return {
        white: w ? parseInt(w[1]) : 0,
        black: b ? parseInt(b[1]) : 0
    };
}
exports.parseScore = parseScore;
/** Prints a score in AR challenge format, for output purposes. */
function printScore(score) {
    let str = "";
    if (score.white)
        str += score.white + "W";
    if (score.black)
        str += score.black + "B";
    return str;
}
exports.printScore = printScore;
/** Computes a set of all possible combinations */
function getAllCombinations() {
    return permutateString(_.range(0, colors.length), [], combinationLength);
}
exports.getAllCombinations = getAllCombinations;
/** Recursive function that permutates a set of numbers for a set depth. */
function permutateString(set, current, depth) {
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
        .filter(i => current.indexOf(i) == -1) // filtering added when the no-duplicates rule was discovered.
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
function getScoresForSum(sum) {
    return _.range(0, sum + 1)
        .map(white => { return { white, black: sum - white }; });
}
/**
 * Gets a random configuration from the set of all possible combinations.
 * There's way faster ways to do this, but it's only for testing so I opted for easiest.
 */
function getRandomConfig() {
    const set = getAllCombinations();
    return set[_.random(0, set.length - 1, false)];
}
exports.getRandomConfig = getRandomConfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGliLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2xpYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDRCQUE0QjtBQXFCNUIsNkNBQTZDO0FBQzdDLE1BQU0sTUFBTSxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUU5Qzs7O0dBR0c7QUFDSCxNQUFNLGlCQUFpQixHQUFHLENBQUMsQ0FBQztBQUM1QixFQUFFLENBQUMsQ0FBQyxpQkFBaUIsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUNwQyxNQUFNLElBQUksS0FBSyxDQUFDLHFHQUFxRyxDQUFDLENBQUM7QUFDM0gsQ0FBQztBQUVELDJIQUEySDtBQUMzSCxNQUFNLFNBQVMsR0FBRyxvQkFBb0IsRUFBRSxDQUFDO0FBRXpDLDJDQUEyQztBQUNwQyxLQUFLLGVBQWUsU0FBb0IsRUFBRSxLQUFjLEVBQUUsYUFBYSxHQUFHLGtCQUFrQixFQUFFLEVBQUUsU0FBUyxHQUFHLElBQUksR0FBRyxFQUFVO0lBQ2hJLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNULDJHQUEyRztRQUMzRyxzQ0FBc0M7UUFDdEMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLGlCQUFpQixDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3hELENBQUM7SUFFRCw0QkFBNEI7SUFDNUIsU0FBUyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNyQixNQUFNLEtBQUssR0FBRyxNQUFNLFNBQVMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7SUFFM0MsYUFBYTtJQUNiLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLElBQUksaUJBQWlCLENBQUMsQ0FBQyxDQUFDO1FBQ25DLFNBQVMsQ0FB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QyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDM0MsQ0FBQztBQUVELCtEQUErRDtBQUMvRDtJQUNJLHlHQUF5RztJQUN6RywwRkFBMEY7SUFDMUYsbURBQW1EO0lBQ25ELHVFQUF1RTtJQUN2RSw4REFBOEQ7SUFDOUQsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLGlCQUFpQixHQUFHLENBQUMsQ0FBQztTQUNuQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDaEMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUMzQyxDQUFDO0FBRUQsd0VBQXdFO0FBQ3hFLHlCQUF5QixHQUFXO0lBQ2hDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1NBQ3JCLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxHQUFHLE1BQU0sQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxHQUFHLEtBQUssRUFBRSxDQUFBLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEUsQ0FBQztBQUVEOzs7R0FHRztBQUNIO0lBQ0ksTUFBTSxHQUFHLEdBQUcsa0JBQWtCLEVBQUUsQ0FBQztJQUNqQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDbkQsQ0FBQztBQUhELDBDQUdDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xyXG5cclxuLyoqIEEgc2NvcmUgdG8gYmUgY2FsY3VsYXRlZCBiZXR3ZWVuIHR3byBsb2NrIGNvbmZpZ3VyYXRpb25zICovXHJcbmV4cG9ydCB0eXBlIFNjb3JlID0geyB3aGl0ZTogbnVtYmVyLCBibGFjazogbnVtYmVyIH07XHJcblxyXG4vKiogYSBmdW5jdGlvbiB0aGF0IHdpbGwgYXN5bmNocm9ub3VzbHkgcmV0dXJuIGEgc2NvcmUgYmFzZWQgb24gYSBnaXZlbiBsb2NrIGd1ZXNzLiAqL1xyXG5leHBvcnQgdHlwZSBHdWVzc2VyID0gKGd1ZXNzOiBzdHJpbmcpID0+IFByb21pc2U8U2NvcmU+O1xyXG5cclxuLyoqIEFuIGFuc3dlciwgcmVwcmVzZW50aW5nIHRoZSBmaW5hbCByZXN1bHQgYW5kIHRoZSBudW1iZXIgb2YgYXR0ZW1wdHMgdG8gcmVhY2ggdGhhdCByZXN1bHQuICovXHJcbmV4cG9ydCB0eXBlIEFuc3dlciA9IHsgYW5zd2VyOiBzdHJpbmcsIGF0dGVtcHRzOiBudW1iZXIgfTtcclxuXHJcbi8qKiBcclxuICogQW4gb2JqZWN0IGNvbnRhaW5pbmcgY2FsbGJhY2tzIHRvIGJlIGNhbGxlZCwgZ2l2ZW4gdmFyaW91cyBldmVudHMgdGhhdCBjYW4gaGFwcGVuIGR1cmluZyBjYWxjdWxhdGlvblxyXG4gKiBvZiBhIGd1ZXNzLlxyXG4gKi9cclxuZXhwb3J0IHR5cGUgRGVsZWdhdGVzID0ge1xyXG4gICAgZ3Vlc3M6IEd1ZXNzZXIsXHJcbiAgICBlcnJvcjogKGVycm9yOiBhbnkpID0+IHZvaWQsXHJcbiAgICBzb2x2ZWQ6IChhbnN3ZXI6IEFuc3dlcikgPT4gdm9pZDtcclxufVxyXG5cclxuLyoqIEFsbCBvZiB0aGUgY29sb3JzIHZhbGlkIGluIHRoZSBzeXN0ZW0uICovXHJcbmNvbnN0IGNvbG9ycyA9IFsnQicsICdHJywgJ08nLCAnUicsICdZJywgJ1AnXTtcclxuXHJcbi8qKiBcclxuICogVGhlIG1heGltdW0gbGVuZ3RoIG9mIHRoZSBjb21iaW5hdGlvbi4gVGhpcyB2YWx1ZSBiZWNvbWVzIGludmFsaWQgaWYgaXQgc3VycGFzc2VzIHRoZSBsZW5ndGggb2YgY29sb3JzLFxyXG4gKiBhcyBpdCB2aW9sYXRlcyB0aGUgcHJlY29uZGl0aW9uIFwiTm8gdHdvIHNsb3RzIGNhbiBoYXZlIHRoZSBzYW1lIGNvbG9yIHNpbXVsdGFuZW91c2x5LlwiXHJcbiAqL1xyXG5jb25zdCBjb21iaW5hdGlvbkxlbmd0aCA9IDQ7XHJcbmlmIChjb21iaW5hdGlvbkxlbmd0aCA+IGNvbG9ycy5sZW5ndGgpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihcIkFuIGludmFsaWQgY29tYmluYXRpb24gbGVuZ3RoIHdhcyBwcm92aWRlZCwgYW5kIGl0IHJlcXVpcmVzIHRoYXQgdGhlIHJ1bGVzIG9mIHRoZSBzeXN0ZW0gYmUgYnJva2VuLlwiKTtcclxufVxyXG5cclxuLyoqIEEgcHJlY2FsY3VsYXRlZCBsaXN0IG9mIGFsbCBwb3NzaWJsZSBzY29yZSBwZXJtdXRhdGlvbnMuIEFuIG9wdGltaXphdGlvbiBmb3IgdGhlIGhvdC1sb29wIGNhbGN1bGF0ZVNjb3JlKCkgZnVuY3Rpb24uICovXHJcbmNvbnN0IGFsbFNjb3JlcyA9IGdldEFsbFBvc3NpYmxlU2NvcmVzKCk7XHJcblxyXG4vKiogUGVyZm9ybSB0aGUgbWFpbiBsb29wIG9mIHRoZSBzb2x2ZXIuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb29wKGRlbGVnYXRlczogRGVsZWdhdGVzLCBndWVzcz86IHN0cmluZywgcG9zc2liaWxpdGllcyA9IGdldEFsbENvbWJpbmF0aW9ucygpLCB1c2VkQ29kZXMgPSBuZXcgU2V0PHN0cmluZz4oKSkge1xyXG4gICAgaWYgKCFndWVzcykge1xyXG4gICAgICAgIC8vIENhbGN1bGF0ZSB0aGUgZmlyc3QgZ3Vlc3MuIFNpbmNlIG5vIGxvY2tzIGNhbiBoYXZlIG11bHRpcGxlcyBvZiB0aGUgc2FtZSBsZXR0ZXIsIHNpbXBseSBwaWNrIHRoZSBmaXJzdCBYXHJcbiAgICAgICAgLy8gY29sb3JzIGFuZCB1c2UgdGhvc2UgYXMgdGhlIGd1ZXNzLiBcclxuICAgICAgICBndWVzcyA9IGNvbG9ycy5zbGljZSgwLCBjb21iaW5hdGlvbkxlbmd0aCkuam9pbignJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gR2l2ZSB0aGUgdXNlciBvdXIgZ3Vlc3MuIFxyXG4gICAgdXNlZENvZGVzLmFkZChndWVzcyk7XHJcbiAgICBjb25zdCBzY29yZSA9IGF3YWl0IGRlbGVnYXRlcy5ndWVzcyhndWVzcyk7XHJcblxyXG4gICAgLy8gV2UgZ290IGl0IVxyXG4gICAgaWYgKHNjb3JlLmJsYWNrID09IGNvbWJpbmF0aW9uTGVuZ3RoKSB7XHJcbiAgICAgICAgZGVsZWdhdGVzLnNvbHZlZCh7IGFuc3dlcjogZ3Vlc3MsIGF0dGVtcHRzOiB1c2VkQ29kZXMuc2l6ZSB9KVxyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBKdXN0IGluIGNhc2UuIFRoaXMgc2hvdWxkIG5ldmVyIGhhcHBlbiBpZiB0aGUgYWxnb3JpdGhtIGlzIHdvcmtpbmcgcHJvcGVybHkuXHJcbiAgICBpZiAocG9zc2liaWxpdGllcy5sZW5ndGggPD0gMSkge1xyXG4gICAgICAgIGRlbGVnYXRlcy5lcnJvcihcIlNvbWV0aGluZydzIGdvbmUgaG9ycmlibHkgd3JvbmcuIFNvcnJ5LCBJIGRvbid0IGhhdmUgYW4gYW5zd2VyLlwiKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgLy8gUGFyZSBkb3duIHRoZSByZW1haW5pbmcgcG9zc2liaWxpdGllcyBiYXNlZCBvbiB3aGF0IHdlJ3ZlIGxlYXJuZWQgZnJvbSB0aGUgc2NvcmUuIFxyXG4gICAgY29uc3QgcmVtYWluaW5nID0gcGFyZVBvc3NpYmlsaXRpZXMocG9zc2liaWxpdGllcywgZ3Vlc3MsIHNjb3JlKTtcclxuXHJcbiAgICAvLyBDb21lIHVwIHdpdGggYW5vdGhlciBndWVzcyBhbmQgcmVjdXJzZS4gXHJcbiAgICBjb25zdCBuZXh0R3Vlc3MgPSBmaW5kTmV4dEd1ZXNzKHJlbWFpbmluZywgdXNlZENvZGVzKTtcclxuICAgIGxvb3AoZGVsZWdhdGVzLCBuZXh0R3Vlc3MsIHJlbWFpbmluZywgdXNlZENvZGVzKTtcclxufVxyXG5cclxuLyoqIEZpbmQgdGhlIG5leHQgdmFsdWUgdG8gcHJlc2VudCAqL1xyXG5mdW5jdGlvbiBmaW5kTmV4dEd1ZXNzKHJlbWFpbmluZzogc3RyaW5nW10sIHVzZWRDb2RlczogU2V0PHN0cmluZz4pIHtcclxuXHJcbiAgICAvLyBiYWlsIG91dCBpZiB0aGVyZSdzIG9ubHkgb25lIG9wdGlvbiBsZWZ0LiBUaGF0IG1lYW5zIHdlIGtub3cgdGhlIGFuc3dlci5cclxuICAgIGlmIChyZW1haW5pbmcubGVuZ3RoID09IDEpXHJcbiAgICAgICAgcmV0dXJuIHJlbWFpbmluZ1swXTtcclxuXHJcbiAgICAvLyBXZSdyZSBub3QgYWN0dWFsbHkgbWFraW5nIGEgZ3Vlc3MuIFdoYXQgd2UncmUgZG9pbmcgaXMgdHJ5aW5nIHRvIGZpbmQgYW4gYW5zd2VyIHRoYXQgaGFzIHRoZSBcclxuICAgIC8vIHBvdGVudGlhbCB0byBlbGltaW5hdGUgdGhlIG1heGltdW0gbnVtYmVyIG9mIHJlbWFpbmluZyB2YWx1ZXMsIHNvIHRoYXQgdGhlIHNpemUgb2YgdGhlIHBvb2xcclxuICAgIC8vIHNocmlua3MgYnkgYW4gb3JkZXIgb2YgbWFnbml0dWRlLiBXZSdyZSBiYXNpY2FsbHkgdHJ5aW5nIHRvIGZpbmQgbW9yZSBpbmZvcm1hdGlvbiBvdXQsIHJhdGhlclxyXG4gICAgLy8gdGhhbiBtYWtlIGFuIGhvbmVzdCBndWVzcy4gXHJcbiAgICBsZXQgbWluID0gTnVtYmVyLk1BWF9WQUxVRTtcclxuICAgIGxldCBtaW5Db21iaW5hdGlvbjogc3RyaW5nID0gXCJcIjtcclxuXHJcbiAgICAvLyBUdXJuZWQgdGhpcyBpdGVyYXRpdmUgdG8gc3BlZWQgaXQgdXAuXHJcbiAgICAvLyBGdW5jdGlvbmFsIGxvb2tlZCBuaWNlciwgYnV0IGl0J3MgYSBob3QgTyhuXjMpIGxvb3AuIEV2ZXJ5dGhpbmcgY291bnRzLiBcclxuICAgIGZvciAobGV0IHBvc3NpYmlsaXR5IG9mIHJlbWFpbmluZykge1xyXG4gICAgICAgIGlmICh1c2VkQ29kZXMuaGFzKHBvc3NpYmlsaXR5KSlcclxuICAgICAgICAgICAgY29udGludWU7XHJcblxyXG4gICAgICAgIGxldCBtYXggPSAwO1xyXG4gICAgICAgIGZvciAobGV0IHNjb3JlIG9mIGFsbFNjb3Jlcykge1xyXG4gICAgICAgICAgICBsZXQgY291bnQgPSAwO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBndWVzcyBvZiByZW1haW5pbmcpIHtcclxuICAgICAgICAgICAgICAgIGlmIChzY29yZUVxdWFscyhjYWxjdWxhdGVTY29yZShndWVzcywgcG9zc2liaWxpdHkpLCBzY29yZSkpXHJcbiAgICAgICAgICAgICAgICAgICAgY291bnQrKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBtYXggPSBNYXRoLm1heChjb3VudCwgbWF4KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKG1heCA8IG1pbikge1xyXG4gICAgICAgICAgICBtaW4gPSBtYXg7XHJcbiAgICAgICAgICAgIG1pbkNvbWJpbmF0aW9uID0gcG9zc2liaWxpdHk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBtaW5Db21iaW5hdGlvbjtcclxufVxyXG5cclxuLyoqIERldGVybWluZSBpZiB0aGUgc2NvcmVzIGFyZSBlcXVpdmFsZW50ICovXHJcbmV4cG9ydCBmdW5jdGlvbiBzY29yZUVxdWFscyhsZWZ0OiBTY29yZSwgcmlnaHQ6IFNjb3JlKSB7XHJcbiAgICByZXR1cm4gbGVmdC53aGl0ZSA9PSByaWdodC53aGl0ZSAmJiBsZWZ0LmJsYWNrID09IHJpZ2h0LmJsYWNrO1xyXG59XHJcblxyXG4vKiogXHJcbiAqIFJlbW92ZXMgYWxsIHBvc3NpYmlsaXRpZXMgZnJvbSB0aGUgcmVtYWluaW5nIGxpc3QgdGhhdCBkb24ndCBtYXRjaCB0aGUgc2NvcmUgd2Ugd2VyZSBnaXZlbi5cclxuICogU2luY2Ugd2Uga25vdyB0aGF0IHNjb3JlKHgseSkgPT0gc2NvcmUoeSx4KSwgd2UgY2FuIGFzc3VtZSB0aGF0IGFueSByZW1haW5pbmcgcG9zc2liaWxpdHlcclxuICogdGhhdCBkb2Vzbid0IGdpdmUgdXMgdGhlIHNjb3JlIHRoYXQgd2FzIHJldHVybmVkIHdpdGggb3VyIGd1ZXNzIGNhbiBuZXZlciBiZSBhIG1hdGNoLiBcclxuICovXHJcbmZ1bmN0aW9uIHBhcmVQb3NzaWJpbGl0aWVzKHBvc3NpYmlsaXRpZXM6IHN0cmluZ1tdLCBndWVzczogc3RyaW5nLCBzY29yZTogU2NvcmUpIHtcclxuICAgIHJldHVybiBwb3NzaWJpbGl0aWVzLmZpbHRlcihwID0+IGlzVmFsaWRTY29yZShwLCBndWVzcywgc2NvcmUpKTtcclxufVxyXG5cclxuLyoqIERldGVybWluZXMsIGZvciB0aGUgZ2l2ZW4gdHdvIGNvbWJpbmF0aW9ucywgd2hldGhlciB0aGUgc2NvcmUgbWF0Y2hlcy4gKi9cclxuZnVuY3Rpb24gaXNWYWxpZFNjb3JlKHBvc3NpYmlsaXR5OiBzdHJpbmcsIGd1ZXNzOiBzdHJpbmcsIHNjb3JlOiBTY29yZSkge1xyXG4gICAgY29uc3QgYyA9IGNhbGN1bGF0ZVNjb3JlKHBvc3NpYmlsaXR5LCBndWVzcyk7XHJcbiAgICByZXR1cm4gc2NvcmVFcXVhbHMoYywgc2NvcmUpO1xyXG59XHJcblxyXG4vKiogQ2FsY3VsYXRlcyBhIHNjb3JlIGdpdmVuIHR3byBjb21iaW5hdGlvbnMuICovXHJcbmNvbnN0IG1lbW9pemVkU2NvcmVzID0gbmV3IE1hcDxzdHJpbmcsIFNjb3JlPigpO1xyXG5jb25zdCBjb21iaW5hdGlvbkluZGljZXMgPSBfLnJhbmdlKGNvbWJpbmF0aW9uTGVuZ3RoKTtcclxuZXhwb3J0IGZ1bmN0aW9uIGNhbGN1bGF0ZVNjb3JlKGd1ZXNzOiBzdHJpbmcsIHBvc3NpYmlsaXR5OiBzdHJpbmcpIHtcclxuICAgIC8vIHJldHVybiBjYWNoZWQgdmVyc2lvbiBpZiBpdCBleGlzdHMuIEhvdC1sb29wIG9wdGltaXphdGlvbi5cclxuICAgIGNvbnN0IG1lbW8gPSBtZW1vaXplZFNjb3Jlcy5nZXQoZ3Vlc3MgKyBwb3NzaWJpbGl0eSk7XHJcbiAgICBpZiAobWVtbylcclxuICAgICAgICByZXR1cm4gbWVtbztcclxuXHJcbiAgICAvLyBHZXQgYWxsIGluZGljZXMgaW4gdGhlIHN0cmluZ3MgdGhhdCBkb24ndCBleGFjdGx5IG1hdGNoLiBcclxuICAgIGNvbnN0IG5vbk1hdGNoaW5nSW5kaWNlcyA9IGNvbWJpbmF0aW9uSW5kaWNlcy5maWx0ZXIoaSA9PiBndWVzc1tpXSAhPSBwb3NzaWJpbGl0eVtpXSk7XHJcblxyXG4gICAgLy8gRmlsdGVyIG91dCB0aGUgZXhhY3QgbWF0Y2hlcyBsZWF2aW5nIHVzIHdpdGggYXJyYXlzIG9mIHN0cmluZ3MgdGhhdCBtYXkgbWF0Y2gsIGJ1dCB0aGUgcG9zaXRpb25hbCBkYXRhXHJcbiAgICAvLyBpcyB1bmltcG9ydGFudCBhdCB0aGlzIHBvaW50LlxyXG4gICAgY29uc3QgZyA9IG5vbk1hdGNoaW5nSW5kaWNlcy5tYXAoaSA9PiBndWVzc1tpXSk7XHJcbiAgICBjb25zdCBwID0gbm9uTWF0Y2hpbmdJbmRpY2VzLm1hcChpID0+IHBvc3NpYmlsaXR5W2ldKTtcclxuXHJcbiAgICAvLyB3aGl0ZSBpcyB0aGUgbnVtYmVyIG9mIG5vbi1tYXRjaGluZyBpbmRpY2VzIHdoZXJlIHRoZXJlIGV4aXN0cyBhdCBsZWFzdCBvbmUgbWF0Y2hpbmcgZW50cnkgaW4gcFxyXG4gICAgLy8gZm9yIGV2ZXJ5IGVudHJ5IGluIGcuIElmIHRoZSBcIk5vIHR3byBzbG90cyBjYW4gaGF2ZSB0aGUgc2FtZSBjb2xvciBzaW11bHRhbmVvdXNseVwiIHJ1bGVcclxuICAgIC8vIHdlcmUgbm90IGluIHBsYWNlLCB0aGlzIGNhbGN1bGF0aW9uIGJlY29tZXMgbW9yZSBjb21wbGV4LCBiZWNhdXNlIG9mIHRoZSBmb2xsb3dpbmcgc2l0dWF0aW9uOlxyXG4gICAgLy8gXCJCQk9PXCIgdnMgXCJPT0JHXCIuIFRoaXMgY3VycmVudCB2ZXJzaW9uIHdvdWxkIGVycm9uZW91c2x5IHJlcG9ydCB0aGUgc2NvcmUgYXMgNFcsIGJlY2F1c2VcclxuICAgIC8vIGl0IHdvdWxkIG1hdGNoIGJvdGggQidzIGluIHRoZSBmaXJzdCB3aXRoIHRoZSBzaW5nbGUgQiBpbiB0aGUgc2Vjb25kLiBJbnN0ZWFkIHRoZSBjb3JyZWN0IFxyXG4gICAgLy8gYW5zd2VyIGlzIDNXLCBhcyB5b3UncmUgc3VwcG9zZWQgdG8gY3Jvc3Mgb3V0IHRoZSBlbGltaW5hdGVkIGl0ZW1zIGFzIHlvdSBydW4gYWNyb3NzIHRoZW0uXHJcbiAgICBsZXQgd2hpdGUgPSBnLmZpbHRlcih4ID0+IHAuaW5kZXhPZih4KSAhPSAtMSkubGVuZ3RoO1xyXG5cclxuICAgIC8vIGJsYWNrIGlzIHRoZSBudW1iZXIgb2YgaXRlbXMgdGhhdCBtYXRjaGVkOyBpZSBsZW4oZ3Vlc3MpIC0gbGVuKG5vbm1hdGNoaW5nKVxyXG4gICAgY29uc3Qgc2NvcmUgPSB7IHdoaXRlLCBibGFjazogZ3Vlc3MubGVuZ3RoIC0gbm9uTWF0Y2hpbmdJbmRpY2VzLmxlbmd0aCB9O1xyXG5cclxuICAgIC8vIE1lbW9pemUgdGhlIGNhbGN1bGF0aW9ucyB0byBzcGVlZCB0aGluZ3MgdXAsIGFuZCBzZXQgdGhlIHJldmVyc2UgY2FzZSB0b28sIGJlY2F1c2UgXHJcbiAgICAvLyBjYWxjdWxhdGVTY29yZXMoeCwgeSkgPT0gY2FsY3VsYXRlU2NvcmVzKHksIHgpLlxyXG4gICAgbWVtb2l6ZWRTY29yZXMuc2V0KGd1ZXNzICsgcG9zc2liaWxpdHksIHNjb3JlKTtcclxuICAgIG1lbW9pemVkU2NvcmVzLnNldChwb3NzaWJpbGl0eSArIGd1ZXNzLCBzY29yZSk7XHJcbiAgICByZXR1cm4gc2NvcmU7XHJcbn1cclxuXHJcbi8qKiBcclxuICogUGFyc2VzIGEgc2NvcmUgaW4gdGV4dCBmb3JtYXQgaW50byBhIHN0cnVjdHVyZSB3ZSBjYW4gdXNlLiBEb2Vzbid0IGRvIGVycm9yLWhhbmRsaW5nLiBcclxuICogQW55IGludmFsaWQgc3RyaW5nIGlzIHNpbXBseSB7IHc6IDAsIGI6IDAgfSBmb3Igc2ltcGxpY2l0eS4gQSBwcm9kdWN0aW9uIGFwcCBzaG91bGQgbmF0dXJhbGx5XHJcbiAqIGJlIG1vcmUgcHJvdGVjdGl2ZS4gXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VTY29yZShzY29yZTogc3RyaW5nKTogU2NvcmUge1xyXG4gICAgc2NvcmUgPSBzY29yZS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgY29uc3QgdyA9IC8oXFxkKXcvZy5leGVjKHNjb3JlKTtcclxuICAgIGNvbnN0IGIgPSAvKFxcZCliL2cuZXhlYyhzY29yZSk7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIHdoaXRlOiB3ID8gcGFyc2VJbnQod1sxXSkgOiAwLFxyXG4gICAgICAgIGJsYWNrOiBiID8gcGFyc2VJbnQoYlsxXSkgOiAwXHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKiBQcmludHMgYSBzY29yZSBpbiBBUiBjaGFsbGVuZ2UgZm9ybWF0LCBmb3Igb3V0cHV0IHB1cnBvc2VzLiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcHJpbnRTY29yZShzY29yZTogU2NvcmUpIHtcclxuICAgIGxldCBzdHIgPSBcIlwiO1xyXG4gICAgaWYgKHNjb3JlLndoaXRlKSBzdHIgKz0gc2NvcmUud2hpdGUgKyBcIldcIjtcclxuICAgIGlmIChzY29yZS5ibGFjaykgc3RyICs9IHNjb3JlLmJsYWNrICsgXCJCXCI7XHJcbiAgICByZXR1cm4gc3RyO1xyXG59XHJcblxyXG4vKiogQ29tcHV0ZXMgYSBzZXQgb2YgYWxsIHBvc3NpYmxlIGNvbWJpbmF0aW9ucyAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWxsQ29tYmluYXRpb25zKCkge1xyXG4gICAgcmV0dXJuIHBlcm11dGF0ZVN0cmluZyhfLnJhbmdlKDAsIGNvbG9ycy5sZW5ndGgpLCBbXSwgY29tYmluYXRpb25MZW5ndGgpO1xyXG59XHJcblxyXG4vKiogUmVjdXJzaXZlIGZ1bmN0aW9uIHRoYXQgcGVybXV0YXRlcyBhIHNldCBvZiBudW1iZXJzIGZvciBhIHNldCBkZXB0aC4gKi9cclxuZnVuY3Rpb24gcGVybXV0YXRlU3RyaW5nKHNldDogbnVtYmVyW10sIGN1cnJlbnQ6IG51bWJlcltdLCBkZXB0aDogbnVtYmVyKTogc3RyaW5nW10ge1xyXG4gICAgLy8gVXNlIHJlY3Vyc2lvbiB0byBjYWxjdWxhdGUgdGhlIHN0cmluZyBwZXJtdXRhdGlvbnMuIFN0YXJ0IGJ5IGNhbGN1bGF0aW5nIFwiMSwgMiwgMywgNCwgNSwgNlwiLFxyXG4gICAgLy8gdGhlbiByZWN1cnNlIGRvd24gYSBsZXZlbCwgY2FsY3VsYXRpbmcgXCIxMiwgMTMsIDE0LCAxNSwgMTZcIiBhbmQgXCIyMSwgMjMsIDI0LCAyNSwgMjZcIiwgZXRjLlxyXG4gICAgLy8gQ29udGludWUgdW50aWwgdGhlIGRlc2lyZWQgZGVwdGggaXMgcmVhY2hlZC5cclxuXHJcbiAgICAvLyBiYXNlIGNhc2UuIE5vIG1vcmUgcGVybXV0YXRpb25zIHRvIGV4cGxvcmUsIGNvbnZlcnQgdGhlIFwiY3VycmVudFwiIGFycmF5IGludG8gbGV0dGVycyxcclxuICAgIC8vIGFuZCBqb2luIHRoZW0gaW50byBhIHN0cmluZyByZXByZXNlbnRpbmcgdGhlIGxvY2sgY29tYmluYXRpb24uIFxyXG4gICAgaWYgKGRlcHRoID09IDApIHtcclxuICAgICAgICByZXR1cm4gW2N1cnJlbnQubWFwKHggPT4gY29sb3JzW3hdKS5qb2luKCcnKV07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gTW9yZSBpdGVyYXRpb25zIHRvIHBlcmZvcm0uIFJlY3Vyc2UgZG93biBhbm90aGVyIGxldmVsLiBcclxuICAgIHJldHVybiBzZXRcclxuICAgICAgICAuZmlsdGVyKGkgPT4gY3VycmVudC5pbmRleE9mKGkpID09IC0xKSAgIC8vIGZpbHRlcmluZyBhZGRlZCB3aGVuIHRoZSBuby1kdXBsaWNhdGVzIHJ1bGUgd2FzIGRpc2NvdmVyZWQuXHJcbiAgICAgICAgLm1hcChpID0+IHBlcm11dGF0ZVN0cmluZyhzZXQsIGN1cnJlbnQuY29uY2F0KGkpLCBkZXB0aCAtIDEpKVxyXG4gICAgICAgIC5yZWR1Y2UoKHAsIGMpID0+IHAuY29uY2F0KGMpLCBbXSk7XHJcbn1cclxuXHJcbi8qKiBQZXJtdXRhdGVzIGEgbGlzdCBvZiBhbGwgcG9zc2libGUgc2NvcmVzIHRoYXQgY2FuIGV4aXN0LiAqL1xyXG5mdW5jdGlvbiBnZXRBbGxQb3NzaWJsZVNjb3JlcygpIHtcclxuICAgIC8vIFNjb3JlcyBhcmUgb2YgdGhlIGZvcm0geFd5Qiwgd2hlcmUgdGhlIHN1bSBvZiB4K3kgY2FuIGJlIGF0IG1vc3QgXCJjb21iaW5hdGlvbmxlbmd0aFwiLCBhbmQgYXQgbGVhc3QgMC4gXHJcbiAgICAvLyBUaGVyZWZvcmUsIGl0ZXJhdGUgdGhyb3VnaCB0aGUgbnVtYmVyIDAuLmNvbWJpbmF0aW9ubGVuZ3RoLCBhbmQgZm9yIGVhY2ggc3VtLCBjYWxjdWxhdGVcclxuICAgIC8vIHRoZSBwZXJtdXRhdGlvbnMgb2Ygc2NvcmVzIHRoYXQgZXF1YWwgdGhhdCBzdW0uIFxyXG4gICAgLy8gRm9yIGV4YW1wbGUsIGdldFNjb3Jlc0ZvclN1bSgzKSByZXR1cm5zOiB7MCwzfSwgezEsMn0sIHsyLDF9LCB7MywwfS5cclxuICAgIC8vIENvbmNhdGVuYXRlIGFsbCBwZXJtdXRhdGlvbnMgYW5kIHdlIGhhdmUgYWxsIHZhbGlkIHNjb3Jlcy4gXHJcbiAgICByZXR1cm4gXy5yYW5nZSgwLCBjb21iaW5hdGlvbkxlbmd0aCArIDEpXHJcbiAgICAgICAgLm1hcChzdW0gPT4gZ2V0U2NvcmVzRm9yU3VtKHN1bSkpXHJcbiAgICAgICAgLnJlZHVjZSgocCwgYykgPT4gcC5jb25jYXQoYyksIFtdKTtcclxufVxyXG5cclxuLyoqIFBlcm11dGF0ZXMgYSBsaXN0IG9mIGFsbCBwb3NzaWJsZSBzY29yZXMgdGhhdCBoYXZlIHRoZSBnaXZlbiBzdW0uICovXHJcbmZ1bmN0aW9uIGdldFNjb3Jlc0ZvclN1bShzdW06IG51bWJlcikge1xyXG4gICAgcmV0dXJuIF8ucmFuZ2UoMCwgc3VtICsgMSlcclxuICAgICAgICAubWFwKHdoaXRlID0+IHsgcmV0dXJuIHsgd2hpdGUsIGJsYWNrOiBzdW0gLSB3aGl0ZSB9IH0pO1xyXG59XHJcblxyXG4vKiogXHJcbiAqIEdldHMgYSByYW5kb20gY29uZmlndXJhdGlvbiBmcm9tIHRoZSBzZXQgb2YgYWxsIHBvc3NpYmxlIGNvbWJpbmF0aW9ucy4gXHJcbiAqIFRoZXJlJ3Mgd2F5IGZhc3RlciB3YXlzIHRvIGRvIHRoaXMsIGJ1dCBpdCdzIG9ubHkgZm9yIHRlc3Rpbmcgc28gSSBvcHRlZCBmb3IgZWFzaWVzdC5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRSYW5kb21Db25maWcoKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IHNldCA9IGdldEFsbENvbWJpbmF0aW9ucygpO1xyXG4gICAgcmV0dXJuIHNldFtfLnJhbmRvbSgwLCBzZXQubGVuZ3RoIC0gMSwgZmFsc2UpXTtcclxufVxyXG4iXX0=