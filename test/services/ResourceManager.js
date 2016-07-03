var ResourceManager = require('../../src/services/ResourceManager'),
    Promise         = require('bluebird');

var url = '';
var resourceManager = new ResourceManager({
    send: function(u) {
        url = u;
        return new Promise(function(resolve, reject) {
            resolve(1000);
        });
    }
});

describe("Testing ResourceManager", function() {

    var value;

    it("should cache test url", function(done) {
        resourceManager.loadResource({
            type: 'template',
            url: 'test'
        }).then(function(data) {
            value = data;
        });
        setTimeout(function() {
            expect(resourceManager.cache.template.test).toBeDefined();
            expect(resourceManager.cache.template.test.params[0]).toEqual(null);
            expect(value).toBe(1000);
            done();
        }, 30);
    });

    it("should get cache", function(done) {
        value = resourceManager.loadResource({
            type: 'template',
            url: 'test'
        });
        setTimeout(function() {
            expect(value).toBe('cached');
            expect(url).toBe('test');
            done();
        }, 30);
    });

    it("should set params", function(done) {
        var params = [
            {
                name: 'a',
                data: 'b'
            }
        ];
        resourceManager.loadResource({
            type: 'template',
            url: 'test',
            params: params
        }).then(function(data) {
            value = data;
        });
        setTimeout(function() {
            expect(url).toBe('test?a=b');
            expect(resourceManager.cache.template.test.params[1]).toBe(params);
            expect(value).toBe(1000);
            done();
        }, 30);
    });

    it("should get cache", function(done) {
        var params = [
            {
                name: 'a',
                data: 'b'
            }
        ];
        value = resourceManager.loadResource({
            type: 'template',
            url: 'test',
            params: params
        });
        setTimeout(function() {
            expect(value).toBe('cached');
            done();
        }, 30);
    });
});