var crossroads      = require('crossroads'),
    EventEmitter    = require('../utils/EventEmitter'),
    analytics       = require('../services/analytics'),
    Promise         = require('bluebird'),
    _               = require('lodash'),
    History         = window.History;

function _handleHash(newHash, oldHash) {
    console.log(newHash);
    this.currentHash = newHash;
    this.parseHash(newHash);
}

function _setRoutes(routes) {
    _.forEach(routes, _register.bind(this));
}

function _register(config, routeName) {
    crossroads.addRoute(routeName, _parseRouteConfig.call(this, config, routeName));
}

function _parseRouteConfig(config, route) {
    return function() {
        if (this.hashBeforeAuthDenial) {
            var hash = this.hashBeforeAuthDenial;
            this.hashBeforeAuthDenial = '';
            History.pushState(null, '', hash);
        }
        else {
            var urlParams   = Array.prototype.slice.call(arguments, 0),
                resources   = [],
                routeName   = route.split('/')[0],
                eventId     = ++this.events.id,
                newRouteObj;
            _retrieveCreds.call(this, config)
                .then(function() {
                    if (config.resources) resources = _getResourceRequests.call(this, config.resources, urlParams);
                    return resources;
                }.bind(this))
                .then(function(res) {
                    if (routeName !== 'resetParse') {
                        newRouteObj = {
                            id: eventId,
                            mainTemplate: !!config.mainTemplate,
                            route: routeName,
                            resources: res
                        };
                        if (config.sendParams) {
                            newRouteObj.sendParams = _getParams(config.sendParams, urlParams);
                        }
                        this.events.emit('newRoute', newRouteObj);
                    }
                    return res;
                }.bind(this))
                .then(_checkResourceManager.bind(this, config))
                .then(function(data) {
                    if (routeName !== 'resetParse') {
                        this.events.emit('routeData', {
                            id: eventId,
                            data: data
                        });
                    }
                }.bind(this))
                .catch(function(err) {
                    if (routeName !== 'resetParse') {
                        this.events.emit('routeCancelled', {
                            id: eventId,
                            reason: err.message
                        });
                    }
                }.bind(this));
        }
    }.bind(this);
}

function _getParams(arr, urlParams) {
    var returnArr = [];
    for (var i = 0; i < arr.length; ++i) {
        if (!_.isUndefined(urlParams[arr[i]])) returnArr.push(urlParams[arr[i]]);
    }
    return returnArr;
}

function _getResourceRequests(config, urlParams) {
    return _.reduce(config, function(arr, conf) {
        arr.push(_getResourceRequest.call(this, conf, urlParams));
        return arr;
    }.bind(this), []);
}

function _getResourceRequest(conf, urlParams) {
    var request,
        urlAppend,
        viewport,
        config = _.cloneDeep(conf);
    if (config.params && config.params.required) {
        _.forEach(config.params.required, function(ind) {
            if (_.isUndefined(urlParams[ind])) throw new Error('Required request param was missing.');
        });
    }
    request = {
        type: config.type,
        url: config.url ? config.ver ? config.url + '_' + config.ver : config.url : '',
        static: config.static ? config.static : '',
        refresh: !!config.refresh,
        key: config.key,
        global: !!config.global,
        componentID: !!config.componentID,
        params: config.params ? _.reduce(config.params.indices, function(arr, ind) {
            if (!_.isUndefined(urlParams[ind.index])) {
                arr.push({
                    name: ind.name,
                    data: urlParams[ind.index]
                });
            }
            return arr;
        }, []) : null
    };
    if (request.type === 'template') {
        viewport = this.getViewport();
        if (!request.params) request.params = [];
        request.params.push({
            name: 'viewport',
            data: viewport
        });
        if (!urlParams) urlParams = [];
        urlParams.push(viewport);
    }
    if (config.appendURL) {
        urlAppend = [];
        for (var i = 0; i < config.appendURL.length; ++i) {
            if (!_.isUndefined(urlParams[config.appendURL[i]])) {
                urlAppend.push(urlParams[config.appendURL[i]]);
            }
        }
        config.url.url = config.url.url.format.apply(config.url.url, urlAppend);
    }
    return request;
}

function _checkResourceManager(config, resources) {
    if (resources.length === 0) return resources;
    else return Promise.all(_.reduce(resources, function(arr, resource) {
        arr.push(this.resourceManager.loadResource(resource));
        return arr;
    }.bind(this), []))
        .catch(function(e) {
            _noAuthRedirect.call(this, config.auth.redirect);
            throw new Error(e);
        }.bind(this));
}

function _retrieveCreds(config) {
    return new Promise(function(resolve, reject) {
        if (config.auth && config.auth.req) {
            return this.authService.hasStoredCreds()
                .then(resolve)
                .catch(function() {
                    _noAuthRedirect.call(this, config.auth.redirect);
                    reject('Cancel Route Loading.');
                }.bind(this));
        } else {
            resolve();
        }
    }.bind(this));
}

function _noAuthRedirect(redirect) {
    //this.hashBeforeAuthDenial = History.getState().hash.substring(3);
    History.pushState(null, '', '/' + this.lang + '/' + redirect);
}

function parseHistory() {
    var State = History.getState(),
        lang;
    if (State.hash && !this._halt) {
        lang = State.hash.substring(1, 3);
        if (lang !== this.lang) {
            this.reloadLang(lang);
            return;
        }
        _handleHash.call(this, State.hash.substring(3));
    }
}

function RouteManager(authService, resourceManager, routes, getViewport, homePath) {
    if (!resourceManager) throw new Error('RouteManager initialized with no Resource Manager.');
    this.events = new EventEmitter();
    this.homePath = homePath;
    this.events.id = 0;
    this.events.types = ['newRoute', 'routeData', 'routeCancelled'];
    this.currentHash = '';
    this.hashBeforeAuthDenial = '';
    this.authService = authService ? authService : null;
    this.resourceManager = resourceManager;
    this.getViewport = getViewport;
    this.preRouteFuncs = [];
    _setRoutes.call(this, routes);
}

RouteManager.prototype.addGlobalPreRoute = function(func) {
    this.preRouteFuncs.push(func);
};

RouteManager.prototype.start = function start(lang, searchManager) {
    var hash = window.location.pathname;
    this.lang = lang;
    if (window.location.search && searchManager) {
        searchManager.handleString(window.location.search);
    }
    crossroads.ignoreState = false;
    if (hash === '/') hash += lang + this.homePath;
    History.pushState(null, '', hash);
    History.Adapter.bind(window, 'statechange', parseHistory.bind(this));
    _handleHash.call(this, hash.substring(3));
};

RouteManager.prototype.routeHash = function(hash) {
    History.pushState(null, '', '/' + this.lang + hash);
    this.parseHash(hash);
};

RouteManager.prototype.parseHash = function _parseHash(hash) {
    for (var i = 0; i < this.preRouteFuncs.length; ++i) {
        this.preRouteFuncs[i]();
    }
    crossroads.parse(hash ? hash : this.currentHash);
    if (this.lang) {
        analytics.page('/' + this.lang + hash);
    }
    crossroads.parse('resetParse');
};

RouteManager.prototype.reload = function _reloadRoute() {
    this.parseHash(this.currentHash);
};

RouteManager.prototype.halt = function() {
    this._halt = true;
};

RouteManager.prototype.reloadLang = function(lang) {
    var path = History.getState().hash;
    path = '/' + lang + path.substring(3);
    this.halt();
    History.pushState(null, '', path);
    document.location.reload();
};

module.exports = RouteManager;