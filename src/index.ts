import * as readline from 'readline';
import { calculateScore, getRandomConfig, loop, printScore, Answer, parseScore, Delegates } from './lib';

/** Base methods for all methods of communicating information to the user. */
const baseDelegates = {
    error: (error: any) => {
        console.log(error);
    },
    solved: (answer: Answer) => {
        console.log(`The answer is: ${answer.answer}, and I found it in ${answer.attempts} tries.`);
    }
}

/** 
 * For testing, we create a delegate that's searching for a specific answer and verify that 
 * we've found it. Additionally, we track the number of attempts that were made in order
 * to test the iterative algorithm optimizations I've made.
 */
type TestDelegates = {
    (testAnswer: string, done: (attempts: number) => void): Delegates;
}
const testDelegates: TestDelegates = (testAnswer, done) => {
    return {
        ...baseDelegates,
        guess: (guess: string) => {
            // in lieu of user input, just calculate the score on our own using our predetermined test answer,
            // and let the solver know. 
            return new Promise((resolve) => {
                console.log(guess);
                const score = calculateScore(testAnswer, guess);
                console.log("response> " + printScore(score));
                resolve(score);
            });
        },
        solved: (answer: Answer) => {
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
type ConsoleDelegates = (rl: readline.ReadLine) => Delegates;
const consoleDelegates: ConsoleDelegates = rl => {
    return {
        ...baseDelegates,
        guess: (guess: string) => {
            return new Promise((resolve, _reject) => {
                console.log(guess);
                rl.question("response> ", input => {
                    const score = parseScore(input);
                    resolve(score);
                });
            });
        },
        solved: (answer: Answer) => {
            baseDelegates.solved(answer);
            rl.close();
        }
    }
}

/** 
 * "Recursive" iteration pattern. Each loop is asynchronous so we need to create a closure
 * and call the next attempt when the current one is finished. 
 */
function nextAttempt(left: number, moves: number = 0, total: number = left) {
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
    const config = getRandomConfig();
    const delegates = testDelegates(config, (a) => {
        nextAttempt(left - 1, moves + a, total);
    });
    loop(delegates);
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
    loop(consoleDelegates(rl));
}
