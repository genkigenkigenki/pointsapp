var Promise = require('bluebird'),
    _       = require('lodash');

function loadResource(data) {
    var dataObj;
    if (this.testData) return(this.testData);
    else if (_isCached.call(this, data)) return 'cached';
    else if (data.static) {
        return {
            data: data.static,
            key: data.key || ''
        };
    }
    else return this.backend.send(_appendUrlParams(data))
            .then(function(returnData) {
                if (!data.refresh) {
                    if (!this.cache[data.type][data.url]) this.cache[data.type][data.url] = {
                        params: []
                    };
                    this.cache[data.type][data.url].params.push(data.params || null);
                }
                if (data.type === 'template') {
                    returnData.templateID = _getID(returnData.key, data.params);
                    return returnData;
                } else {
                    dataObj = {
                        data: returnData
                    };
                    if (data.global) dataObj.global = true;
                    if (data.key) dataObj.key = data.key;
                    return dataObj;
                }
            }.bind(this));
}

function _getID(key, params) {
    if (params) {
        for (var i = 0; i < params.length; ++i) {
            key += params[i].name + params[i].data;
        }
    }
    return key;
}

function _appendUrlParams(data) {
    var url = data.url.url;
    if (data.params) {
        url += '?';
        _.forEach(data.params, function(param) {
            url += param.name + '=' + param.data + '&';
        });
        url = url.substring(0, url.length - 1);
    }
    data.url.url = url;
    return data.url;
}

function _isCached(resource) {
    var cacheEntry = null;
    if (resource.refresh) return false;
    else {
        cacheEntry = this.cache[resource.type][resource.url.url];
        if (!cacheEntry) return false;
        else {
            if (!resource.params) resource.params = null;
            for (var i = 0; i < cacheEntry.params.length; ++i) {
                if (_.isEqual(cacheEntry.params[i], resource.params)) return true;
            }
        }
    }
    return false;
}

function ResourceManager(backend) {
    this.backend = backend;
    this.cache = {
        data: {},
        template: {}
    };
}
ResourceManager.prototype.loadResource = loadResource;

module.exports = ResourceManager;