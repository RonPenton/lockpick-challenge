import * as chai from 'chai';
var expect = chai.expect;

import * as picker from '../dist/lib';

describe('integration tests', () => {
    it('should compare scores properly', () => {
        const score1 = { white: 0, black: 2 };
        const score2 = { white: 3, black: 1 };
        const score3 = { white: 2, black: 2 };
        const score4 = { white: 2, black: 0 };
        const score5 = { white: 0, black: 2 };

        expect(picker.scoreEquals(score1, score1)).to.equal(true);
        expect(picker.scoreEquals(score1, score2)).to.equal(false);
        expect(picker.scoreEquals(score2, score2)).to.equal(true);

        expect(picker.scoreEquals(score3, score4)).to.equal(false);
        expect(picker.scoreEquals(score3, score5)).to.equal(false);
    });

    it('should compute scores properly', () => {
        expect(picker.scoreEquals(
            picker.calculateScore("BBGG", "GOYP"),
            { white: 1, black: 0 }
        )).to.equal(true);
        expect(picker.scoreEquals(
            picker.calculateScore("BBGG", "GGYP"),
            { white: 2, black: 0 }
        )).to.equal(true);
        expect(picker.scoreEquals(
            picker.calculateScore("BBGG", "BBGG"),
            { white: 0, black: 4 }
        )).to.equal(true);
        expect(picker.scoreEquals(
            picker.calculateScore("GOYP", "BBGG"),
            { white: 1, black: 0 }
        )).to.equal(true);
        expect(picker.scoreEquals(
            picker.calculateScore("GOYP", "GBYG"),
            { white: 0, black: 2 }
        )).to.equal(true);
        expect(picker.scoreEquals(
            picker.calculateScore("BPBP", "YGYG"),
            { white: 0, black: 0 }
        )).to.equal(true);
        expect(picker.scoreEquals(
            picker.calculateScore("BPYG", "GPYB"),
            { white: 2, black: 2 }
        )).to.equal(true);
        expect(picker.scoreEquals(
            picker.calculateScore("OPYG", "GPYB"),
            { white: 1, black: 2 }
        )).to.equal(true);
    });

});
