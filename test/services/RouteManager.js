var AuthService     = require('../../src/services/AuthService'),
    Router          = require('../../src/services/RouteManager'),
    ResourceManager = require('../../src/services/ResourceManager'),
    config          = require('../../src/config/myte'),
    cookieUtil      = require('../../src/utils/cookieUtil'),
    viewportChecker = require('../../src/utils/viewportChecker'),
    Backend         = require('../../src/services/XMLHTTP'),
    Promise         = require('bluebird'),
    _               = require('lodash');

var backend = new Backend(config.backendUrl, config.auth.params);
var authService = new AuthService(config.auth, backend);
var resourceManager = new ResourceManager();
var router;
var authData = {};

describe("Testing RouteManager", function() {

    var cancelled = false;
    var eventData = null;
    var ids = {};

    beforeAll(function(done) {
        _.forEach(config.auth.params, function(data) {
            authData[data.name] = Math.random().toString(36).substring(7);
        });

        _.forEach(config.auth.params, function(data) {
            cookieUtil.delete(data.name);
        });
        backend.send('base/src/json/routes.json')
            .then(function(data) {
                resourceManager.testData = 1000;
                router = new Router(authService, resourceManager, data,
                    viewportChecker.getViewport.bind(null, config.viewportChecks));
                router.events.on('routeCancelled', function(data) {
                    cancelled = true;
                    ids.cancelled = data.id;
                });
                router.events.on('routeData', function(data) {
                    eventData = data;
                    ids.data = data.id;
                });
                router.events.on('newRoute', function(data) {
                    eventData = data;
                    ids.new = data.id;
                });
                //router.start();
            })
            .catch(function() {return null;})
            .finally(function() {
                backend.send = function(url, data) {
                    return new Promise(function(resolve, reject) {
                        resolve(authData);
                    });
                };
                done();
            });
    });

    it("should fail due to lack of cookies", function(done) {
        router.parseHash('test');
        setTimeout(function() {
            expect(cancelled).toBe(true);
            cancelled = false;
            done();
        }, 30);
    });

    it("should succeed", function(done) {
        router.parseHash('login');
        setTimeout(function() {
            expect(cancelled).toBe(false);
            expect(ids.data).toBe(ids.new);
            done();
        }, 30);
    });

    it("should succeed", function(done) {
        authService.authenticate()
            .then(function() {})
            .catch(function() {})
            .finally(function() {
                router.parseHash('test/a/b');
                setTimeout(function() {
                    expect(ids.data).toBe(ids.new);
                    expect(eventData.data).toEqual([1000, 1000]);
                    console.log(ids);
                    eventData.data = null;
                    done();
                }, 30);
            });

    });

    it("should fail due to lack of required param", function(done) {
        router.parseHash('test/a');
        setTimeout(function() {
            expect(cancelled).toBe(true);
            expect(ids.cancelled).toBeGreaterThan(ids.new);
            done();
        }, 30);
    });
});