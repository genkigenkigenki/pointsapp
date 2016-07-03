var StateMachine    = require('../../src/utils/StateMachine.js'),
    Promise         = require('bluebird');

describe("StateMachine", function() {

    it("should have all 4 values", function(done) {

        var stateMachine = new StateMachine(['a', 'b']);
        var testArray = [];
        var c = 0;

        stateMachine.registerChangeFunc('a', 'out', function() {
            testArray.push(0);
        });

        stateMachine.registerChangeFunc('a', 'out', function() {
            //return new Promise(function(resolve, reject) {
            //    testArray.push(1);
            //    resolve();
            //});
            testArray.push(1);
        });

        stateMachine.registerChangeFunc('b', 'in', function() {
            testArray.push(2);
        });

        stateMachine.registerChangeFunc('b', 'in', function() {
            return new Promise(function(resolve, reject) {
                testArray.push(3);
                resolve();
            });
        });

        stateMachine.changeState('b')
            .then(function() {
                c = 1;
            });
        setTimeout(function() {
            expect(testArray.pop()).toBe(3);
            expect(testArray.pop()).toBe(2);
            expect(testArray.pop()).toBe(1);
            expect(testArray.pop()).toBe(0);
            expect(c).toBe(1);
            done();
        }, 30);
    });
});