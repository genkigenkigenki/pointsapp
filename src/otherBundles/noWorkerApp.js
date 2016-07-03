'use strict';

var FamousEngine                = require('jokismo_engine_fork/core/FamousEngine'),
    RouteManager                = require('../services/RouteManager'),
    ResourceManager             = require('../services/ResourceManager'),
    AuthService                 = require('../services/AuthService'),
    Backend                     = require('../services/XMLHTTP'),
    viewportChecker             = require('../utils/viewportChecker'),
    config                      = require('../config/myte'),
    Promise                     = require('bluebird'),
    _                           = require('lodash'),
    browserType                 = require('../utils/detectVendorPrefix'),
    isMobile                    = require('../utils/isMobile'),
    attachFastClick             = require('fastclick'),
    globalStore         = require('../utils/globalStore'),
    components          = require('../components/load'),
    DOMElement          = require('jokismo_engine_fork/dom-renderables/DOMElement'),
    WorkerEventManager  = require('../services/WorkerEventManager'),
    UIEventManager      = require('../services/UIEventManager'),
    RenderManager       = require('../services/RenderManager'),
    DOMRequest          = require('../utils/DOMAccess/request'),
    Node                = require('jokismo_engine_fork/core/Node'),
    getEventReceiver    = require('../utils/getEventReceiver'),
    zDivs               = [],
    scene,
    eventRoot,
    renderer,
    UIManager,
    app;

require('../utils/focusInOutFFPolyfill');
require('../utils/modifyStringPrototype');
require('../utils/modifyNode');
require('observe-js');
attachFastClick(document.body);
window.addEventListener('touchmove', function(e) {
    e.preventDefault();
}, true);
window.addEventListener('mousemove', function(e) {
    var target = e.target || e.srcElement;
    if (target.classList && !target.classList.contains('selectable')) e.preventDefault();
}, true);
FamousEngine.init();
scene = FamousEngine.createScene();
eventRoot = scene.addChild();
//window.addEventListener('mousedown', function(e) {
//    var target = e.target || e.srcElement;
//    if (!target.classList.contains('selectable')) e.preventDefault();
//}, true);
//window.addEventListener('touchstart', function(e) {
//    var target = e.target || e.srcElement;
//    if (!target.classList.contains('selectable')) e.preventDefault();
//}, true);

var clock = FamousEngine.getClock();
//function _log() {
//    console.log('p');
//    clock.setTimeout(_log, 1);
//}

function _load() {
    this.renderer = new RenderManager(eventRoot);
    this.UIManager = new UIEventManager(eventRoot, this.renderer);
    globalStore.init(config.globalStoreDefaults);
    globalStore.set('browserType', browserType);
    globalStore.set('isMobile', isMobile);
    initRootInteractionEventHandling();
    listenToWindowSize();
    initRenderSizeManager();
    globalStore.set('registerRootZDiv', handleRootZDiv);
    _pipeEvents.call(this);
    _getMainTemplate.call(this);
    _getGlobalData.call(this);
    _watchResizeTriggerViewportChange.call(this);
    this.routeManager.start();
    _loadComplete();
}

function _getMainTemplate() {
    //get language
    var lang = 'JP';
    this.currentViewport = viewportChecker.getViewport(config.viewportChecks);
    this.routeManager.parseHash(config.mainTemplateUrl + '/' + lang); // + /language
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

function _watchResizeTriggerViewportChange() {
    window.addEventListener('resize', function() {
        //get language
        var lang = 'JP';
        var viewport = viewportChecker.getViewport(config.viewportChecks);
        if (this.currentViewport !== viewport) {
            this.currentViewport = viewport;
            this.routeManager.parseHash(config.mainTemplateUrl + '/' + lang);
            this.routeManager.reload();
        }
    }.bind(this));
}

function _loadComplete() {
    clearBodyStyling();
}

function clearBodyStyling() {
    document.body.style.background = config.styling.bodyBackground;
}

function _initializeServices() {
    this.backend = new Backend(config.backendUrls, config.auth.params);
    this.authService = new AuthService(config.auth, this.backend);
    this.resourceManager = new ResourceManager(this.backend);
    return this.backend.send(config.routesPath)
        .then(function(routes) {
            this.routeManager = new RouteManager(this.authService, this.resourceManager, routes,
                viewportChecker.getViewport.bind(null, config.viewportChecks));
        }.bind(this))
        .catch(function() {
            throw new Error('Failed to load routes.');
        });
}

function _pipeEvents() {
    _.forEach(this.routeManager.events.types, function(type) {
        this.routeManager.events.on(type, function(data) {
            this.UIManager[type](data);
        }.bind(this));
    }.bind(this));
}

function App() {
    this.currentViewport = '';
    _initializeServices.call(this)
        .then(_load.bind(this));
}

function handleRootZDiv(zDiv) {
    zDivs.push({
        obj: zDiv,
        key: 'contentNode'
    });
    zDiv.contentNode.setAbsoluteSize(globalStore.get('windowWidth'), globalStore.get('windowHeight'));
}

new ZRenderer({
    createNode: function() {
        return new Node()
            .setAlign(0, 1, 0)
            .setMountPoint(0, 1, 0);
    },
    renderFuncID: 'showSnackBar',
    component: components.SnackBar
});

new ZRenderer({
    createNode: function() {
        return new Node();
    },
    renderFuncID: 'showLightbox',
    component: components.Lightbox
});

new ZRenderer({
    createNode: function(options) {
        var position = options.position,
            node = new Node();
        if (position) node.setPosition(position[0], position[1], position[2]);
        return node;
    },
    renderFuncID: 'showMenu',
    component: components.Menu,
    z: 450
});

function ZRenderer(options) {
    this._zNode = null;
    this._z = options.z || 500;
    zDivs.push({
        obj: this,
        key: '_zNode'
    });
    this._createNode = options.createNode;
    this._componentObj = options.component;
    globalStore.set(options.renderFuncID, zRender.bind(this));
}

function zRender(options) {
    var node = this._createNode(options),
        component = new this._componentObj(node, options);
    this._zNode = new components.ZDiv(eventRoot.addChild(), {
        z: this._z,
        noResize: true
    }).contentNode;
    this._zNode.setAbsoluteSize(globalStore.get('windowWidth'), globalStore.get('windowHeight'));
    options.dismountFunc = this.remove.bind(this);
    this._zNode.addChild(node);
    return component;
}

ZRenderer.prototype.remove = function zRemove() {
    if (this._zNode.isMounted()) this._zNode.dismount();
    this._zNode = null;
};

function listenToWindowSize() {
    var events = globalStore.get('uiEvents').resize,
        i,
        zDiv;
    eventRoot.addComponent({
        onSizeChange: function(x, y){
            _.forEach(events, function(val) {
                val(x, y);
            });
        }
    });
    globalStore.registerGlobalEventCallback('ui', 'resize', function(x, y) {
        for (i = 0; i < zDivs.length; ++i) {
            zDiv = zDivs[i];
            if (zDiv.obj[zDiv.key]) {
                zDiv.obj[zDiv.key].setAbsoluteSize(x, y);
            }
        }
        globalStore.set('windowWidth', x);
        globalStore.set('windowHeight', y);
    });
}

function initRenderSizeManager() {
    globalStore.set('renderSizeManager', new components.RenderSizeManager({
        node: eventRoot
    }));
}

var touchEventCallbackID,
    mouseEventCallbackID;

function initRootInteractionEventHandling() {
    var events = globalStore.get('interactionEvents'),
        registeredEvents = Object.keys(events),
        type;
    new DOMElement(eventRoot);
    for (var i = 0; i < registeredEvents.length; ++i) {
        type = registeredEvents[i];
        eventRoot.addUIEvent(type);
        eventRoot.addComponent(getEventReceiver({
            eventName: type,
            callback: (function(theType) {
                return function(data) {
                    _.forEach(events[theType], function(val) {
                        val(data);
                    });
                }
            })(type)
        }));
    }
    globalStore.registerGlobalEventCallback('interaction', 'click', function(e) {
        console.log('clicked');
    });
    touchEventCallbackID = globalStore.registerGlobalEventCallback('interaction', 'touchstart', function() {
        globalStore.set('hasTouch', true);
        globalStore.deRegisterGlobalEvent('interaction', 'touchstart', touchEventCallbackID);
    });
    mouseEventCallbackID = globalStore.registerGlobalEventCallback('interaction', 'mousemove', function() {
        if (!( globalStore.get('isMobile') && globalStore.get('hasTouch') )) globalStore.set('hasMouse', true);
        globalStore.deRegisterGlobalEvent('interaction', 'mousemove', mouseEventCallbackID);
    });
}

app = new App();