"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("lodash");
var colors = ['B', 'G', 'O', 'R', 'Y', 'P'];
var combinationLength = 4;
var combinationIndices = _.range(combinationLength);
var allCodes = initializeSet();
var allScores = getAllPossibleScores();
/** Perform the main loop of the solver. */
function loop(delegates, guess, possibilities, usedCodes) {
    if (guess === void 0) { guess = 'BGOO'; }
    if (possibilities === void 0) { possibilities = initializeSet(); }
    if (usedCodes === void 0) { usedCodes = new Set(); }
    return __awaiter(this, void 0, void 0, function () {
        var score, remaining, nextGuess;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // Give the user our guess. 
                    usedCodes.add(guess);
                    return [4 /*yield*/, delegates.guess(guess)];
                case 1:
                    score = _a.sent();
                    // We got it!
                    if (score.black == combinationLength) {
                        delegates.solved({ answer: guess, attempts: usedCodes.size });
                        return [2 /*return*/];
                    }
                    // Just in case. This should never happen if the algorithm is working properly.
                    if (possibilities.length <= 1) {
                        delegates.error("Something's gone horribly wrong. Sorry, I don't have an answer.");
                        return [2 /*return*/];
                    }
                    remaining = parePossibilities(possibilities, guess, score);
                    nextGuess = findNextGuess(remaining, usedCodes);
                    loop(delegates, nextGuess, remaining, usedCodes);
                    return [2 /*return*/];
            }
        });
    });
}
exports.loop = loop;
/** Find the next value to present */
function findNextGuess(remaining, usedCodes) {
    // bail out if there's only one option left. That means we know the answer.
    if (remaining.length == 1)
        return remaining[0];
    // optimization tweak. If there's 2 left, pick one. 50/50 chance we're right and we can skip that last step.
    if (remaining.length == 2)
        return remaining[_.random(0, 1)];
    // We're not actually making a guess. In all likelihood the guess we're going to pick here
    // has already been eliminated. What we're doing is trying to find an answer that has the 
    // potential to eliminate the maximum number of remaining values, so that the size of the pool
    // shrinks by an order of magnitude. We're basically trying to find more information out, rather
    // than make an honest guess. 
    var min = Number.MAX_VALUE;
    var minCombination = "";
    // Turned this iterative to speed it up.
    // Functional looked nicer, but it's a hot O(n^3) loop. Everything counts. 
    for (var p = 0; p < allCodes.length; p++) {
        var possibility = allCodes[p];
        if (usedCodes.has(possibility))
            continue;
        var max = 0;
        for (var s = 0; s < allScores.length; s++) {
            var score = allScores[s];
            var count = 0;
            for (var g = 0; g < remaining.length; g++) {
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
function scoreEquals(left, right) {
    return left.white == right.white && left.black == right.black;
}
exports.scoreEquals = scoreEquals;
/** Removes all possibilities from the remaining list that don't match the score we were given. */
function parePossibilities(possibilities, guess, score) {
    return possibilities.filter(function (p) { return isValidScore(p, guess, score); });
}
/** Determines, for the given two combinations, whether the score matches. */
function isValidScore(possibility, guess, score) {
    var c = calculateScore(possibility, guess);
    return scoreEquals(c, score);
}
/** Calculates a score given two combinations. */
var memoizedScores = new Map();
function calculateScore(guess, possibility) {
    var memo = memoizedScores.get(guess + possibility);
    if (memo)
        return memo;
    var nonMatchingIndices = combinationIndices.filter(function (i) { return guess[i] != possibility[i]; });
    var g = nonMatchingIndices.map(function (i) { return guess[i]; });
    var p = nonMatchingIndices.map(function (i) { return possibility[i]; });
    var white = 0;
    g.forEach(function (v) {
        var i = p.indexOf(v);
        if (i != -1) {
            white++;
            p.splice(i, 1);
        }
    });
    // black is the number of items that matched; ie len(guess) - len(nonmatching)
    var score = { white: white, black: guess.length - nonMatchingIndices.length };
    // Memoize the calculations to speed things up, and set the reverse too, because they're reversible.
    memoizedScores.set(guess + possibility, score);
    memoizedScores.set(possibility + guess, score);
    return score;
}
exports.calculateScore = calculateScore;
/** Parses a score in text format into a structure we can use. Doesn't do error-handling. */
function parseScore(score) {
    var w = /(\d)W/g.exec(score);
    var b = /(\d)B/g.exec(score);
    return {
        white: w ? parseInt(w[1]) : 0,
        black: b ? parseInt(b[1]) : 0
    };
}
exports.parseScore = parseScore;
/** Prints a score in AR challenge format. */
function printScore(score) {
    var str = "";
    if (score.white)
        str += score.white + "W";
    if (score.black)
        str += score.black + "B";
    return str;
}
exports.printScore = printScore;
/** Computes a set of all possible combinations */
function initializeSet() {
    return permutateString(_.range(0, colors.length), "", combinationLength);
}
/** Recursive function that permutates a set of numbers for a set depth. */
function permutateString(numbers, current, depth) {
    if (depth == 0) {
        return [current];
    }
    return numbers.map(function (i) { return permutateString(numbers, current + colors[i], depth - 1); })
        .reduce(function (p, c) { return p.concat(c); }, []);
}
/** Permutates a list of all possible scores that can exist. */
function getAllPossibleScores() {
    return _.range(0, combinationLength + 1)
        .map(function (sum) { return getScoresForSum(sum); })
        .reduce(function (p, c) { return p.concat(c); }, []);
}
/** Permutates a list of all possible scores that have the given sum. */
function getScoresForSum(sum) {
    return _.range(0, sum + 1)
        .map(function (white) { return { white: white, black: sum - white }; });
}
/**
 * Gets a random configuration from the set of all possible combinations.
 * There's way faster ways to do this, but it's only for testing so I opted for easiest.
 */
function getRandomConfig() {
    var set = initializeSet();
    return set[_.random(0, set.length - 1, false)];
}
exports.getRandomConfig = getRandomConfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGliLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2xpYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMEJBQTRCO0FBWTVCLElBQU0sTUFBTSxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUM5QyxJQUFNLGlCQUFpQixHQUFHLENBQUMsQ0FBQztBQUM1QixJQUFNLGtCQUFrQixHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUN0RCxJQUFNLFFBQVEsR0FBRyxhQUFhLEVBQUUsQ0FBQztBQUNqQyxJQUFNLFNBQVMsR0FBRyxvQkFBb0IsRUFBRSxDQUFDO0FBRXpDLDJDQUEyQztBQUMzQyxjQUEyQixTQUFvQixFQUFFLEtBQWMsRUFBRSxhQUErQixFQUFFLFNBQTZCO0lBQTlFLHNCQUFBLEVBQUEsY0FBYztJQUFFLDhCQUFBLEVBQUEsZ0JBQWdCLGFBQWEsRUFBRTtJQUFFLDBCQUFBLEVBQUEsZ0JBQWdCLEdBQUcsRUFBVTs7Ozs7O29CQUUzSCw0QkFBNEI7b0JBQzVCLFNBQVMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBQ1AscUJBQU0sU0FBUyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBQTs7b0JBQXBDLEtBQUssR0FBRyxTQUE0QjtvQkFFMUMsYUFBYTtvQkFDYixFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxJQUFJLGlCQUFpQixDQUFDLENBQUMsQ0FBQzt3QkFDbkMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFBO3dCQUM3RCxNQUFNLGdCQUFDO29CQUNYLENBQUM7b0JBRUQsK0VBQStFO29CQUMv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QUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsaUJBQWlCLEdBQUcsQ0FBQyxDQUFDO1NBQ25DLEdBQUcsQ0FBQyxVQUFBLEdBQUcsSUFBSSxPQUFBLGVBQWUsQ0FBQyxHQUFHLENBQUMsRUFBcEIsQ0FBb0IsQ0FBQztTQUNoQyxNQUFNLENBQUMsVUFBQyxDQUFDLEVBQUUsQ0FBQyxJQUFLLE9BQUEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBWCxDQUFXLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDM0MsQ0FBQztBQUVELHdFQUF3RTtBQUN4RSx5QkFBeUIsR0FBVztJQUNoQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQztTQUNyQixHQUFHLENBQUMsVUFBQSxLQUFLLElBQU0sTUFBTSxDQUFDLEVBQUUsS0FBSyxPQUFBLEVBQUUsS0FBSyxFQUFFLEdBQUcsR0FBRyxLQUFLLEVBQUUsQ0FBQSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hFLENBQUM7QUFFRDs7O0dBR0c7QUFDSDtJQUNJLElBQU0sR0FBRyxHQUFHLGFBQWEsRUFBRSxDQUFDO0lBQzVCLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUNuRCxDQUFDO0FBSEQsMENBR0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XHJcblxyXG5leHBvcnQgdHlwZSBTY29yZSA9IHsgd2hpdGU6IG51bWJlciwgYmxhY2s6IG51bWJlciB9O1xyXG5leHBvcnQgdHlwZSBHdWVzc2VyID0gKGd1ZXNzOiBzdHJpbmcpID0+IFByb21pc2U8U2NvcmU+O1xyXG5leHBvcnQgdHlwZSBBbnN3ZXIgPSB7IGFuc3dlcjogc3RyaW5nLCBhdHRlbXB0czogbnVtYmVyIH07XHJcbmV4cG9ydCB0eXBlIERlbGVnYXRlcyA9IHtcclxuICAgIGd1ZXNzOiBHdWVzc2VyLFxyXG4gICAgZXJyb3I6IChlcnJvcjogYW55KSA9PiB2b2lkLFxyXG4gICAgc29sdmVkOiAoYW5zd2VyOiBBbnN3ZXIpID0+IHZvaWQ7XHJcbn1cclxuXHJcblxyXG5jb25zdCBjb2xvcnMgPSBbJ0InLCAnRycsICdPJywgJ1InLCAnWScsICdQJ107XHJcbmNvbnN0IGNvbWJpbmF0aW9uTGVuZ3RoID0gNDtcclxuY29uc3QgY29tYmluYXRpb25JbmRpY2VzID0gXy5yYW5nZShjb21iaW5hdGlvbkxlbmd0aCk7XHJcbmNvbnN0IGFsbENvZGVzID0gaW5pdGlhbGl6ZVNldCgpO1xyXG5jb25zdCBhbGxTY29yZXMgPSBnZXRBbGxQb3NzaWJsZVNjb3JlcygpO1xyXG5cclxuLyoqIFBlcmZvcm0gdGhlIG1haW4gbG9vcCBvZiB0aGUgc29sdmVyLiAqL1xyXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9vcChkZWxlZ2F0ZXM6IERlbGVnYXRlcywgZ3Vlc3MgPSAnQkdPTycsIHBvc3NpYmlsaXRpZXMgPSBpbml0aWFsaXplU2V0KCksIHVzZWRDb2RlcyA9IG5ldyBTZXQ8c3RyaW5nPigpKSB7XHJcblxyXG4gICAgLy8gR2l2ZSB0aGUgdXNlciBvdXIgZ3Vlc3MuIFxyXG4gICAgdXNlZENvZGVzLmFkZChndWVzcyk7XHJcbiAgICBjb25zdCBzY29yZSA9IGF3YWl0IGRlbGVnYXRlcy5ndWVzcyhndWVzcyk7XHJcblxyXG4gICAgLy8gV2UgZ290IGl0IVxyXG4gICAgaWYgKHNjb3JlLmJsYWNrID09IGNvbWJpbmF0aW9uTGVuZ3RoKSB7XHJcbiAgICAgICAgZGVsZWdhdGVzLnNvbHZlZCh7IGFuc3dlcjogZ3Vlc3MsIGF0dGVtcHRzOiB1c2VkQ29kZXMuc2l6ZSB9KVxyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBKdXN0IGluIGNhc2UuIFRoaXMgc2hvdWxkIG5ldmVyIGhhcHBlbiBpZiB0aGUgYWxnb3JpdGhtIGlzIHdvcmtpbmcgcHJvcGVybHkuXHJcbiAgICBpZiAocG9zc2liaWxpdGllcy5sZW5ndGggPD0gMSkge1xyXG4gICAgICAgIGRlbGVnYXRlcy5lcnJvcihcIlNvbWV0aGluZydzIGdvbmUgaG9ycmlibHkgd3JvbmcuIFNvcnJ5LCBJIGRvbid0IGhhdmUgYW4gYW5zd2VyLlwiKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgLy8gUGFyZSBkb3duIHRoZSByZW1haW5pbmcgcG9zc2liaWxpdGllcyBiYXNlZCBvbiB3aGF0IHdlJ3ZlIGxlYXJuZWQgZnJvbSB0aGUgc2NvcmUuIFxyXG4gICAgY29uc3QgcmVtYWluaW5nID0gcGFyZVBvc3NpYmlsaXRpZXMocG9zc2liaWxpdGllcywgZ3Vlc3MsIHNjb3JlKTtcclxuXHJcbiAgICAvLyBDb21lIHVwIHdpdGggYW5vdGhlciBndWVzcyBhbmQgcmVjdXJzZS4gXHJcbiAgICBjb25zdCBuZXh0R3Vlc3MgPSBmaW5kTmV4dEd1ZXNzKHJlbWFpbmluZywgdXNlZENvZGVzKTtcclxuICAgIGxvb3AoZGVsZWdhdGVzLCBuZXh0R3Vlc3MsIHJlbWFpbmluZywgdXNlZENvZGVzKTtcclxufVxyXG5cclxuLyoqIEZpbmQgdGhlIG5leHQgdmFsdWUgdG8gcHJlc2VudCAqL1xyXG5mdW5jdGlvbiBmaW5kTmV4dEd1ZXNzKHJlbWFpbmluZzogc3RyaW5nW10sIHVzZWRDb2RlczogU2V0PHN0cmluZz4pIHtcclxuXHJcbiAgICAvLyBiYWlsIG91dCBpZiB0aGVyZSdzIG9ubHkgb25lIG9wdGlvbiBsZWZ0LiBUaGF0IG1lYW5zIHdlIGtub3cgdGhlIGFuc3dlci5cclxuICAgIGlmIChyZW1haW5pbmcubGVuZ3RoID09IDEpXHJcbiAgICAgICAgcmV0dXJuIHJlbWFpbmluZ1swXTtcclxuXHJcbiAgICAvLyBvcHRpbWl6YXRpb24gdHdlYWsuIElmIHRoZXJlJ3MgMiBsZWZ0LCBwaWNrIG9uZS4gNTAvNTAgY2hhbmNlIHdlJ3JlIHJpZ2h0IGFuZCB3ZSBjYW4gc2tpcCB0aGF0IGxhc3Qgc3RlcC5cclxuICAgIGlmKHJlbWFpbmluZy5sZW5ndGggPT0gMilcclxuICAgICAgICByZXR1cm4gcmVtYWluaW5nW18ucmFuZG9tKDAsMSldO1xyXG5cclxuICAgIC8vIFdlJ3JlIG5vdCBhY3R1YWxseSBtYWtpbmcgYSBndWVzcy4gSW4gYWxsIGxpa2VsaWhvb2QgdGhlIGd1ZXNzIHdlJ3JlIGdvaW5nIHRvIHBpY2sgaGVyZVxyXG4gICAgLy8gaGFzIGFscmVhZHkgYmVlbiBlbGltaW5hdGVkLiBXaGF0IHdlJ3JlIGRvaW5nIGlzIHRyeWluZyB0byBmaW5kIGFuIGFuc3dlciB0aGF0IGhhcyB0aGUgXHJcbiAgICAvLyBwb3RlbnRpYWwgdG8gZWxpbWluYXRlIHRoZSBtYXhpbXVtIG51bWJlciBvZiByZW1haW5pbmcgdmFsdWVzLCBzbyB0aGF0IHRoZSBzaXplIG9mIHRoZSBwb29sXHJcbiAgICAvLyBzaHJpbmtzIGJ5IGFuIG9yZGVyIG9mIG1hZ25pdHVkZS4gV2UncmUgYmFzaWNhbGx5IHRyeWluZyB0byBmaW5kIG1vcmUgaW5mb3JtYXRpb24gb3V0LCByYXRoZXJcclxuICAgIC8vIHRoYW4gbWFrZSBhbiBob25lc3QgZ3Vlc3MuIFxyXG4gICAgbGV0IG1pbiA9IE51bWJlci5NQVhfVkFMVUU7XHJcbiAgICBsZXQgbWluQ29tYmluYXRpb246IHN0cmluZyA9IFwiXCI7XHJcblxyXG4gICAgLy8gVHVybmVkIHRoaXMgaXRlcmF0aXZlIHRvIHNwZWVkIGl0IHVwLlxyXG4gICAgLy8gRnVuY3Rpb25hbCBsb29rZWQgbmljZXIsIGJ1dCBpdCdzIGEgaG90IE8obl4zKSBsb29wLiBFdmVyeXRoaW5nIGNvdW50cy4gXHJcbiAgICBmb3IgKGxldCBwID0gMDsgcCA8IGFsbENvZGVzLmxlbmd0aDsgcCsrKSB7XHJcbiAgICAgICAgY29uc3QgcG9zc2liaWxpdHkgPSBhbGxDb2Rlc1twXTtcclxuICAgICAgICBpZiAodXNlZENvZGVzLmhhcyhwb3NzaWJpbGl0eSkpXHJcbiAgICAgICAgICAgIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICBsZXQgbWF4ID0gMDtcclxuICAgICAgICBmb3IgKGxldCBzID0gMDsgcyA8IGFsbFNjb3Jlcy5sZW5ndGg7IHMrKykge1xyXG4gICAgICAgICAgICBjb25zdCBzY29yZSA9IGFsbFNjb3Jlc1tzXTtcclxuICAgICAgICAgICAgbGV0IGNvdW50ID0gMDtcclxuICAgICAgICAgICAgZm9yIChsZXQgZyA9IDA7IGcgPCByZW1haW5pbmcubGVuZ3RoOyBnKyspIHtcclxuICAgICAgICAgICAgICAgIGlmIChzY29yZUVxdWFscyhjYWxjdWxhdGVTY29yZShyZW1haW5pbmdbZ10sIHBvc3NpYmlsaXR5KSwgc2NvcmUpKVxyXG4gICAgICAgICAgICAgICAgICAgIGNvdW50Kys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbWF4ID0gTWF0aC5tYXgoY291bnQsIG1heCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChtYXggPCBtaW4pIHtcclxuICAgICAgICAgICAgbWluID0gbWF4O1xyXG4gICAgICAgICAgICBtaW5Db21iaW5hdGlvbiA9IHBvc3NpYmlsaXR5O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBtaW5Db21iaW5hdGlvbjtcclxufVxyXG5cclxuLyoqIERldGVybWluZSBpZiB0aGUgc2NvcmVzIGFyZSBlcXVpdmFsZW50ICovXHJcbmV4cG9ydCBmdW5jdGlvbiBzY29yZUVxdWFscyhsZWZ0OiBTY29yZSwgcmlnaHQ6IFNjb3JlKSB7XHJcbiAgICByZXR1cm4gbGVmdC53aGl0ZSA9PSByaWdodC53aGl0ZSAmJiBsZWZ0LmJsYWNrID09IHJpZ2h0LmJsYWNrO1xyXG59XHJcblxyXG4vKiogUmVtb3ZlcyBhbGwgcG9zc2liaWxpdGllcyBmcm9tIHRoZSByZW1haW5pbmcgbGlzdCB0aGF0IGRvbid0IG1hdGNoIHRoZSBzY29yZSB3ZSB3ZXJlIGdpdmVuLiAqL1xyXG5mdW5jdGlvbiBwYXJlUG9zc2liaWxpdGllcyhwb3NzaWJpbGl0aWVzOiBzdHJpbmdbXSwgZ3Vlc3M6IHN0cmluZywgc2NvcmU6IFNjb3JlKSB7XHJcbiAgICByZXR1cm4gcG9zc2liaWxpdGllcy5maWx0ZXIocCA9PiBpc1ZhbGlkU2NvcmUocCwgZ3Vlc3MsIHNjb3JlKSk7XHJcbn1cclxuXHJcbi8qKiBEZXRlcm1pbmVzLCBmb3IgdGhlIGdpdmVuIHR3byBjb21iaW5hdGlvbnMsIHdoZXRoZXIgdGhlIHNjb3JlIG1hdGNoZXMuICovXHJcbmZ1bmN0aW9uIGlzVmFsaWRTY29yZShwb3NzaWJpbGl0eTogc3RyaW5nLCBndWVzczogc3RyaW5nLCBzY29yZTogU2NvcmUpIHtcclxuICAgIGNvbnN0IGMgPSBjYWxjdWxhdGVTY29yZShwb3NzaWJpbGl0eSwgZ3Vlc3MpO1xyXG4gICAgcmV0dXJuIHNjb3JlRXF1YWxzKGMsIHNjb3JlKTtcclxufVxyXG5cclxuLyoqIENhbGN1bGF0ZXMgYSBzY29yZSBnaXZlbiB0d28gY29tYmluYXRpb25zLiAqL1xyXG5jb25zdCBtZW1vaXplZFNjb3JlcyA9IG5ldyBNYXA8c3RyaW5nLCBTY29yZT4oKTtcclxuZXhwb3J0IGZ1bmN0aW9uIGNhbGN1bGF0ZVNjb3JlKGd1ZXNzOiBzdHJpbmcsIHBvc3NpYmlsaXR5OiBzdHJpbmcpIHtcclxuICAgIGNvbnN0IG1lbW8gPSBtZW1vaXplZFNjb3Jlcy5nZXQoZ3Vlc3MgKyBwb3NzaWJpbGl0eSk7XHJcbiAgICBpZiAobWVtbylcclxuICAgICAgICByZXR1cm4gbWVtbztcclxuXHJcbiAgICBjb25zdCBub25NYXRjaGluZ0luZGljZXMgPSBjb21iaW5hdGlvbkluZGljZXMuZmlsdGVyKGkgPT4gZ3Vlc3NbaV0gIT0gcG9zc2liaWxpdHlbaV0pO1xyXG4gICAgY29uc3QgZyA9IG5vbk1hdGNoaW5nSW5kaWNlcy5tYXAoaSA9PiBndWVzc1tpXSk7XHJcbiAgICBjb25zdCBwID0gbm9uTWF0Y2hpbmdJbmRpY2VzLm1hcChpID0+IHBvc3NpYmlsaXR5W2ldKTtcclxuICAgIGxldCB3aGl0ZSA9IDA7XHJcbiAgICBnLmZvckVhY2godiA9PiB7XHJcbiAgICAgICAgY29uc3QgaSA9IHAuaW5kZXhPZih2KTtcclxuICAgICAgICBpZiAoaSAhPSAtMSkge1xyXG4gICAgICAgICAgICB3aGl0ZSsrO1xyXG4gICAgICAgICAgICBwLnNwbGljZShpLCAxKTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBibGFjayBpcyB0aGUgbnVtYmVyIG9mIGl0ZW1zIHRoYXQgbWF0Y2hlZDsgaWUgbGVuKGd1ZXNzKSAtIGxlbihub25tYXRjaGluZylcclxuICAgIGNvbnN0IHNjb3JlID0geyB3aGl0ZSwgYmxhY2s6IGd1ZXNzLmxlbmd0aCAtIG5vbk1hdGNoaW5nSW5kaWNlcy5sZW5ndGggfTtcclxuXHJcbiAgICAvLyBNZW1vaXplIHRoZSBjYWxjdWxhdGlvbnMgdG8gc3BlZWQgdGhpbmdzIHVwLCBhbmQgc2V0IHRoZSByZXZlcnNlIHRvbywgYmVjYXVzZSB0aGV5J3JlIHJldmVyc2libGUuXHJcbiAgICBtZW1vaXplZFNjb3Jlcy5zZXQoZ3Vlc3MgKyBwb3NzaWJpbGl0eSwgc2NvcmUpO1xyXG4gICAgbWVtb2l6ZWRTY29yZXMuc2V0KHBvc3NpYmlsaXR5ICsgZ3Vlc3MsIHNjb3JlKTtcclxuICAgIHJldHVybiBzY29yZTtcclxufVxyXG5cclxuLyoqIFBhcnNlcyBhIHNjb3JlIGluIHRleHQgZm9ybWF0IGludG8gYSBzdHJ1Y3R1cmUgd2UgY2FuIHVzZS4gRG9lc24ndCBkbyBlcnJvci1oYW5kbGluZy4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlU2NvcmUoc2NvcmU6IHN0cmluZyk6IFNjb3JlIHtcclxuICAgIGNvbnN0IHcgPSAvKFxcZClXL2cuZXhlYyhzY29yZSk7XHJcbiAgICBjb25zdCBiID0gLyhcXGQpQi9nLmV4ZWMoc2NvcmUpO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgd2hpdGU6IHcgPyBwYXJzZUludCh3WzFdKSA6IDAsXHJcbiAgICAgICAgYmxhY2s6IGIgPyBwYXJzZUludChiWzFdKSA6IDBcclxuICAgIH1cclxufVxyXG5cclxuLyoqIFByaW50cyBhIHNjb3JlIGluIEFSIGNoYWxsZW5nZSBmb3JtYXQuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBwcmludFNjb3JlKHNjb3JlOiBTY29yZSkge1xyXG4gICAgbGV0IHN0ciA9IFwiXCI7XHJcbiAgICBpZiAoc2NvcmUud2hpdGUpIHN0ciArPSBzY29yZS53aGl0ZSArIFwiV1wiO1xyXG4gICAgaWYgKHNjb3JlLmJsYWNrKSBzdHIgKz0gc2NvcmUuYmxhY2sgKyBcIkJcIjtcclxuICAgIHJldHVybiBzdHI7XHJcbn1cclxuXHJcbi8qKiBDb21wdXRlcyBhIHNldCBvZiBhbGwgcG9zc2libGUgY29tYmluYXRpb25zICovXHJcbmZ1bmN0aW9uIGluaXRpYWxpemVTZXQoKSB7XHJcbiAgICByZXR1cm4gcGVybXV0YXRlU3RyaW5nKF8ucmFuZ2UoMCwgY29sb3JzLmxlbmd0aCksIFwiXCIsIGNvbWJpbmF0aW9uTGVuZ3RoKTtcclxufVxyXG5cclxuLyoqIFJlY3Vyc2l2ZSBmdW5jdGlvbiB0aGF0IHBlcm11dGF0ZXMgYSBzZXQgb2YgbnVtYmVycyBmb3IgYSBzZXQgZGVwdGguICovXHJcbmZ1bmN0aW9uIHBlcm11dGF0ZVN0cmluZyhudW1iZXJzOiBudW1iZXJbXSwgY3VycmVudDogc3RyaW5nLCBkZXB0aDogbnVtYmVyKTogc3RyaW5nW10ge1xyXG4gICAgaWYgKGRlcHRoID09IDApIHtcclxuICAgICAgICByZXR1cm4gW2N1cnJlbnRdXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG51bWJlcnMubWFwKGkgPT4gcGVybXV0YXRlU3RyaW5nKG51bWJlcnMsIGN1cnJlbnQgKyBjb2xvcnNbaV0sIGRlcHRoIC0gMSkpXHJcbiAgICAgICAgLnJlZHVjZSgocCwgYykgPT4gcC5jb25jYXQoYyksIFtdKTtcclxufVxyXG5cclxuLyoqIFBlcm11dGF0ZXMgYSBsaXN0IG9mIGFsbCBwb3NzaWJsZSBzY29yZXMgdGhhdCBjYW4gZXhpc3QuICovXHJcbmZ1bmN0aW9uIGdldEFsbFBvc3NpYmxlU2NvcmVzKCkge1xyXG4gICAgcmV0dXJuIF8ucmFuZ2UoMCwgY29tYmluYXRpb25MZW5ndGggKyAxKVxyXG4gICAgICAgIC5tYXAoc3VtID0+IGdldFNjb3Jlc0ZvclN1bShzdW0pKVxyXG4gICAgICAgIC5yZWR1Y2UoKHAsIGMpID0+IHAuY29uY2F0KGMpLCBbXSk7XHJcbn1cclxuXHJcbi8qKiBQZXJtdXRhdGVzIGEgbGlzdCBvZiBhbGwgcG9zc2libGUgc2NvcmVzIHRoYXQgaGF2ZSB0aGUgZ2l2ZW4gc3VtLiAqL1xyXG5mdW5jdGlvbiBnZXRTY29yZXNGb3JTdW0oc3VtOiBudW1iZXIpIHtcclxuICAgIHJldHVybiBfLnJhbmdlKDAsIHN1bSArIDEpXHJcbiAgICAgICAgLm1hcCh3aGl0ZSA9PiB7IHJldHVybiB7IHdoaXRlLCBibGFjazogc3VtIC0gd2hpdGUgfSB9KTtcclxufVxyXG5cclxuLyoqIFxyXG4gKiBHZXRzIGEgcmFuZG9tIGNvbmZpZ3VyYXRpb24gZnJvbSB0aGUgc2V0IG9mIGFsbCBwb3NzaWJsZSBjb21iaW5hdGlvbnMuIFxyXG4gKiBUaGVyZSdzIHdheSBmYXN0ZXIgd2F5cyB0byBkbyB0aGlzLCBidXQgaXQncyBvbmx5IGZvciB0ZXN0aW5nIHNvIEkgb3B0ZWQgZm9yIGVhc2llc3QuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0UmFuZG9tQ29uZmlnKCk6IHN0cmluZyB7XHJcbiAgICBjb25zdCBzZXQgPSBpbml0aWFsaXplU2V0KCk7XHJcbiAgICByZXR1cm4gc2V0W18ucmFuZG9tKDAsIHNldC5sZW5ndGggLSAxLCBmYWxzZSldO1xyXG59Il19