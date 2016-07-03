var _ = require('lodash');

function getViewport(config) {
    if (!config) throw new Error('viewportChecker requires config to be provided.');
    var width   = document.documentElement.clientWidth,
        height  = document.documentElement.clientHeight; // layout viewport
    return _parseConfig(config, {
        width: width,
        height: height
    });
}

function _parseConfig(config, params) {
    var bool,
        result;
    switch (config.operator) {
        case '<':
            bool = params[config.param] < config.value;
            break;
        case '>':
            bool = params[config.param] > config.value;
            break;
        default:
            throw new Error('viewportChecker provided with unhandled operator.');
    }
    result = bool ? config.valid : config.invalid;
    if (_.isString(result)) return result;
    else return _parseConfig(result, params);
}

module.exports.getViewport = getViewport;
module.exports.testParseConfig = _parseConfig;