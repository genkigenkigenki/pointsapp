var Cookie = require('../../src/utils/cookieUtil.js');

describe("Cookie", function() {

    it("should set and get cookie", function() {
        var random = Math.random();
        Cookie.set('test', random, 1);
        expect(parseFloat(Cookie.get('test'))).toEqual(random);
    });

    it("should set and get cookie with no days", function() {
        var random = Math.random();
        Cookie.set('test', random);
        expect(parseFloat(Cookie.get('test'))).toEqual(random);
    });

    it("should delete cookie", function() {
        var random = Math.random();
        Cookie.set('test', random, 1);
        Cookie.delete('test');
        expect(Cookie.get('test')).toBe(null);
    });
});