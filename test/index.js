"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai = require("chai");
var expect = chai.expect;
var picker = require("../dist/lib");
describe('integration tests', function () {
    it('should compare scores properly', function () {
        var score1 = { white: 0, black: 2 };
        var score2 = { white: 3, black: 1 };
        var score3 = { white: 2, black: 2 };
        var score4 = { white: 2, black: 0 };
        var score5 = { white: 0, black: 2 };
        expect(picker.scoreEquals(score1, score1)).to.equal(true);
        expect(picker.scoreEquals(score1, score2)).to.equal(false);
        expect(picker.scoreEquals(score2, score2)).to.equal(true);
        expect(picker.scoreEquals(score3, score4)).to.equal(false);
        expect(picker.scoreEquals(score3, score5)).to.equal(false);
    });
    it('should compare scores properly', function () {
        expect(picker.scoreEquals(picker.calculateScore("BBGG", "GOYP"), { white: 1, black: 0 })).to.equal(true);
        expect(picker.scoreEquals(picker.calculateScore("BBGG", "GGYP"), { white: 2, black: 0 })).to.equal(true);
        expect(picker.scoreEquals(picker.calculateScore("BBGG", "BBGG"), { white: 0, black: 4 })).to.equal(true);
        expect(picker.scoreEquals(picker.calculateScore("GOYP", "BBGG"), { white: 1, black: 0 })).to.equal(true);
        expect(picker.scoreEquals(picker.calculateScore("GOYP", "GBYG"), { white: 0, black: 2 })).to.equal(true);
        expect(picker.scoreEquals(picker.calculateScore("BPBP", "YGYG"), { white: 0, black: 0 })).to.equal(true);
        expect(picker.scoreEquals(picker.calculateScore("BPYG", "GPYB"), { white: 2, black: 2 })).to.equal(true);
        expect(picker.scoreEquals(picker.calculateScore("OPYG", "GPYB"), { white: 1, black: 2 })).to.equal(true);
    });
});
