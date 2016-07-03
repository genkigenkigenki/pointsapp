var Promise = require('bluebird'),
    _       = require('lodash');

function CacheManager() {
    this.cache = {
        data: {},
        template: {}
    };
    this.temp = {};
}

CacheManager.prototype.check = function(resource, routeName) {
    var id = _getID(routeName, resource.params, resource.key),
        cacheEntry;
    if (resource.refresh) return {
        status: false,
        data: false
    };
    else {
        cacheEntry = this.cache[resource.type][id];
        if (!cacheEntry) {
            this.temp[id] = {
                type: resource.type
            };
            return {
                status: false,
                data: id
            };
        }
        else return {
            status: true,
            data: _.cloneDeep(this.cache[resource.type][id])
        }
    }
};

function _getID(key, params, resKey) {
    if (params) {
        for (var i = 0; i < params.length; ++i) {
            key += params[i].name + params[i].data;
        }
    }
    if (resKey) {
        key += resKey;
    }
    return key;
}

CacheManager.prototype.set = function(id, data) {
    var temp = this.temp[id];
    delete this.temp[id];
    this.cache[temp.type][id] = _.cloneDeep(data);
};

//data

module.exports = CacheManager;