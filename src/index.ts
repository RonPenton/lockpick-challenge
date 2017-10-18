import * as readline from 'readline';
import * as solver from './lib';


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
    error: (error: any) => {
        console.log(error);
    },
    solved: (answer: solver.Answer) => {
        console.log(`The answer is: ${answer.answer}, and I found it in ${answer.attempts} tries.`);
    }
}

/** 
 * For testing, we create a delegate that's searching for a specific answer and verify that 
 * we've found it. Additionally, we track the number of attempts that were made in order
 * to test the iterative algorithm optimizations I've made.
 */
type TestDelegates = {
    (testAnswer: string, done: (attempts: number) => void): solver.Delegates;
}
const testDelegates: TestDelegates = (testAnswer, done) => {
    return {
        ...baseDelegates,
        guess: (guess) => {
            // in lieu of user input, just calculate the score on our own using our predetermined test answer,
            // and let the solver know. 
            console.log(guess);
            const score = solver.calculateScore(testAnswer, guess);
            console.log("response> " + solver.printScore(score));
            return Promise.resolve(score);
        },
        solved: (answer) => {
            baseDelegates.solved(answer);

            // verify answer before continuing. 
            if (answer.answer == testAnswer) {
                console.log("Answer is CORRECT.");
                done(answer.attempts);
            }
            else {
                throw new Error("Invalid answer. The answer was: " + testAnswer);
            }
        }
    }
}

/** 
 * For the meat of the program, we use the readline library to read inputs from a live user.
 * The program was designed in such a way that the input is abstracted around a promise, allowing
 * us to call the program using both live input, and iterative test data without any alterations. 
 */
type ConsoleDelegates = (rl: readline.ReadLine) => solver.Delegates;
const consoleDelegates: ConsoleDelegates = rl => {
    return {
        ...baseDelegates,
        guess: (guess) => {
            return new Promise((resolve, _reject) => {
                console.log(guess);
                rl.question("response> ", input => {
                    const score = solver.parseScore(input);
                    resolve(score);
                });
            });
        },
        solved: (answer) => {
            baseDelegates.solved(answer);
            rl.close();
        },
        error: (error) => {
            baseDelegates.error(error);
            rl.close();
        }
    }
}

/** 
 * "Recursive" iteration pattern. Each loop is asynchronous so we need to create a closure
 * and call the next attempt when the current one is finished. 
 */
type Frequencies = { [index: number]: number }
function nextAttempt(left: string[], moves = 0, total = left.length, frequencies: Frequencies = {}) {
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
    const config = left.shift()!;
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
