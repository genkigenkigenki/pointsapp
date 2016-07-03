'use strict';

var Compositor                  = require('jokismo_engine_fork/renderers/Compositor'),
    UIManager                   = require('jokismo_engine_fork/renderers/UIManager'),
    RequestAnimationFrameLoop   = require('jokismo_engine_fork/render-loops/RequestAnimationFrameLoop'),
    WorkerEventManager          = require('../services/WorkerEventManager'),
    RouteManager                = require('../services/RouteManager'),
    ResourceManager             = require('../services/ResourceManager'),
    AuthService                 = require('../services/AuthService'),
    Backend                     = require('../services/XMLHTTP'),
    analytics                   = require('../services/analytics'),
    viewportChecker             = require('../utils/viewportChecker'),
    DOMExecute                  = require('../utils/DOMAccess/execute'),
    moduleManager               = require('../utils/DOMAccess/moduleManager'),
    config                      = require('../config/cannect'),
    Promise                     = require('bluebird'),
    _                           = require('lodash'),
    browserType                 = require('../utils/detectVendorPrefix'),
    isMobile                    = require('../utils/isMobile'),
    cookie                      = require('../utils/cookieUtil'),
    attachFastClick             = require('fastclick'),
    userAgent                   = navigator.userAgent.toLowerCase(),
    app;

require('../utils/focusInOutFFPolyfill');
require('../utils/modifyStringPrototype');
require('../utils/addClassIDSelecting');
require('../utils/history');
attachFastClick(document.body);
//window.addEventListener('mousedown', function(e) {
//    var target = e.target || e.srcElement;
//    if (!target.classList.contains('selectable')) e.preventDefault();
//}, true);
//window.addEventListener('touchstart', function(e) {
//    var target = e.target || e.srcElement;
//    if (!target.classList.contains('selectable')) e.preventDefault();
//}, true);

setTimeout(function() {
    $$(document, '#famousRender')[0].classList.remove('bg-milton-yellow');
}, 5000);

function _load() {
    _loadWorker.call(this)
        .then(_loadComplete.bind(this));
}

function _loadWorker() {
    var moduleID;
    return new Promise(function(resolve) {
        this.famousWorker = new Worker(config.workerPath);
        this.workerEventManager = new WorkerEventManager(this.famousWorker);
        this.workerEventManager.sendMessage('initialData', {
            browserType: browserType,
            isAndroid: userAgent.indexOf('android') > -1,
            isMobile: isMobile,
            hasVisited: _checkIfHasVisited(),
            globalStoreDefaults: config.globalStoreDefaults
        });
        this.workerEventManager.register({
            type: 'message',
            func: resolve,
            signature: 'complete'
        });
        this.workerEventManager.register({
            type: 'message',
            func: this.routeManager.parseHash,
            signature: 'route'
        });
        this.workerEventManager.register({
            type: 'message',
            func: _handleHTTPRequests.bind(this),
            signature: 'HTTPRequest'
        });
        this.workerEventManager.register({
            type: 'message',
            func: analytics.event,
            signature: 'analyticsEvent'
        });
        this.workerEventManager.register({
            type: 'message',
            func: _getCaptcha.bind(this),
            signature: 'getCaptcha'
        });
        this.workerEventManager.register({
            type: 'message',
            func: _reloadLang.bind(this),
            signature: 'reloadLang'
        });
        this.workerEventManager.register({
            type: 'message',
            func: function(url) {
                window.location.href = url;
            },
            signature: 'redirect'
        });
        this.workerEventManager.register({
            type: 'message',
            func: function(bool) {
                this._killHrefs = bool;
            }.bind(this),
            signature: 'killHrefs'
        });
        DOMExecute.init(this.workerEventManager, this.backend, config.captcha.sitekey);
        _pipeEvents.call(this);
        new UIManager(this.famousWorker, new Compositor(), new RequestAnimationFrameLoop());
        moduleID = moduleManager.init({
            workerEventManager: this.workerEventManager,
            backend: this.backend
        });
        if (moduleID && config.id !== moduleID) throw new Error('moduleManager is improperly configured.');
        _getMainTemplate.call(this);
        _getGlobalData.call(this);
        _watchResizeTriggerViewportChange.call(this);
        this.authService.registerWorkerEventManager(this.workerEventManager);
        this.routeManager.start(this.lang,
            config.queryStringModule && moduleManager.modules[config.queryStringModule] || null);
    }.bind(this));
}

function _checkIfHasVisited() {
    var hasVisited = !!cookie.get('hasVisited');
    cookie.set('hasVisited', true);
    return hasVisited;
}

function _getCaptcha() {
    this.workerEventManager.sendMessage('gotCaptcha', this.backend.getCaptcha());
}

function _reloadLang(lang) {
    if (this.lang !== lang) {
        this.lang = lang;
        cookie.set('lang', lang);
        this.routeManager.reloadLang(lang);
    }
}

function _getMainTemplate() {
    this.currentViewport = viewportChecker.getViewport(config.viewportChecks);
    this.routeManager.parseHash(config.mainTemplateUrl);
}

function _getGlobalData() {
    var urls;
    if (config.globalDataUrls) {
        urls = config.globalDataUrls;
        for (var i = 0; i < config.globalDataUrls.length; ++i) {
            this.routeManager.parseHash(urls[i]);
        }
    }
}

function _handleHTTPRequests(data) {
    if (data.requestID === 'login') {
        this.authService.authenticate(data.data.email_address, data.data.password)
            .then(function() {
                this.workerEventManager.sendMessage('formData', {
                    formID: data.formID,
                    data: {
                        error: false,
                        data: 'success'
                    }
                })
            }.bind(this))
            .catch(function(returnData) {
                console.log(returnData);
                this.workerEventManager.sendMessage('formData', {
                    formID: data.formID,
                    data: {
                        error: true,
                        data: false
                    }
                })
            }.bind(this));
    } else {
        this.backend.send(config.requestEndpoints[data.requestID], data.data || null)
            .then(function(returnData) {
                this.workerEventManager.sendMessage('formData', {
                    formID: data.formID,
                    data: {
                        error: false,
                        data: returnData
                    }
                })
            }.bind(this))
            .catch(function(returnData) {
                this.workerEventManager.sendMessage('formData', {
                    formID: data.formID,
                    data: {
                        error: returnData.description,
                        data: returnData
                    }
                })
            }.bind(this));
    }

}

function _watchResizeTriggerViewportChange() {
    window.addEventListener('resize', function() {
        var viewport = viewportChecker.getViewport(config.viewportChecks);
        if (this.currentViewport !== viewport) {
            this.currentViewport = viewport;
            this.routeManager.parseHash(config.mainTemplateUrl);
            this.routeManager.reload();
        }
    }.bind(this));
}

function _loadComplete() {
    window.addEventListener('touchmove', function(e) {
        e.preventDefault();
    }, true);
    window.addEventListener('mousemove', function(e) {
        var target = e.target || e.srcElement;
        if (target.classList && !target.classList.contains('selectable')) e.preventDefault();
    }, true);
    document.body.addEventListener('click', function(e) {
        if (e.target.nodeName === 'A') {
            if (!this._killHrefs || (e.target.classList && e.target.classList.contains('href-kill-override'))) {
                if (e.target.classList && !e.target.classList.contains('external-link')) {
                    e.preventDefault();
                    History.pushState(null, '', e.target.getAttribute('href'));
                }
            } else e.preventDefault();
        }
    }.bind(this));
    clearBodyStyling();
}

function clearBodyStyling() {
    document.body.style.background = config.styling.bodyBackground;
}

function _initializeServices() {
    this.backend = new Backend(config.backendUrls, config.auth.params, config.captcha.reset);
    this.authService = new AuthService(config.auth, this.backend);
    this.resourceManager = new ResourceManager(this.backend);
    //this.backend.send(config.locatePath)
    //    .then(function(lang) {
    //        if (lang === 'en') {
    //            window.location.href = 'https://miltonmarkets.com/notavailable.html';
    //        }
    //    });
    //this.lang = _getUrlLang() || cookie.get('lang') || 'en';
    //if (!cookie.get('lang') && this.lang === 'en') {
    //    this.backend.send(config.locatePath)
    //        .then(function(lang) {
    //            if (lang !== 'en' && lang !== 'wl') {
    //                cookie.set('lang', lang);
    //                window.location.href = 'https://miltonmarkets.com';
    //            }
    //        });
    //}
    this.lang = 'en';
    cookie.set('lang', 'en');
    document.body.className += 'font-class-' + this.lang;
    config.routesPath.url = config.routesPath.url.format(this.lang);
    return this.backend.send(config.routesPath)
        .then(function(routes) {
            this.routeManager = new RouteManager(this.authService, this.resourceManager, routes,
                viewportChecker.getViewport.bind(null, config.viewportChecks), config.homePath);
            this.routeManager.addGlobalPreRoute(this.backend.clearCaptcha.bind(this.backend));
        }.bind(this))
        .catch(function() {
            throw new Error('Failed to load routes.');
        });
}

function _getUrlLang() {
    if (!window.location.pathname) return false;
    return window.location.pathname.substring(1, 3);
}

function _pipeEvents() {
    _.forEach(this.routeManager.events.types, function(type) {
        this.routeManager.events.on(type, function(data) {
            this.workerEventManager.sendMessage(type, data);
        }.bind(this));
    }.bind(this));
}

function App() {
    this.currentViewport = '';
    _initializeServices.call(this)
        .then(_load.bind(this));
}

app = new App();