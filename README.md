# Lockpick Challenge

## Setup/Run

```
npm install
npm run build
npm run-script run
```

This creates a command-line node app that allows users to enter data and it will return the results as they are entered.

The input format is flexible. All of the following are accepted:

```
1w
2b
1w2b
2b1w
1W2b
2B1w
2B2W
0b0w
```

Etc, you get the point. An empty line is intrepretted as 0W0B. Actually, you should never have to do that, because with the no-duplicates rule, 0W0B is never a valid response anymore. So don't enter that. You'll break the program. 

To run the testing harness, run:

```
npm run-script run-auto
```

## Methodology

My submission. Built in Typescript in a mostly-functional manner (there are a few parts where I slipped into imperitive programming for speed improvements to the algorithms). Uses a greedy algorithm to solve the problem:

1. Gives an initial guess, asking for an optimal amount of information about the board by asking for X different colors, where X is the number of places allowed in the combination. 
2. Upon getting a response, it eliminates all potential answers that don't match the given response.
3. Using a greedy algorithm it looks through the remaining possibilities and attempts to pick out one that has the potential to eliminate the most remaining choices. 
4. Repeat from step 2 until there is only one answer remaining. 

The initial version of this program differed in that it searched all possible answers instead of all possible remaining answers. While that version was capable of enforcing that the maximum number of guesses was capped at 5, its average number of guesses was higher than this version. There were a number of mutations to the original algorithm that I tried. The testing data is as follows:

* Original algorithm:   Average solve length: 4.762
* BGOO start:           Average solve length: 4.744
* random<2 alg:         Average solve length: 4.635
* only remaining:       Average solve length: 4.495
* BGOR start:           Average solve length: 4.499
* remove random alg:    Average solve length: 4.499
* Back to BGOO:         Average solve length: 4.519
* Whoops!               Average solve length: 4.081
* All perms again:      Average solve length: 4.386
* PYGO start:           Average solve length: 4.061

The first change I made was I changed the BBGG starting move to BGOO. I figured that trying 3 different colors might give me more information than just two. It was a slight improvement, but nothing I was excited about and began looking at other ways to improve the algorithm.

The next alternative I tried, while still testing all available possibilities, was to randomly choose an answer if there were only 2 answers left. This decreased the solve length of the algorithm because of the assumption that we were more likely to get a correct answer by chance than choosing an answer from the entire dataset that has the potential to remove the most possibilities. Given that we needed to remove at most one, that's a gamble I was willing to take, and was happy to see the result ended up in another decrease in average solve length, even more significant than the alteration to BGOO. 

My next alteration was was made by wondering if picking from all available possibilities hindered the solution. Not only was that a lot of operations, but it would pick combinations that have already been rejected. While in theory the min-max algorithm picked something with the potential to remove a lot of possibilities, that was only a supposition. I changed it to scan only remaining values and achieved a large increase in speed, and a great decrease in average solve length. There is one caveat, however: The largest solution is now 6, instead of 5. Given that this algorithm is only going to be tested and scored on 5 entries, the speed argument makes no sense. But more worrisome, if the testers happen to pick one or more combinations that happen to come to 6 guesses, I could be in trouble. 

Not worrying about that for now, I went on to test a BGOR start, wondering if that would be even more efficient than BGOO. It was not statistically different from BGOO. I believe that the extra quantity value provided by having two O's might have actually helped more than 4 independent colors. I don't have the math to back any of this up, just empirical test data.

For the next iteration, I removed the random<2 alteration. It occurred to me that if I was only going up against remaining choices, then a random choice is less informed than picking one of the two using the greedy algorithm. This had seemingly no effect on the outcome whatsoever. I was a little surprised, but I suppose it shows that the greedy algoritm, at tiny data sizes, is no better than random. 

The next change was moving back to BGOO due to BGOR having slightly higher solve lengths. Nothing too dramatic, but the numbers showed BGOO was faster than BGOR. Surprisingly, after the changes inbetween, this didn't prove to be true. Maybe it's statistical noise. 

It was at this point, when I was re-reading the specifications, making sure I had everything complete to spec, that I noticed I've made a huge mistake. One tiny bullet point I had ignored:

```
No two slots can have the same color simultaneously.
```

Ohhhh. My initial design assumed that duplicates were possible. Well then. How embarassing. Not the first professional mistake I've ever made. Not the last I'll make, either. Good thing I caught it! Altering 3 lines of code I was able to modify the algorithm to fit the new requirements. It's insanely fast now. My first trial ended up being significantly faster and more optimal than before. That's not in any way surprising. We went from an initial set size of 1296 to just 360... two binary orders of magnitude!

Of course, I had to test the earlier scenarios again. I couldn't see any reason why they'd differ from past results in efficacy, but as always, it's worth the effort to test it out. As I suspected, adding in all possible permutations once again increased the average solution length. It wasn't surprising, but I tested it anyway to be sure. I also switched to BGOR instead of BGOO, because BGOO no longer makes sense, if no duplicates are allowed. Still, 0.3 increase in average solution length. Not good. 

Moved back to remaining over all, BGOR, no random pick, achieved the same 4.081 result as the last time. The maximum solution length is back to 6 with the newly-constrained dataset, but I wonder if I could have gotten a maximum of 5, somehow? I didn't find a way to do that, unfortunately. 

After experimenting with it even more, I found 6 optimal starting moves, which minimize the average score length:

```OYGP OPGY RYOG YRGO PYGO PYGR```

These six starting moves end up having a frequency distribution as follows:

```
  "PYGO": {
    "average": 4.061111111111111,
    "frequencies": {
      "1": 1,
      "2": 10,
      "3": 62,
      "4": 182,
      "5": 103,
      "6": 2
    }
  },
```

Because this is the lowest average and contains the fewest number of 6's, I've chosen to use one of these 6 as the starting move. In fact I chose `PYGO`, randomly.

At the end of the day, I'm happy to say I've exhausted all of my ideas for optimizing this problem. The average case is minimized to the best of my abilities. I'm a little worried that going up to a maximum of 6 guesses will eventually be my downfall, but I suppose that's a risk I have to take. The input data is essentially random to me, and going by the numbers, the current version of this algorithm minimizes the solution length on random data. 


