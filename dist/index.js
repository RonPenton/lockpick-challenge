"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const readline = require("readline");
const lib_1 = require("./lib");
/**
 * The demo has two modes of operation. In the normal mode, we print out a guess, and then
 * enter a loop wherein we wait for a "Score" from the user, and then make the next guess.
 * This loop continues until the correct answer is found.
 *
 * The second mode was my testing mode, which I used to test the length of my average solution,
 * so I could tweak the algorithm and lower the average. This testing mode creates a random
 * lock configuration and then runs the game loop. Instead of consulting the command line
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
 * As of right now, this version of the program averages around 4.081 guesses to find a
 * solution on a uniformly-random input set. The maximal number of guesses is 5, and the minimum,
 * obviously, is 1, with the median and mode, by far, being 4.
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
            const score = lib_1.calculateScore(testAnswer, guess);
            console.log("response> " + lib_1.printScore(score));
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
                    const score = lib_1.parseScore(input);
                    resolve(score);
                });
            });
        }, solved: (answer) => {
            baseDelegates.solved(answer);
            rl.close();
        } });
};
/**
 * "Recursive" iteration pattern. Each loop is asynchronous so we need to create a closure
 * and call the next attempt when the current one is finished.
 */
function nextAttempt(left, moves = 0, total = left) {
    // base case, no iterations left. Show average solve length and exunt, stage left.
    if (left == 0) {
        console.log("Average solve length: " + moves / total);
        return;
    }
    // show a running average of the solution length. For my own amusement as I watch the iterations tick. 
    const turn = total - left;
    if (turn != 0) {
        console.log(`Attempt #${turn + 1}, current average moves: ${moves / turn}`);
    }
    // gather the next random config and attempt to solve it. 
    const config = lib_1.getRandomConfig();
    const delegates = testDelegates(config, (attempts) => {
        // when the loop is done, this will be called with the number of attempts made.
        // Loop again, subtracting one from the number of iterations left.
        nextAttempt(left - 1, moves + attempts, total);
    });
    lib_1.loop(delegates);
}
if (process.argv.indexOf("auto") != -1) {
    // Auto mode. Specify "auto #" in the args and it will pick them out. It's finicky so don't get fancy. 
    const numbers = process.argv.map(x => parseInt(x, 10)).filter(x => x && x > 0);
    const iterations = numbers.length > 0 ? numbers[0] : 1000;
    console.log(`Performing ${iterations} iterations...`);
    nextAttempt(iterations);
}
else {
    // Input mode. Use readline to gather feedback from the user instead of figuring it out on our own.
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    // only do one loop. If the user wants more, they can run it again. 
    lib_1.loop(consoleDelegates(rl));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxxQ0FBcUM7QUFDckMsK0JBQXlHO0FBR3pHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBb0RHO0FBR0gsNkVBQTZFO0FBQzdFLE1BQU0sYUFBYSxHQUFHO0lBQ2xCLEtBQUssRUFBRSxDQUFDLEtBQVUsRUFBRSxFQUFFO1FBQ2xCLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDdkIsQ0FBQztJQUNELE1BQU0sRUFBRSxDQUFDLE1BQWMsRUFBRSxFQUFFO1FBQ3ZCLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixNQUFNLENBQUMsUUFBUSxTQUFTLENBQUMsQ0FBQztJQUNoRyxDQUFDO0NBQ0osQ0FBQTtBQVVELE1BQU0sYUFBYSxHQUFrQixDQUFDLFVBQVUsRUFBRSxJQUFJLEVBQUUsRUFBRTtJQUN0RCxNQUFNLG1CQUNDLGFBQWEsSUFDaEIsS0FBSyxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDYixrR0FBa0c7WUFDbEcsNEJBQTRCO1lBQzVCLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDbkIsTUFBTSxLQUFLLEdBQUcsb0JBQWMsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDaEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEdBQUcsZ0JBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQzlDLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2xDLENBQUMsRUFDRCxNQUFNLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNmLGFBQWEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFN0Isb0NBQW9D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Q0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBQzFELE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxVQUFVLGdCQUFnQixDQUFDLENBQUM7SUFDdEQsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzVCLENBQUM7QUFDRCxJQUFJLENBQUMsQ0FBQztJQUNGLG1HQUFtRztJQUNuRyxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsZUFBZSxDQUFDO1FBQ2hDLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSztRQUNwQixNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU07S0FDekIsQ0FBQyxDQUFDO0lBRUgsb0VBQW9FO0lBQ3BFLFVBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQy9CLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyByZWFkbGluZSBmcm9tICdyZWFkbGluZSc7XHJcbmltcG9ydCB7IGNhbGN1bGF0ZVNjb3JlLCBnZXRSYW5kb21Db25maWcsIGxvb3AsIHByaW50U2NvcmUsIEFuc3dlciwgcGFyc2VTY29yZSwgRGVsZWdhdGVzIH0gZnJvbSAnLi9saWInO1xyXG5cclxuXHJcbi8qKlxyXG4gKiBUaGUgZGVtbyBoYXMgdHdvIG1vZGVzIG9mIG9wZXJhdGlvbi4gSW4gdGhlIG5vcm1hbCBtb2RlLCB3ZSBwcmludCBvdXQgYSBndWVzcywgYW5kIHRoZW4gXHJcbiAqIGVudGVyIGEgbG9vcCB3aGVyZWluIHdlIHdhaXQgZm9yIGEgXCJTY29yZVwiIGZyb20gdGhlIHVzZXIsIGFuZCB0aGVuIG1ha2UgdGhlIG5leHQgZ3Vlc3MuXHJcbiAqIFRoaXMgbG9vcCBjb250aW51ZXMgdW50aWwgdGhlIGNvcnJlY3QgYW5zd2VyIGlzIGZvdW5kLiBcclxuICogXHJcbiAqIFRoZSBzZWNvbmQgbW9kZSB3YXMgbXkgdGVzdGluZyBtb2RlLCB3aGljaCBJIHVzZWQgdG8gdGVzdCB0aGUgbGVuZ3RoIG9mIG15IGF2ZXJhZ2Ugc29sdXRpb24sXHJcbiAqIHNvIEkgY291bGQgdHdlYWsgdGhlIGFsZ29yaXRobSBhbmQgbG93ZXIgdGhlIGF2ZXJhZ2UuIFRoaXMgdGVzdGluZyBtb2RlIGNyZWF0ZXMgYSByYW5kb20gXHJcbiAqIGxvY2sgY29uZmlndXJhdGlvbiBhbmQgdGhlbiBydW5zIHRoZSBnYW1lIGxvb3AuIEluc3RlYWQgb2YgY29uc3VsdGluZyB0aGUgY29tbWFuZCBsaW5lXHJcbiAqIGZvciB1c2VyIGlucHV0LCBpdCB1dGlsaXplcyB0aGUgcHJvZ3JhbXMgJ2NhbGN1bGF0ZVNjb3JlJyBtZXRob2QgdG8gY2FsY3VsYXRlIHRoZSB4V3lTXHJcbiAqIFwic2NvcmVcIiBmb3IgYSBnaXZlbiBndWVzcy4gVGhhdCBhbGdvcml0aG0gd2FzIG5lZWRlZCBpbnRlcm5hbGx5IHRvIG5hcnJvdyBkb3duIHRoZSBudW1iZXJcclxuICogb2YgdmFsaWQgY2hvaWNlcyBsZWZ0IGluIHRoZSBwb3NzaWJpbGl0aWVzIHNldCwgYW5kIHRoZSBkZXRhaWxzIG9uIHRoZSBvdmVyYWxsIHN0cmF0ZWd5IFxyXG4gKiBtYXkgYmUgZm91bmQgaW4gdGhlIFJFQURNRS5tZCBmaWxlIG9mIHRoaXMgcHJvamVjdC4gT25jZSBpdCBzZW5kcyB0aGUgc2NvcmUgYmFjayB0byB0aGUgXHJcbiAqIHNvbHZlciwgaXQgcmVwZWF0cyB0aGUgbG9vcCB1bnRpbCB0aGUgc29sdmVyIGFubm91bmNlcyB0aGF0IGl0IGhhcyBmb3VuZCBhIHNvbHV0aW9uLiBUaGlzIFxyXG4gKiBtb2RlIGNoZWNrcyB0aGUgc29sdXRpb24gdG8gc2VlIGlmIGl0IHdhcyBhY2N1cmF0ZSwgYW5kIHRoZW4gZWl0aGVyIGNvbnRpbnVlcyBvciB0ZXJtaW5hdGVzXHJcbiAqIHRoZSBhcHBsaWNhdGlvbiBiYXNlZCBvbiB0aGUgcmVzcG9uc2UuIEFuIGludmFsaWQgYW5zd2VyIG1lYW5zIHRoZSBwcm9ncmFtIGlzIGJyb2tlbiBhbmQgXHJcbiAqIHNob3VsZCBubyBsb25nZXIgY29udGludWUgcnVubmluZywgc28gdGhhdCBJIGNhbiBmaXggaXQuIEknbSBoYXBweSB0byBzYXkgSSBzdGlsbCBoYXZlbid0XHJcbiAqIGZvdW5kIGEgYnJva2VuIGFuc3dlci4gVGhpcyBtb2RlIGFsc28gdHJhY2tzIHRoZSBudW1iZXIgb2YgYXR0ZW1wdHMgcGVyIGFuc3dlci4gXHJcbiAqIFxyXG4gKiBBcyBvZiByaWdodCBub3csIHRoaXMgdmVyc2lvbiBvZiB0aGUgcHJvZ3JhbSBhdmVyYWdlcyBhcm91bmQgNC4wODEgZ3Vlc3NlcyB0byBmaW5kIGEgXHJcbiAqIHNvbHV0aW9uIG9uIGEgdW5pZm9ybWx5LXJhbmRvbSBpbnB1dCBzZXQuIFRoZSBtYXhpbWFsIG51bWJlciBvZiBndWVzc2VzIGlzIDUsIGFuZCB0aGUgbWluaW11bSwgXHJcbiAqIG9idmlvdXNseSwgaXMgMSwgd2l0aCB0aGUgbWVkaWFuIGFuZCBtb2RlLCBieSBmYXIsIGJlaW5nIDQuIFxyXG4gKiBcclxuICogSW4gb3JkZXIgdG8gZG8gdGhpcyBkdWFsIG1vZGUgb2Ygb3BlcmF0aW9uLCBJIGFic3RyYWN0ZWQgdGhlIGlucHV0IGFuZCBvdXRwdXQgb2YgdGhlIHByb2dyYW1cclxuICogaW50byBhIHN0cnVjdHVyZSBJIGNhbGxlZCBhIFwiZGVsZWdhdGVcIi4gVGhpcyBzdHJ1Y3R1cmUgY29udGFpbnMgMyBmdW5jdGlvbnM6XHJcbiAqIFxyXG4gKiAgLSBlcnJvcjogQSBmdW5jdGlvbiB0byBiZSBjYWxsZWQgd2hlbiB0aGUgc29sdmVyIGhhcyBydW4gaW50byBhbiB1bnJlY292ZXJhYmxlIGVycm9yLiBcclxuICogICAgICAgICAgIEFsbCBvcGVyYXRpb25zIGNlYXNlIHdoZW4gdGhpcyBoYXBwZW5zLiBcclxuICogIC0gc29sdmVkOiBBIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCB3aGVuIHRoZSBzb2x2ZXIgdGhpbmtzIGl0IGhhcyBmb3VuZCB0aGUgY29ycmVudCBhbnN3ZXIuXHJcbiAqICAgICAgICAgICAgVGhpcyBtZXRob2QgaXMgZ2l2ZW4gdGhlIGFuc3dlciBhbmQgdGhlIG51bWJlciBvZiBhdHRlbXB0cyBpdCB0b29rIHRvIGFjaGlldmVcclxuICogICAgICAgICAgICB0aGF0IGFuc3dlci5cclxuICogIC0gZ3Vlc3M6IEEgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIHdoZW5ldmVyIHRoZSBzb2x2ZXIgaXNzdWVzIGEgbmV3IGd1ZXNzLiBUaGlzIGZ1bmN0aW9uXHJcbiAqICAgICAgICAgICBpcyB0byByZXR1cm4gYSBQcm9taXNlIG9mIFwiU2NvcmVcIi4gTWVhbmluZyB0aGF0IHRoZSBzb2x2ZXIgaXMgZ29pbmcgdG8gc2xlZXAsIFxyXG4gKiAgICAgICAgICAgYW5kIHdpbGwgYXdha2VuIHdoZW4geW91IHJlc29sdmUgdGhlIHByb21pc2Ugd2l0aCBhIHNjb3JlIG9iamVjdCwgcmVwcmVzZW50aW5nXHJcbiAqICAgICAgICAgICBob3cgbWFueSB3aGl0ZS9ibGFjayBwb2ludHMgeW91IGFyZSBhd2FyZGluZyB0aGUgc29sdmVyLiBcclxuICogXHJcbiAqIEJ5IGFic3RyYWN0aW5nIHRoZSBpbnRlcmFjdGlvbiB3aXRoIHRoZSBzb2x2ZXIgdGhpcyB3YXksIHdlIGNhbiBjcmVhdGUgdHdvIGRpZmZlcmVudCBraW5kc1xyXG4gKiBvZiBkZWxlZ2F0ZXMuIFRoZSB0ZXN0aW5nIGRlbGVnYXRlIGlzIGEgc3RydWN0dXJlIHRoYXQgaW1tZWRpYXRlbHkgY2FsY3VsYXRlcyBhIG5ldyBTY29yZVxyXG4gKiB3aGVuIGl0IHJlY2lldmVzIGEgZ3Vlc3MsIGFuZCBzZW5kcyBpdCBiYWNrIHRvIHRoZSBzb2x2ZXIuIFRoZSBjb25zb2xlIGRlbGVnYXRlLCBvbiB0aGVcclxuICogb3RoZXIgaGFuZCwgdXNlcyB0aGUgTm9kZSAncmVhZGxpbmUnIGxpYnJhcnkgdG8gcmVhZCBhIGxpbmUgb2YgaW5wdXQgZnJvbSB0aGUgY29tbWFuZCBsaW5lLFxyXG4gKiBhc3luY2hyb25vdXNseSwgYW5kIHRoZW4gcGFyc2VzIGFuZCB0cmFuc21pdHMgdGhhdCBzY29yZSB0byB0aGUgc29sdmVyIHdoZW5ldmVyIHRoZSBjYWxsYmFja1xyXG4gKiByZXR1cm5zIHdpdGggdGhlIHVzZXIncyBpbnB1dC4gVGhpcyBhbGxvd3MgdGhlIHNvbHZlciBjb2RlIHRvIG9wZXJhdGUgY29tcGxldGVseSBpbmRlcGVuZGVudGx5XHJcbiAqIGZyb20gdGhlIGlucHV0IG1lY2hhbmlzbS4gXHJcbiAqIFxyXG4gKiBJIGNvdWxkIGhhdmUgZGVzaWduZWQgaXQgYXMgYSBwdXJlIGZ1bmN0aW9uLCBhbmQgdGhvdWdodCBhYm91dCBpdCBhIGxvdC4gSSBkZWNpZGVkIGFnYWluc3QgaXRcclxuICogYmVjYXVzZSB0aGUgZnVuY3Rpb24gd291bGQgcmVxdWlyZSB0aGUgY29uc3VtZXIgb2YgdGhlIGxpYnJhcnkgdG8gbWFpbnRhaW4gYSB3aG9sZSBsb3Qgb2Ygc3RhdGVcclxuICogaW5mb3JtYXRpb24gb24gdGhlaXIgb3duIGZvciBlYWNoIG5ldyBzY29yZSBpbnB1dC4gVXNpbmcgdGhpcyBcImRlbGVnYXRlXCIgbWV0aG9kLCB0aGUgc3RhdGUgaXMgXHJcbiAqIG1haW50YWluZWQgZW50aXJlbHkgd2l0aGluIGNsb3N1cmVzIG9mIHRoZSBcImxvb3BcIiBmdW5jdGlvbiwgYW5kIGNvbnN1bWVycyBvZiB0aGUgbGlicmFyeSB3b24ndFxyXG4gKiBoYXZlIHRvIGRlYWwgd2l0aCBsYXJnZSBzZXRzIG9mIHBhcmVkLWRvd24gcG9zc2liaWxpdGllcyBhbmQgdXNlZCBndWVzc2VzLCBhbmQgc28gZm9ydGguIFxyXG4gKiBcclxuICogT25lIGNhdmVhdCwgb2YgY291cnNlLCBpcyB0aGF0IHRoZSBzb2x2ZXIgY2FuIGZhaWwgdG8gY29tZSB0byBhIHNvbHV0aW9uIGlmIGFuIGluY29ycmVjdCBzY29yZVxyXG4gKiBpcyBlbnRlcmVkIGJ5IHRoZSB1c2VyLiBUaGVyZSBpcyBubyB3YXkgdG8gc29sdmUgdGhpcy4gQXMgdGhleSBzYXksIEdhcmJhZ2UtaW4sIEdhcmJhZ2Utb3V0LiBcclxuICogU28gcGxlYXNlIGRvIGJlIG1pbmRmdWwgb2YgeW91ciBpbnB1dHMuIFxyXG4gKi9cclxuXHJcblxyXG4vKiogQmFzZSBtZXRob2RzIGZvciBhbGwgbWV0aG9kcyBvZiBjb21tdW5pY2F0aW5nIGluZm9ybWF0aW9uIHRvIHRoZSB1c2VyLiAqL1xyXG5jb25zdCBiYXNlRGVsZWdhdGVzID0ge1xyXG4gICAgZXJyb3I6IChlcnJvcjogYW55KSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coZXJyb3IpO1xyXG4gICAgfSxcclxuICAgIHNvbHZlZDogKGFuc3dlcjogQW5zd2VyKSA9PiB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYFRoZSBhbnN3ZXIgaXM6ICR7YW5zd2VyLmFuc3dlcn0sIGFuZCBJIGZvdW5kIGl0IGluICR7YW5zd2VyLmF0dGVtcHRzfSB0cmllcy5gKTtcclxuICAgIH1cclxufVxyXG5cclxuLyoqIFxyXG4gKiBGb3IgdGVzdGluZywgd2UgY3JlYXRlIGEgZGVsZWdhdGUgdGhhdCdzIHNlYXJjaGluZyBmb3IgYSBzcGVjaWZpYyBhbnN3ZXIgYW5kIHZlcmlmeSB0aGF0IFxyXG4gKiB3ZSd2ZSBmb3VuZCBpdC4gQWRkaXRpb25hbGx5LCB3ZSB0cmFjayB0aGUgbnVtYmVyIG9mIGF0dGVtcHRzIHRoYXQgd2VyZSBtYWRlIGluIG9yZGVyXHJcbiAqIHRvIHRlc3QgdGhlIGl0ZXJhdGl2ZSBhbGdvcml0aG0gb3B0aW1pemF0aW9ucyBJJ3ZlIG1hZGUuXHJcbiAqL1xyXG50eXBlIFRlc3REZWxlZ2F0ZXMgPSB7XHJcbiAgICAodGVzdEFuc3dlcjogc3RyaW5nLCBkb25lOiAoYXR0ZW1wdHM6IG51bWJlcikgPT4gdm9pZCk6IERlbGVnYXRlcztcclxufVxyXG5jb25zdCB0ZXN0RGVsZWdhdGVzOiBUZXN0RGVsZWdhdGVzID0gKHRlc3RBbnN3ZXIsIGRvbmUpID0+IHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICAgLi4uYmFzZURlbGVnYXRlcyxcclxuICAgICAgICBndWVzczogKGd1ZXNzKSA9PiB7XHJcbiAgICAgICAgICAgIC8vIGluIGxpZXUgb2YgdXNlciBpbnB1dCwganVzdCBjYWxjdWxhdGUgdGhlIHNjb3JlIG9uIG91ciBvd24gdXNpbmcgb3VyIHByZWRldGVybWluZWQgdGVzdCBhbnN3ZXIsXHJcbiAgICAgICAgICAgIC8vIGFuZCBsZXQgdGhlIHNvbHZlciBrbm93LiBcclxuICAgICAgICAgICAgY29uc29sZS5sb2coZ3Vlc3MpO1xyXG4gICAgICAgICAgICBjb25zdCBzY29yZSA9IGNhbGN1bGF0ZVNjb3JlKHRlc3RBbnN3ZXIsIGd1ZXNzKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJyZXNwb25zZT4gXCIgKyBwcmludFNjb3JlKHNjb3JlKSk7XHJcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoc2NvcmUpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc29sdmVkOiAoYW5zd2VyKSA9PiB7XHJcbiAgICAgICAgICAgIGJhc2VEZWxlZ2F0ZXMuc29sdmVkKGFuc3dlcik7XHJcblxyXG4gICAgICAgICAgICAvLyB2ZXJpZnkgYW5zd2VyIGJlZm9yZSBjb250aW51aW5nLiBcclxuICAgICAgICAgICAgaWYgKGFuc3dlci5hbnN3ZXIgPT0gdGVzdEFuc3dlcikge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJBbnN3ZXIgaXMgQ09SUkVDVC5cIik7XHJcbiAgICAgICAgICAgICAgICBkb25lKGFuc3dlci5hdHRlbXB0cyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbnZhbGlkIGFuc3dlci4gVGhlIGFuc3dlciB3YXM6IFwiICsgdGVzdEFuc3dlcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKiBcclxuICogRm9yIHRoZSBtZWF0IG9mIHRoZSBwcm9ncmFtLCB3ZSB1c2UgdGhlIHJlYWRsaW5lIGxpYnJhcnkgdG8gcmVhZCBpbnB1dHMgZnJvbSBhIGxpdmUgdXNlci5cclxuICogVGhlIHByb2dyYW0gd2FzIGRlc2lnbmVkIGluIHN1Y2ggYSB3YXkgdGhhdCB0aGUgaW5wdXQgaXMgYWJzdHJhY3RlZCBhcm91bmQgYSBwcm9taXNlLCBhbGxvd2luZ1xyXG4gKiB1cyB0byBjYWxsIHRoZSBwcm9ncmFtIHVzaW5nIGJvdGggbGl2ZSBpbnB1dCwgYW5kIGl0ZXJhdGl2ZSB0ZXN0IGRhdGEgd2l0aG91dCBhbnkgYWx0ZXJhdGlvbnMuIFxyXG4gKi9cclxudHlwZSBDb25zb2xlRGVsZWdhdGVzID0gKHJsOiByZWFkbGluZS5SZWFkTGluZSkgPT4gRGVsZWdhdGVzO1xyXG5jb25zdCBjb25zb2xlRGVsZWdhdGVzOiBDb25zb2xlRGVsZWdhdGVzID0gcmwgPT4ge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICAuLi5iYXNlRGVsZWdhdGVzLFxyXG4gICAgICAgIGd1ZXNzOiAoZ3Vlc3MpID0+IHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCBfcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhndWVzcyk7XHJcbiAgICAgICAgICAgICAgICBybC5xdWVzdGlvbihcInJlc3BvbnNlPiBcIiwgaW5wdXQgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNjb3JlID0gcGFyc2VTY29yZShpbnB1dCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShzY29yZSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzb2x2ZWQ6IChhbnN3ZXIpID0+IHtcclxuICAgICAgICAgICAgYmFzZURlbGVnYXRlcy5zb2x2ZWQoYW5zd2VyKTtcclxuICAgICAgICAgICAgcmwuY2xvc2UoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbi8qKiBcclxuICogXCJSZWN1cnNpdmVcIiBpdGVyYXRpb24gcGF0dGVybi4gRWFjaCBsb29wIGlzIGFzeW5jaHJvbm91cyBzbyB3ZSBuZWVkIHRvIGNyZWF0ZSBhIGNsb3N1cmVcclxuICogYW5kIGNhbGwgdGhlIG5leHQgYXR0ZW1wdCB3aGVuIHRoZSBjdXJyZW50IG9uZSBpcyBmaW5pc2hlZC4gXHJcbiAqL1xyXG5mdW5jdGlvbiBuZXh0QXR0ZW1wdChsZWZ0OiBudW1iZXIsIG1vdmVzOiBudW1iZXIgPSAwLCB0b3RhbDogbnVtYmVyID0gbGVmdCkge1xyXG4gICAgLy8gYmFzZSBjYXNlLCBubyBpdGVyYXRpb25zIGxlZnQuIFNob3cgYXZlcmFnZSBzb2x2ZSBsZW5ndGggYW5kIGV4dW50LCBzdGFnZSBsZWZ0LlxyXG4gICAgaWYgKGxlZnQgPT0gMCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiQXZlcmFnZSBzb2x2ZSBsZW5ndGg6IFwiICsgbW92ZXMgLyB0b3RhbCk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIHNob3cgYSBydW5uaW5nIGF2ZXJhZ2Ugb2YgdGhlIHNvbHV0aW9uIGxlbmd0aC4gRm9yIG15IG93biBhbXVzZW1lbnQgYXMgSSB3YXRjaCB0aGUgaXRlcmF0aW9ucyB0aWNrLiBcclxuICAgIGNvbnN0IHR1cm4gPSB0b3RhbCAtIGxlZnQ7XHJcbiAgICBpZiAodHVybiAhPSAwKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYEF0dGVtcHQgIyR7dHVybiArIDF9LCBjdXJyZW50IGF2ZXJhZ2UgbW92ZXM6ICR7bW92ZXMgLyB0dXJufWApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGdhdGhlciB0aGUgbmV4dCByYW5kb20gY29uZmlnIGFuZCBhdHRlbXB0IHRvIHNvbHZlIGl0LiBcclxuICAgIGNvbnN0IGNvbmZpZyA9IGdldFJhbmRvbUNvbmZpZygpO1xyXG4gICAgY29uc3QgZGVsZWdhdGVzID0gdGVzdERlbGVnYXRlcyhjb25maWcsIChhdHRlbXB0cykgPT4ge1xyXG4gICAgICAgIC8vIHdoZW4gdGhlIGxvb3AgaXMgZG9uZSwgdGhpcyB3aWxsIGJlIGNhbGxlZCB3aXRoIHRoZSBudW1iZXIgb2YgYXR0ZW1wdHMgbWFkZS5cclxuICAgICAgICAvLyBMb29wIGFnYWluLCBzdWJ0cmFjdGluZyBvbmUgZnJvbSB0aGUgbnVtYmVyIG9mIGl0ZXJhdGlvbnMgbGVmdC5cclxuICAgICAgICBuZXh0QXR0ZW1wdChsZWZ0IC0gMSwgbW92ZXMgKyBhdHRlbXB0cywgdG90YWwpO1xyXG4gICAgfSk7XHJcbiAgICBsb29wKGRlbGVnYXRlcyk7XHJcbn1cclxuXHJcbmlmIChwcm9jZXNzLmFyZ3YuaW5kZXhPZihcImF1dG9cIikgIT0gLTEpIHtcclxuICAgIC8vIEF1dG8gbW9kZS4gU3BlY2lmeSBcImF1dG8gI1wiIGluIHRoZSBhcmdzIGFuZCBpdCB3aWxsIHBpY2sgdGhlbSBvdXQuIEl0J3MgZmluaWNreSBzbyBkb24ndCBnZXQgZmFuY3kuIFxyXG4gICAgY29uc3QgbnVtYmVycyA9IHByb2Nlc3MuYXJndi5tYXAoeCA9PiBwYXJzZUludCh4LCAxMCkpLmZpbHRlcih4ID0+IHggJiYgeCA+IDApO1xyXG4gICAgY29uc3QgaXRlcmF0aW9ucyA9IG51bWJlcnMubGVuZ3RoID4gMCA/IG51bWJlcnNbMF0gOiAxMDAwO1xyXG4gICAgY29uc29sZS5sb2coYFBlcmZvcm1pbmcgJHtpdGVyYXRpb25zfSBpdGVyYXRpb25zLi4uYCk7XHJcbiAgICBuZXh0QXR0ZW1wdChpdGVyYXRpb25zKTtcclxufVxyXG5lbHNlIHtcclxuICAgIC8vIElucHV0IG1vZGUuIFVzZSByZWFkbGluZSB0byBnYXRoZXIgZmVlZGJhY2sgZnJvbSB0aGUgdXNlciBpbnN0ZWFkIG9mIGZpZ3VyaW5nIGl0IG91dCBvbiBvdXIgb3duLlxyXG4gICAgY29uc3QgcmwgPSByZWFkbGluZS5jcmVhdGVJbnRlcmZhY2Uoe1xyXG4gICAgICAgIGlucHV0OiBwcm9jZXNzLnN0ZGluLFxyXG4gICAgICAgIG91dHB1dDogcHJvY2Vzcy5zdGRvdXRcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIG9ubHkgZG8gb25lIGxvb3AuIElmIHRoZSB1c2VyIHdhbnRzIG1vcmUsIHRoZXkgY2FuIHJ1biBpdCBhZ2Fpbi4gXHJcbiAgICBsb29wKGNvbnNvbGVEZWxlZ2F0ZXMocmwpKTtcclxufVxyXG4iXX0=