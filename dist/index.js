"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const readline = require("readline");
const solver = require("./lib");
/**
 * The demo has two modes of operation. In the normal mode, we print out a guess, and then
 * enter a loop wherein we wait for a "Score" from the user, and then make the next guess.
 * This loop continues until the correct answer is found.
 *
 * The second mode was my testing mode, which I used to test the length of my average solution,
 * so I could tweak the algorithm and lower the average. This testing mode creates all possible
 * lock configurations and then runs the game loop. Instead of consulting the command line
 * for user input, it utilizes the programs 'calculateScore' method to calculate the xWyS
 * "score" for a given guess. That algorithm was needed internally to narrow down the number
 * of valid choices left in the possibilities set, and the details on the overall strategy
 * may be found in the README.md file of this project. Once it sends the score back to the
 * solver, it repeats the loop until the solver announces that it has found a solution. This
 * mode checks the solution to see if it was accurate, and then either continues or terminates
 * the application based on the response. An invalid answer means the program is broken and
 * should no longer continue running, so that I can fix it. I'm happy to say I still haven't
 * found a broken answer. This mode also tracks the number of attempts per answer.
 *
 * As of right now, this version of the program averages around 4.083 guesses to find a
 * solution on the entire possible input set. The maximal number of guesses is 6, and the minimum,
 * obviously, is 1, with the median and mode, being 4.
 *
 * Average solve length: 4.083333333333333
 * Frequencies: {"1":1,"2":10,"3":61,"4":176,"5":110,"6":2}
 *
 * In order to do this dual mode of operation, I abstracted the input and output of the program
 * into a structure I called a "delegate". This structure contains 3 functions:
 *
 *  - error: A function to be called when the solver has run into an unrecoverable error.
 *           All operations cease when this happens.
 *  - solved: A function to be called when the solver thinks it has found the corrent answer.
 *            This method is given the answer and the number of attempts it took to achieve
 *            that answer.
 *  - guess: A function to be called whenever the solver issues a new guess. This function
 *           is to return a Promise of "Score". Meaning that the solver is going to sleep,
 *           and will awaken when you resolve the promise with a score object, representing
 *           how many white/black points you are awarding the solver.
 *
 * By abstracting the interaction with the solver this way, we can create two different kinds
 * of delegates. The testing delegate is a structure that immediately calculates a new Score
 * when it recieves a guess, and sends it back to the solver. The console delegate, on the
 * other hand, uses the Node 'readline' library to read a line of input from the command line,
 * asynchronously, and then parses and transmits that score to the solver whenever the callback
 * returns with the user's input. This allows the solver code to operate completely independently
 * from the input mechanism.
 *
 * I could have designed it as a pure function, and thought about it a lot. I decided against it
 * because the function would require the consumer of the library to maintain a whole lot of state
 * information on their own for each new score input. Using this "delegate" method, the state is
 * maintained entirely within closures of the "loop" function, and consumers of the library won't
 * have to deal with large sets of pared-down possibilities and used guesses, and so forth.
 *
 * One caveat, of course, is that the solver can fail to come to a solution if an incorrect score
 * is entered by the user. There is no way to solve this. As they say, Garbage-in, Garbage-out.
 * So please do be mindful of your inputs.
 */
/** Base methods for all methods of communicating information to the user. */
const baseDelegates = {
    error: (error) => {
        console.log(error);
    },
    solved: (answer) => {
        console.log(`The answer is: ${answer.answer}, and I found it in ${answer.attempts} tries.`);
    }
};
const testDelegates = (testAnswer, done) => {
    return Object.assign({}, baseDelegates, { guess: (guess) => {
            // in lieu of user input, just calculate the score on our own using our predetermined test answer,
            // and let the solver know. 
            console.log(guess);
            const score = solver.calculateScore(testAnswer, guess);
            console.log("response> " + solver.printScore(score));
            return Promise.resolve(score);
        }, solved: (answer) => {
            baseDelegates.solved(answer);
            // verify answer before continuing. 
            if (answer.answer == testAnswer) {
                console.log("Answer is CORRECT.");
                done(answer.attempts);
            }
            else {
                throw new Error("Invalid answer. The answer was: " + testAnswer);
            }
        } });
};
const consoleDelegates = rl => {
    return Object.assign({}, baseDelegates, { guess: (guess) => {
            return new Promise((resolve, _reject) => {
                console.log(guess);
                rl.question("response> ", input => {
                    const score = solver.parseScore(input);
                    resolve(score);
                });
            });
        }, solved: (answer) => {
            baseDelegates.solved(answer);
            rl.close();
        }, error: (error) => {
            baseDelegates.error(error);
            rl.close();
        } });
};
function nextAttempt(left, moves = 0, total = left.length, frequencies = {}) {
    // base case, no iterations left. Show average solve length and exunt, stage left.
    if (left.length == 0) {
        console.log("Average solve length: " + moves / total);
        console.log("Frequencies: " + JSON.stringify(frequencies));
        return;
    }
    // show a running average of the solution length. For my own amusement as I watch the iterations tick. 
    const turn = total - left.length;
    if (turn != 0) {
        console.log(`Attempt #${turn + 1}, current average moves: ${moves / turn}, frequencies: ${JSON.stringify(frequencies)}`);
    }
    // gather the next random config and attempt to solve it. 
    const config = left.shift();
    const delegates = testDelegates(config, (attempts) => {
        // when the loop is done, this will be called with the number of attempts made.
        // Loop again, subtracting one from the number of iterations left.
        frequencies[attempts] = (frequencies[attempts] || 0) + 1;
        nextAttempt(left, moves + attempts, total, frequencies);
    });
    solver.loop(delegates);
}
if (process.argv.indexOf("auto") != -1) {
    // Auto mode. Solve for all combinations. 
    nextAttempt(solver.getAllCombinations());
}
else {
    // Input mode. Use readline to gather feedback from the user instead of figuring it out on our own.
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    // only do one loop. If the user wants more, they can run it again. 
    solver.loop(consoleDelegates(rl));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxxQ0FBcUM7QUFDckMsZ0NBQWdDO0FBR2hDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBdURHO0FBR0gsNkVBQTZFO0FBQzdFLE1BQU0sYUFBYSxHQUFHO0lBQ2xCLEtBQUssRUFBRSxDQUFDLEtBQVUsRUFBRSxFQUFFO1FBQ2xCLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDdkIsQ0FBQztJQUNELE1BQU0sRUFBRSxDQUFDLE1BQXFCLEVBQUUsRUFBRTtRQUM5QixPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixNQUFNLENBQUMsTUFBTSx1QkFBdUIsTUFBTSxDQUFDLFFBQVEsU0FBUyxDQUFDLENBQUM7SUFDaEcsQ0FBQztDQUNKLENBQUE7QUFVRCxNQUFNLGFBQWEsR0FBa0IsQ0FBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLEVBQUU7SUFDdEQsTUFBTSxtQkFDQyxhQUFhLElBQ2hCLEtBQUssRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQ2Isa0dBQWtHO1lBQ2xHLDRCQUE0QjtZQUM1QixPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ25CLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3ZELE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNyRCxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNsQyxDQUFDLEVBQ0QsTUFBTSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDZixhQUFhLENBQUMsTUFBTSxDQUFDLE1BQU0s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LENBQUM7SUFDNUQsQ0FBQyxDQUFDLENBQUM7SUFDSCxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQzNCLENBQUM7QUFFRCxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDckMsMENBQTBDO0lBQzFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO0FBQzdDLENBQUM7QUFDRCxJQUFJLENBQUMsQ0FBQztJQUNGLG1HQUFtRztJQUNuRyxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsZUFBZSxDQUFDO1FBQ2hDLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSztRQUNwQixNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU07S0FDekIsQ0FBQyxDQUFDO0lBRUgsb0VBQW9FO0lBQ3BFLE1BQU0sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUN0QyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgcmVhZGxpbmUgZnJvbSAncmVhZGxpbmUnO1xyXG5pbXBvcnQgKiBhcyBzb2x2ZXIgZnJvbSAnLi9saWInO1xyXG5cclxuXHJcbi8qKlxyXG4gKiBUaGUgZGVtbyBoYXMgdHdvIG1vZGVzIG9mIG9wZXJhdGlvbi4gSW4gdGhlIG5vcm1hbCBtb2RlLCB3ZSBwcmludCBvdXQgYSBndWVzcywgYW5kIHRoZW4gXHJcbiAqIGVudGVyIGEgbG9vcCB3aGVyZWluIHdlIHdhaXQgZm9yIGEgXCJTY29yZVwiIGZyb20gdGhlIHVzZXIsIGFuZCB0aGVuIG1ha2UgdGhlIG5leHQgZ3Vlc3MuXHJcbiAqIFRoaXMgbG9vcCBjb250aW51ZXMgdW50aWwgdGhlIGNvcnJlY3QgYW5zd2VyIGlzIGZvdW5kLiBcclxuICogXHJcbiAqIFRoZSBzZWNvbmQgbW9kZSB3YXMgbXkgdGVzdGluZyBtb2RlLCB3aGljaCBJIHVzZWQgdG8gdGVzdCB0aGUgbGVuZ3RoIG9mIG15IGF2ZXJhZ2Ugc29sdXRpb24sXHJcbiAqIHNvIEkgY291bGQgdHdlYWsgdGhlIGFsZ29yaXRobSBhbmQgbG93ZXIgdGhlIGF2ZXJhZ2UuIFRoaXMgdGVzdGluZyBtb2RlIGNyZWF0ZXMgYWxsIHBvc3NpYmxlIFxyXG4gKiBsb2NrIGNvbmZpZ3VyYXRpb25zIGFuZCB0aGVuIHJ1bnMgdGhlIGdhbWUgbG9vcC4gSW5zdGVhZCBvZiBjb25zdWx0aW5nIHRoZSBjb21tYW5kIGxpbmVcclxuICogZm9yIHVzZXIgaW5wdXQsIGl0IHV0aWxpemVzIHRoZSBwcm9ncmFtcyAnY2FsY3VsYXRlU2NvcmUnIG1ldGhvZCB0byBjYWxjdWxhdGUgdGhlIHhXeVNcclxuICogXCJzY29yZVwiIGZvciBhIGdpdmVuIGd1ZXNzLiBUaGF0IGFsZ29yaXRobSB3YXMgbmVlZGVkIGludGVybmFsbHkgdG8gbmFycm93IGRvd24gdGhlIG51bWJlclxyXG4gKiBvZiB2YWxpZCBjaG9pY2VzIGxlZnQgaW4gdGhlIHBvc3NpYmlsaXRpZXMgc2V0LCBhbmQgdGhlIGRldGFpbHMgb24gdGhlIG92ZXJhbGwgc3RyYXRlZ3kgXHJcbiAqIG1heSBiZSBmb3VuZCBpbiB0aGUgUkVBRE1FLm1kIGZpbGUgb2YgdGhpcyBwcm9qZWN0LiBPbmNlIGl0IHNlbmRzIHRoZSBzY29yZSBiYWNrIHRvIHRoZSBcclxuICogc29sdmVyLCBpdCByZXBlYXRzIHRoZSBsb29wIHVudGlsIHRoZSBzb2x2ZXIgYW5ub3VuY2VzIHRoYXQgaXQgaGFzIGZvdW5kIGEgc29sdXRpb24uIFRoaXMgXHJcbiAqIG1vZGUgY2hlY2tzIHRoZSBzb2x1dGlvbiB0byBzZWUgaWYgaXQgd2FzIGFjY3VyYXRlLCBhbmQgdGhlbiBlaXRoZXIgY29udGludWVzIG9yIHRlcm1pbmF0ZXNcclxuICogdGhlIGFwcGxpY2F0aW9uIGJhc2VkIG9uIHRoZSByZXNwb25zZS4gQW4gaW52YWxpZCBhbnN3ZXIgbWVhbnMgdGhlIHByb2dyYW0gaXMgYnJva2VuIGFuZCBcclxuICogc2hvdWxkIG5vIGxvbmdlciBjb250aW51ZSBydW5uaW5nLCBzbyB0aGF0IEkgY2FuIGZpeCBpdC4gSSdtIGhhcHB5IHRvIHNheSBJIHN0aWxsIGhhdmVuJ3RcclxuICogZm91bmQgYSBicm9rZW4gYW5zd2VyLiBUaGlzIG1vZGUgYWxzbyB0cmFja3MgdGhlIG51bWJlciBvZiBhdHRlbXB0cyBwZXIgYW5zd2VyLiBcclxuICogXHJcbiAqIEFzIG9mIHJpZ2h0IG5vdywgdGhpcyB2ZXJzaW9uIG9mIHRoZSBwcm9ncmFtIGF2ZXJhZ2VzIGFyb3VuZCA0LjA4MyBndWVzc2VzIHRvIGZpbmQgYSBcclxuICogc29sdXRpb24gb24gdGhlIGVudGlyZSBwb3NzaWJsZSBpbnB1dCBzZXQuIFRoZSBtYXhpbWFsIG51bWJlciBvZiBndWVzc2VzIGlzIDYsIGFuZCB0aGUgbWluaW11bSwgXHJcbiAqIG9idmlvdXNseSwgaXMgMSwgd2l0aCB0aGUgbWVkaWFuIGFuZCBtb2RlLCBiZWluZyA0LiBcclxuICogXHJcbiAqIEF2ZXJhZ2Ugc29sdmUgbGVuZ3RoOiA0LjA4MzMzMzMzMzMzMzMzM1xyXG4gKiBGcmVxdWVuY2llczoge1wiMVwiOjEsXCIyXCI6MTAsXCIzXCI6NjEsXCI0XCI6MTc2LFwiNVwiOjExMCxcIjZcIjoyfVxyXG4gKiBcclxuICogSW4gb3JkZXIgdG8gZG8gdGhpcyBkdWFsIG1vZGUgb2Ygb3BlcmF0aW9uLCBJIGFic3RyYWN0ZWQgdGhlIGlucHV0IGFuZCBvdXRwdXQgb2YgdGhlIHByb2dyYW1cclxuICogaW50byBhIHN0cnVjdHVyZSBJIGNhbGxlZCBhIFwiZGVsZWdhdGVcIi4gVGhpcyBzdHJ1Y3R1cmUgY29udGFpbnMgMyBmdW5jdGlvbnM6XHJcbiAqIFxyXG4gKiAgLSBlcnJvcjogQSBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2hlbiB0aGUgc29sdmVyIGhhcyBydW4gaW50byBhbiB1bnJlY292ZXJhYmxlIGVycm9yLiBcclxuICogICAgICAgICAgIEFsbCBvcGVyYXRpb25zIGNlYXNlIHdoZW4gdGhpcyBoYXBwZW5zLiBcclxuICogIC0gc29sdmVkOiBBIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aGVuIHRoZSBzb2x2ZXIgdGhpbmtzIGl0IGhhcyBmb3VuZCB0aGUgY29ycmVudCBhbnN3ZXIuXHJcbiAqICAgICAgICAgICAgVGhpcyBtZXRob2QgaXMgZ2l2ZW4gdGhlIGFuc3dlciBhbmQgdGhlIG51bWJlciBvZiBhdHRlbXB0cyBpdCB0b29rIHRvIGFjaGlldmVcclxuICogICAgICAgICAgICB0aGF0IGFuc3dlci5cclxuICogIC0gZ3Vlc3M6IEEgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdoZW5ldmVyIHRoZSBzb2x2ZXIgaXNzdWVzIGEgbmV3IGd1ZXNzLiBUaGlzIGZ1bmN0aW9uXHJcbiAqICAgICAgICAgICBpcyB0byByZXR1cm4gYSBQcm9taXNlIG9mIFwiU2NvcmVcIi4gTWVhbmluZyB0aGF0IHRoZSBzb2x2ZXIgaXMgZ29pbmcgdG8gc2xlZXAsIFxyXG4gKiAgICAgICAgICAgYW5kIHdpbGwgYXdha2VuIHdoZW4geW91IHJlc29sdmUgdGhlIHByb21pc2Ugd2l0aCBhIHNjb3JlIG9iamVjdCwgcmVwcmVzZW50aW5nXHJcbiAqICAgICAgICAgICBob3cgbWFueSB3aGl0ZS9ibGFjayBwb2ludHMgeW91IGFyZSBhd2FyZGluZyB0aGUgc29sdmVyLiBcclxuICogXHJcbiAqIEJ5IGFic3RyYWN0aW5nIHRoZSBpbnRlcmFjdGlvbiB3aXRoIHRoZSBzb2x2ZXIgdGhpcyB3YXksIHdlIGNhbiBjcmVhdGUgdHdvIGRpZmZlcmVudCBraW5kc1xyXG4gKiBvZiBkZWxlZ2F0ZXMuIFRoZSB0ZXN0aW5nIGRlbGVnYXRlIGlzIGEgc3RydWN0dXJlIHRoYXQgaW1tZWRpYXRlbHkgY2FsY3VsYXRlcyBhIG5ldyBTY29yZVxyXG4gKiB3aGVuIGl0IHJlY2lldmVzIGEgZ3Vlc3MsIGFuZCBzZW5kcyBpdCBiYWNrIHRvIHRoZSBzb2x2ZXIuIFRoZSBjb25zb2xlIGRlbGVnYXRlLCBvbiB0aGVcclxuICogb3RoZXIgaGFuZCwgdXNlcyB0aGUgTm9kZSAncmVhZGxpbmUnIGxpYnJhcnkgdG8gcmVhZCBhIGxpbmUgb2YgaW5wdXQgZnJvbSB0aGUgY29tbWFuZCBsaW5lLFxyXG4gKiBhc3luY2hyb25vdXNseSwgYW5kIHRoZW4gcGFyc2VzIGFuZCB0cmFuc21pdHMgdGhhdCBzY29yZSB0byB0aGUgc29sdmVyIHdoZW5ldmVyIHRoZSBjYWxsYmFja1xyXG4gKiByZXR1cm5zIHdpdGggdGhlIHVzZXIncyBpbnB1dC4gVGhpcyBhbGxvd3MgdGhlIHNvbHZlciBjb2RlIHRvIG9wZXJhdGUgY29tcGxldGVseSBpbmRlcGVuZGVudGx5XHJcbiAqIGZyb20gdGhlIGlucHV0IG1lY2hhbmlzbS4gXHJcbiAqIFxyXG4gKiBJIGNvdWxkIGhhdmUgZGVzaWduZWQgaXQgYXMgYSBwdXJlIGZ1bmN0aW9uLCBhbmQgdGhvdWdodCBhYm91dCBpdCBhIGxvdC4gSSBkZWNpZGVkIGFnYWluc3QgaXRcclxuICogYmVjYXVzZSB0aGUgZnVuY3Rpb24gd291bGQgcmVxdWlyZSB0aGUgY29uc3VtZXIgb2YgdGhlIGxpYnJhcnkgdG8gbWFpbnRhaW4gYSB3aG9sZSBsb3Qgb2Ygc3RhdGVcclxuICogaW5mb3JtYXRpb24gb24gdGhlaXIgb3duIGZvciBlYWNoIG5ldyBzY29yZSBpbnB1dC4gVXNpbmcgdGhpcyBcImRlbGVnYXRlXCIgbWV0aG9kLCB0aGUgc3RhdGUgaXMgXHJcbiAqIG1haW50YWluZWQgZW50aXJlbHkgd2l0aGluIGNsb3N1cmVzIG9mIHRoZSBcImxvb3BcIiBmdW5jdGlvbiwgYW5kIGNvbnN1bWVycyBvZiB0aGUgbGlicmFyeSB3b24ndFxyXG4gKiBoYXZlIHRvIGRlYWwgd2l0aCBsYXJnZSBzZXRzIG9mIHBhcmVkLWRvd24gcG9zc2liaWxpdGllcyBhbmQgdXNlZCBndWVzc2VzLCBhbmQgc28gZm9ydGguIFxyXG4gKiBcclxuICogT25lIGNhdmVhdCwgb2YgY291cnNlLCBpcyB0aGF0IHRoZSBzb2x2ZXIgY2FuIGZhaWwgdG8gY29tZSB0byBhIHNvbHV0aW9uIGlmIGFuIGluY29ycmVjdCBzY29yZVxyXG4gKiBpcyBlbnRlcmVkIGJ5IHRoZSB1c2VyLiBUaGVyZSBpcyBubyB3YXkgdG8gc29sdmUgdGhpcy4gQXMgdGhleSBzYXksIEdhcmJhZ2UtaW4sIEdhcmJhZ2Utb3V0LiBcclxuICogU28gcGxlYXNlIGRvIGJlIG1pbmRmdWwgb2YgeW91ciBpbnB1dHMuIFxyXG4gKi9cclxuXHJcblxyXG4vKiogQmFzZSBtZXRob2RzIGZvciBhbGwgbWV0aG9kcyBvZiBjb21tdW5pY2F0aW5nIGluZm9ybWF0aW9uIHRvIHRoZSB1c2VyLiAqL1xyXG5jb25zdCBiYXNlRGVsZWdhdGVzID0ge1xyXG4gICAgZXJyb3I6IChlcnJvcjogYW55KSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xyXG4gICAgfSxcclxuICAgIHNvbHZlZDogKGFuc3dlcjogc29sdmVyLkFuc3dlcikgPT4ge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBUaGUgYW5zd2VyIGlzOiAke2Fuc3dlci5hbnN3ZXJ9LCBhbmQgSSBmb3VuZCBpdCBpbiAke2Fuc3dlci5hdHRlbXB0c30gdHJpZXMuYCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKiBcclxuICogRm9yIHRlc3RpbmcsIHdlIGNyZWF0ZSBhIGRlbGVnYXRlIHRoYXQncyBzZWFyY2hpbmcgZm9yIGEgc3BlY2lmaWMgYW5zd2VyIGFuZCB2ZXJpZnkgdGhhdCBcclxuICogd2UndmUgZm91bmQgaXQuIEFkZGl0aW9uYWxseSwgd2UgdHJhY2sgdGhlIG51bWJlciBvZiBhdHRlbXB0cyB0aGF0IHdlcmUgbWFkZSBpbiBvcmRlclxyXG4gKiB0byB0ZXN0IHRoZSBpdGVyYXRpdmUgYWxnb3JpdGhtIG9wdGltaXphdGlvbnMgSSd2ZSBtYWRlLlxyXG4gKi9cclxudHlwZSBUZXN0RGVsZWdhdGVzID0ge1xyXG4gICAgKHRlc3RBbnN3ZXI6IHN0cmluZywgZG9uZTogKGF0dGVtcHRzOiBudW1iZXIpID0+IHZvaWQpOiBzb2x2ZXIuRGVsZWdhdGVzO1xyXG59XHJcbmNvbnN0IHRlc3REZWxlZ2F0ZXM6IFRlc3REZWxlZ2F0ZXMgPSAodGVzdEFuc3dlciwgZG9uZSkgPT4ge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICAuLi5iYXNlRGVsZWdhdGVzLFxyXG4gICAgICAgIGd1ZXNzOiAoZ3Vlc3MpID0+IHtcclxuICAgICAgICAgICAgLy8gaW4gbGlldSBvZiB1c2VyIGlucHV0LCBqdXN0IGNhbGN1bGF0ZSB0aGUgc2NvcmUgb24gb3VyIG93biB1c2luZyBvdXIgcHJlZGV0ZXJtaW5lZCB0ZXN0IGFuc3dlcixcclxuICAgICAgICAgICAgLy8gYW5kIGxldCB0aGUgc29sdmVyIGtub3cuIFxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhndWVzcyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHNjb3JlID0gc29sdmVyLmNhbGN1bGF0ZVNjb3JlKHRlc3RBbnN3ZXIsIGd1ZXNzKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJyZXNwb25zZT4gXCIgKyBzb2x2ZXIucHJpbnRTY29yZShzY29yZSkpO1xyXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHNjb3JlKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNvbHZlZDogKGFuc3dlcikgPT4ge1xyXG4gICAgICAgICAgICBiYXNlRGVsZWdhdGVzLnNvbHZlZChhbnN3ZXIpO1xyXG5cclxuICAgICAgICAgICAgLy8gdmVyaWZ5IGFuc3dlciBiZWZvcmUgY29udGludWluZy4gXHJcbiAgICAgICAgICAgIGlmIChhbnN3ZXIuYW5zd2VyID09IHRlc3RBbnN3ZXIpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQW5zd2VyIGlzIENPUlJFQ1QuXCIpO1xyXG4gICAgICAgICAgICAgICAgZG9uZShhbnN3ZXIuYXR0ZW1wdHMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBhbnN3ZXIuIFRoZSBhbnN3ZXIgd2FzOiBcIiArIHRlc3RBbnN3ZXIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG4vKiogXHJcbiAqIEZvciB0aGUgbWVhdCBvZiB0aGUgcHJvZ3JhbSwgd2UgdXNlIHRoZSByZWFkbGluZSBsaWJyYXJ5IHRvIHJlYWQgaW5wdXRzIGZyb20gYSBsaXZlIHVzZXIuXHJcbiAqIFRoZSBwcm9ncmFtIHdhcyBkZXNpZ25lZCBpbiBzdWNoIGEgd2F5IHRoYXQgdGhlIGlucHV0IGlzIGFic3RyYWN0ZWQgYXJvdW5kIGEgcHJvbWlzZSwgYWxsb3dpbmdcclxuICogdXMgdG8gY2FsbCB0aGUgcHJvZ3JhbSB1c2luZyBib3RoIGxpdmUgaW5wdXQsIGFuZCBpdGVyYXRpdmUgdGVzdCBkYXRhIHdpdGhvdXQgYW55IGFsdGVyYXRpb25zLiBcclxuICovXHJcbnR5cGUgQ29uc29sZURlbGVnYXRlcyA9IChybDogcmVhZGxpbmUuUmVhZExpbmUpID0+IHNvbHZlci5EZWxlZ2F0ZXM7XHJcbmNvbnN0IGNvbnNvbGVEZWxlZ2F0ZXM6IENvbnNvbGVEZWxlZ2F0ZXMgPSBybCA9PiB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIC4uLmJhc2VEZWxlZ2F0ZXMsXHJcbiAgICAgICAgZ3Vlc3M6IChndWVzcykgPT4ge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIF9yZWplY3QpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGd1ZXNzKTtcclxuICAgICAgICAgICAgICAgIHJsLnF1ZXN0aW9uKFwicmVzcG9uc2U+IFwiLCBpbnB1dCA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2NvcmUgPSBzb2x2ZXIucGFyc2VTY29yZShpbnB1dCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShzY29yZSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzb2x2ZWQ6IChhbnN3ZXIpID0+IHtcclxuICAgICAgICAgICAgYmFzZURlbGVnYXRlcy5zb2x2ZWQoYW5zd2VyKTtcclxuICAgICAgICAgICAgcmwuY2xvc2UoKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGVycm9yOiAoZXJyb3IpID0+IHtcclxuICAgICAgICAgICAgYmFzZURlbGVnYXRlcy5lcnJvcihlcnJvcik7XHJcbiAgICAgICAgICAgIHJsLmNsb3NlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG4vKiogXHJcbiAqIFwiUmVjdXJzaXZlXCIgaXRlcmF0aW9uIHBhdHRlcm4uIEVhY2ggbG9vcCBpcyBhc3luY2hyb25vdXMgc28gd2UgbmVlZCB0byBjcmVhdGUgYSBjbG9zdXJlXHJcbiAqIGFuZCBjYWxsIHRoZSBuZXh0IGF0dGVtcHQgd2hlbiB0aGUgY3VycmVudCBvbmUgaXMgZmluaXNoZWQuIFxyXG4gKi9cclxudHlwZSBGcmVxdWVuY2llcyA9IHsgW2luZGV4OiBudW1iZXJdOiBudW1iZXIgfVxyXG5mdW5jdGlvbiBuZXh0QXR0ZW1wdChsZWZ0OiBzdHJpbmdbXSwgbW92ZXMgPSAwLCB0b3RhbCA9IGxlZnQubGVuZ3RoLCBmcmVxdWVuY2llczogRnJlcXVlbmNpZXMgPSB7fSkge1xyXG4gICAgLy8gYmFzZSBjYXNlLCBubyBpdGVyYXRpb25zIGxlZnQuIFNob3cgYXZlcmFnZSBzb2x2ZSBsZW5ndGggYW5kIGV4dW50LCBzdGFnZSBsZWZ0LlxyXG4gICAgaWYgKGxlZnQubGVuZ3RoID09IDApIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcIkF2ZXJhZ2Ugc29sdmUgbGVuZ3RoOiBcIiArIG1vdmVzIC8gdG90YWwpO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiRnJlcXVlbmNpZXM6IFwiICsgSlNPTi5zdHJpbmdpZnkoZnJlcXVlbmNpZXMpKTtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgLy8gc2hvdyBhIHJ1bm5pbmcgYXZlcmFnZSBvZiB0aGUgc29sdXRpb24gbGVuZ3RoLiBGb3IgbXkgb3duIGFtdXNlbWVudCBhcyBJIHdhdGNoIHRoZSBpdGVyYXRpb25zIHRpY2suIFxyXG4gICAgY29uc3QgdHVybiA9IHRvdGFsIC0gbGVmdC5sZW5ndGg7XHJcbiAgICBpZiAodHVybiAhPSAwKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYEF0dGVtcHQgIyR7dHVybiArIDF9LCBjdXJyZW50IGF2ZXJhZ2UgbW92ZXM6ICR7bW92ZXMgLyB0dXJufSwgZnJlcXVlbmNpZXM6ICR7SlNPTi5zdHJpbmdpZnkoZnJlcXVlbmNpZXMpfWApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGdhdGhlciB0aGUgbmV4dCByYW5kb20gY29uZmlnIGFuZCBhdHRlbXB0IHRvIHNvbHZlIGl0LiBcclxuICAgIGNvbnN0IGNvbmZpZyA9IGxlZnQuc2hpZnQoKSE7XHJcbiAgICBjb25zdCBkZWxlZ2F0ZXMgPSB0ZXN0RGVsZWdhdGVzKGNvbmZpZywgKGF0dGVtcHRzKSA9PiB7XHJcbiAgICAgICAgLy8gd2hlbiB0aGUgbG9vcCBpcyBkb25lLCB0aGlzIHdpbGwgYmUgY2FsbGVkIHdpdGggdGhlIG51bWJlciBvZiBhdHRlbXB0cyBtYWRlLlxyXG4gICAgICAgIC8vIExvb3AgYWdhaW4sIHN1YnRyYWN0aW5nIG9uZSBmcm9tIHRoZSBudW1iZXIgb2YgaXRlcmF0aW9ucyBsZWZ0LlxyXG4gICAgICAgIGZyZXF1ZW5jaWVzW2F0dGVtcHRzXSA9IChmcmVxdWVuY2llc1thdHRlbXB0c10gfHwgMCkgKyAxO1xyXG4gICAgICAgIG5leHRBdHRlbXB0KGxlZnQsIG1vdmVzICsgYXR0ZW1wdHMsIHRvdGFsLCBmcmVxdWVuY2llcyk7XHJcbiAgICB9KTtcclxuICAgIHNvbHZlci5sb29wKGRlbGVnYXRlcyk7XHJcbn1cclxuXHJcbmlmIChwcm9jZXNzLmFyZ3YuaW5kZXhPZihcImF1dG9cIikgIT0gLTEpIHtcclxuICAgIC8vIEF1dG8gbW9kZS4gU29sdmUgZm9yIGFsbCBjb21iaW5hdGlvbnMuIFxyXG4gICAgbmV4dEF0dGVtcHQoc29sdmVyLmdldEFsbENvbWJpbmF0aW9ucygpKTtcclxufVxyXG5lbHNlIHtcclxuICAgIC8vIElucHV0IG1vZGUuIFVzZSByZWFkbGluZSB0byBnYXRoZXIgZmVlZGJhY2sgZnJvbSB0aGUgdXNlciBpbnN0ZWFkIG9mIGZpZ3VyaW5nIGl0IG91dCBvbiBvdXIgb3duLlxyXG4gICAgY29uc3QgcmwgPSByZWFkbGluZS5jcmVhdGVJbnRlcmZhY2Uoe1xyXG4gICAgICAgIGlucHV0OiBwcm9jZXNzLnN0ZGluLFxyXG4gICAgICAgIG91dHB1dDogcHJvY2Vzcy5zdGRvdXRcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIG9ubHkgZG8gb25lIGxvb3AuIElmIHRoZSB1c2VyIHdhbnRzIG1vcmUsIHRoZXkgY2FuIHJ1biBpdCBhZ2Fpbi4gXHJcbiAgICBzb2x2ZXIubG9vcChjb25zb2xlRGVsZWdhdGVzKHJsKSk7XHJcbn1cclxuIl19