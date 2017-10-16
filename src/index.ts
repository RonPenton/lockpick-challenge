import { calculateScore, getRandomConfig, loop, printScore, Answer, parseScore, Delegates } from './lib';

import * as readline from 'readline';

const baseDelegates = {
    error: (error: any) => {
        console.log(error);
    },
    solved: (answer: Answer) => {
        console.log(`The answer is: ${answer.answer}, and I found it in ${answer.attempts} tries.`);
    }
}

type TestDelegates = {
    (testAnswer: string, done: (attempts: number) => void): Delegates;
}
const testDelegates: TestDelegates = (testAnswer: string, done: (attempts: number) => void) => {
    return {
        ...baseDelegates,
        guess: (guess: string) => {
            return new Promise((resolve, _reject) => {
                console.log(guess);
                const score = calculateScore(testAnswer, guess);
                console.log("input> " + printScore(score));
                resolve(score);
            });
        },
        solved: (answer: Answer) => {
            baseDelegates.solved(answer);
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

type ConsoleDelegates = (rl: readline.ReadLine) => Delegates;
const consoleDelegates: ConsoleDelegates = rl => {
    return {
        ...baseDelegates,
        guess: (guess: string) => {
            return new Promise((resolve, _reject) => {
                console.log(guess);
                rl.question("input> ", input => {
                    resolve(parseScore(input));
                });
            });
        },
        solved: (answer: Answer) => {
            baseDelegates.solved(answer);
            rl.close();
        }
    }
}

function nextAttempt(left: number, moves: number = 0, total: number = left) {
    if (left == 0) {
        console.log("Average solve length: " + moves / total);
        return;
    }

    const turn = total - left;
    if (turn != 0) {
        console.log(`Attempt #${turn + 1}, current average moves: ${moves / turn}`);
    }

    const config = getRandomConfig();
    const delegates = testDelegates(config, (a) => {
        nextAttempt(left - 1, moves + a, total);
    });

    loop(delegates);
}

if (process.argv.indexOf("auto") != -1) {
    const numbers = process.argv.map(x => parseInt(x, 10)).filter(x => x && x > 0);
    const iterations = numbers.length > 0 ? numbers[0] : 1000;
    console.log(`Performing ${iterations} iterations...`);
    nextAttempt(iterations);
}
else {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    loop(consoleDelegates(rl));
}
