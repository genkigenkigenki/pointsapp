var viewportChecker = require('../../src/utils/viewportChecker.js'),
    config          = require('../../src/config/myte.js');

describe("Viewports as shown in config.js viewportCheck", function() {

    it("should be mobile", function() {
        expect(viewportChecker.testParseConfig(config.viewportChecks, {
            width: 200,
            height: 1000
        })).toEqual('mobile');
    });

    it("should be mobileLandscape", function() {
        expect(viewportChecker.testParseConfig(config.viewportChecks, {
            width: 1000,
            height: 200
        })).toEqual('mobileLandscape');
    });

    it("should be narrow", function() {
        expect(viewportChecker.testParseConfig(config.viewportChecks, {
            width: 700,
            height: 1000
        })).toEqual('narrow');
    });

    it("should be default", function() {
        expect(viewportChecker.testParseConfig(config.viewportChecks, {
            width: 740,
            height: 1000
        })).toEqual('default');
    });

    it("should be wide", function() {
        expect(viewportChecker.testParseConfig(config.viewportChecks, {
            width: 1040,
            height: 1000
        })).toEqual('wide');
    });
});