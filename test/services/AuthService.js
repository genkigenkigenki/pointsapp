var AuthService = require('../../src/services/AuthService'),
    config      = require('../../src/config/myte'),
    cookieUtil  = require('../../src/utils/cookieUtil'),
    Backend     = require('../../src/services/XMLHTTP'),
    Promise     = require('bluebird'),
    _           = require('lodash');

var backend = new Backend(config.backendUrl, config.auth.params);
var authService = new AuthService(config.auth, backend);

describe("Testing AuthService", function() {

    var authData = {};
    _.forEach(config.auth.params, function(data) {
        authData[data.name] = Math.random().toString(36).substring(7);
    });

    _.forEach(config.auth.params, function(data) {
        cookieUtil.delete(data.name);
    });

    backend.send = function(url, data) {
        return new Promise(function(resolve, reject) {
            resolve(authData);
        });
    };

    it("should authenticate", function(done) {
        authService.authenticate()
            .then(function() {
                _.forEach(authData, function(data, name) {
                    expect(cookieUtil.get(name)).toBe(data);
                });
                done();
            })
            .catch(function() {
                done();
            });
    });

    it("should have populated the backend", function() {
        _.forEach(backend.creds, function(cred, name) {
            expect(cred.data).toBe(authData[name]);
        });
    });

    var hadCreds = false;
    _.forEach(backend.creds, function(cred, name) {
        cred.data = '';
    });

    it("should have cookies", function(done) {
        authService.hasStoredCreds()
            .then(function() {
                hadCreds = true;
                expect(hadCreds).toBe(true);
                done();
            })
            .catch(function() {
                expect(hadCreds).toBe(true);
                done();
            });
    });

    it("should have populated the backend", function() {
        _.forEach(backend.creds, function(cred, name) {
            expect(cred.data).toBe(authData[name]);
        });
    });
});