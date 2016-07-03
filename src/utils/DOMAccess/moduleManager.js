var modules         = require('../../modules/cannect/load'),
    _               = require('lodash'),
    moduleManager   = {
        refs: null,
        init: init
    };

function init(refs) {
    moduleManager.refs = refs;
    moduleManager.modules = modules;
    _.forEach(modules, function(val) {
        if (!_.isString(val) && val.init) val.init(moduleManager.refs);
    });
    return modules.id || '';
}

module.exports = moduleManager;