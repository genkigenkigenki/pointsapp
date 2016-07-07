var _                   = require('lodash'),
    Promise             = require('bluebird'),
    globalStore         = require('../utils/globalStore'),
    validation          = require('../utils/validate'),
    EventEmitter        = require('../utils/EventEmitter'),
    DOMRequest          = require('../utils/DOMAccess/request'),
    components          = require('../components/load'),
    clock               = require('jokismo_engine_fork/core/FamousEngine').getClock(),
    Node                = require('jokismo_engine_fork/core/Node'),
    DOMElement          = require('jokismo_engine_fork/dom-renderables/DOMElement'),
    defaultComponents   = {
        DOMElement: DOMElement
    };

_.merge(components, defaultComponents);

function RenderManager(rootNode) {
    this._dataQueue = [];
    this._renderQueue = {};
    this._mountQueue = {};
    this._mainTemplateLoaded = false;
    this._nodeRefs = {
        rootNode: rootNode
    };
    this._mounted = {
        templateData: {},
        rootNodes: {}
    };
    this._componentRefs = {};
    this._events = new EventEmitter();
    var loop = new QueueLoop(rootNode, this);
    startLoop(loop);
}

function startLoop(loop) {
    if (globalStore.get('windowWidth')) loop.start();
    else clock.setTimeout(function() {
        startLoop(loop);
    }, 1);
}

RenderManager.prototype.pushToQueue = function(data) {
    _parseResources.call(this, data);
};

function QueueLoop(node, renderManager) {
    this._node = node;
    this._renderManager = renderManager;
    this._id = node.addComponent(this);
}

QueueLoop.prototype.start = function() {
    this._node.requestUpdate(this._id);
};

QueueLoop.prototype.onUpdate = function() {
    if (!globalStore.get('transitionActive')) {
        if (globalStore.get('isIdle')) {

        }
        _processRenderQueue.call(this._renderManager);
        _processDataQueue.call(this._renderManager);
        _processMountQueue.call(this._renderManager);
    }
    this._node.requestUpdate(this._id);
};

function _processMountQueue() {
    _.forEach(this._mountQueue, function(val, key) {
        if (globalStore.get('transitionActive')) return;
        if (_mountTemplate.call(this, val, key)) delete this._mountQueue[key];
    }.bind(this));
}

function _mountTemplate(val, key) {
    var event,
        currentTemplateID,
        loadingMainTemplate = val.rootNode === 'rootNode';
    if (this._currentMode) {
        if (val.mode !== this._currentMode) {
            return false;
        }
    }
    if (!loadingMainTemplate && !this._mainTemplateLoaded) {
        return false;
    }
    if (this._mounted.rootNodes['contentFull']) {
        globalStore.set('fullWidthShowing', false);
        currentTemplateID = this._mounted.rootNodes['contentFull'];
        _dismountTemplate.call(this, currentTemplateID);
        return false;
    }
    if (val.rootNode === 'contentFull') {
        if (this._mounted.rootNodes['content']) {
            currentTemplateID = this._mounted.rootNodes['content'];
            _dismountTemplate.call(this, currentTemplateID);
            return false;
        }
        globalStore.set('fullWidthShowing', true);
    }
    if (this._mounted.rootNodes[val.rootNode]) {
        currentTemplateID = this._mounted.rootNodes[val.rootNode];
        _dismountTemplate.call(this, currentTemplateID);
        return false;
    }
    if (val.title) {
        DOMRequest.send({
            type: 'title',
            value: val.title
        });
    }
    for (var i = 0; i < val.nodes.length; ++i) {
        this._nodeRefs[key].addChild(val.nodes[i]);
    }
    if (val.events) {
        for (i = 0; i < val.events.length; ++i) {
            event = val.events[i];
            switch (event.type) {
                case 'func':
                    if (event.componentID) {
                        if (val.componentRefs[event.componentID]) val.componentRefs[event.componentID][event.key]();
                    }
                    break;
                default:
                    break;
            }
        }
    }
    if (loadingMainTemplate) {
        this._mainTemplateLoaded = true;
    }
    if (val.transition && val.transition.in) {
        _processTransition.call(this, val.transition.in, val.componentRefs);
    }
    this._mounted.templateData[val.templateID] = val;
    this._mounted.rootNodes[val.rootNode] = val.templateID;
    return true;
}

function _dismountTemplate(templateID, noTransition) {
    var template = this._mounted.templateData[templateID],
        transition = template.transition && template.transition.out || [];
    delete this._mounted.rootNodes[template.rootNode];
    if (!noTransition) {
        transition.push(_cleanup.bind(this, templateID));
        _processTransition.call(this, transition, template.componentRefs);
    } else _cleanup.call(this, templateID);
}

function _cleanup(templateID) {
    var templateData = this._mounted.templateData[templateID];
    if (templateData.componentRefs) {
        _.forEach(templateData.componentRefs, function(comp) {
            if (comp.cleanup) comp.cleanup();
        });
    }
    if (templateData.nodes) {
        for (var i = 0; i < templateData.nodes.length; ++i) {
            try {
                templateData.nodes[i].dismount();
            } catch (e) {
                console.log('Dismount attempt denied. All your bases are belong to us.');
            }
        }
    }
    if (templateData.zDivs) {
        for (i = 0; i < templateData.zDivs.length; ++i) {
            try {
                templateData.zDivs[i].dismount();
            } catch (e) {
                console.log('Dismount attempt denied. All your bases are belong to us.');
            }
        }
    }
    if (templateData.dataEvents) {
        for (i = 0; i < templateData.dataEvents.length; ++i) {
            this._events.removeListener(templateData.dataEvents[i].id, templateData.dataEvents[i].callback);
        }
    }
    delete this._mounted.templateData[templateID];
}

function _processTransition(transitions, componentRefs) {
    var transition,
        promise;
    for (var i = 0; i < transitions.length; ++i) {
        transition = transitions[i];
        if (i === 0) promise = _getFunc(transition, componentRefs)();
        else promise = promise.then(!_.isFunction(transition) ? _getFunc(transition, componentRefs) : transition);
    }
}

function _getFunc(transition, componentRefs) {
    var promises = [],
        trans;
    if (_.isArray(transition)) {
        return function() {
            for (var i = 0; i < transition.length; ++i) {
                trans = transition[i];
                if (trans.transitionLock) {
                    promises.push(function() {
                        var id = globalStore.setTransition();
                        return componentRefs[trans.componentID][transition.funcName](trans.options)
                            .then(function() {
                                globalStore.endTransition(id);
                            });
                    }());
                } else promises.push(componentRefs[trans.componentID][transition.funcName](trans.options));
            }
            return Promise.all(promises);
        }
    }
    if (transition.transitionLock) {
        return function() {
            var id = globalStore.setTransition();
            return componentRefs[transition.componentID][transition.funcName](_processOptions(transition.options))
                .then(function() {
                    globalStore.endTransition(id);
                });
        }
    } else return componentRefs[transition.componentID][transition.funcName].bind(componentRefs[transition.componentID], _processOptions(transition.options));
}

function _processOptions(options) {
    if (options.offScreenX) {
        options.x = -(globalStore.get('windowWidth'));
    }
    if (options.offScreenYPos) {
        options.y = globalStore.get('windowHeight');
    }
    if (options.offScreenYNeg) {
        options.y = -2800;
    }
    return options;
}

function _processDataQueue() {
    _.forEach(this._dataQueue, function(val, key) {
        _routeData.call(this, val, key);
    }.bind(this));
    this._dataQueue = [];
}

function _routeData(data) {
    globalStore.set(data.key, data.data);
    this._events.emit(data.key, data.data);
}

function _processRenderQueue() {
    _.forEach(this._renderQueue, function(val, key) {
        _renderTemplate.call(this, val, key);
    }.bind(this));
}

function _parseResources(data) {
    var templates = [],
        dataObj = [],
        dObj,
        template,
        isMountQueued;
    for (var i = 0; i < data.length; ++i) {
        if (data[i].templateID) templates.push(data[i]);
        else dataObj.push(data[i]);
    }
    for (i = 0; i < templates.length; ++i) {
        template = templates[i];
        if (!this._mounted.templateData[template.templateID]) {
            isMountQueued = this._mountQueue[template.rootNode] && this._mountQueue[template.rootNode].templateID === template.templateID;
            if (!isMountQueued && !this._renderQueue[template.templateID]) this._renderQueue[template.templateID] = template;
        }
    }
    for (i = 0; i < dataObj.length; ++i) {
        dObj = dataObj[i];
        if (dObj.global) globalStore.set(dObj.key, dObj.data);
        else this._dataQueue.push(dObj);
    }
}

function _renderTemplate(data, key) {
    var node,
        refs = {},
        mountNodes = [],
        componentRefs = {},
        dataEvents = [],
        nodeData,
        zDivs = [],
        parent;
    if (data.rootNode === 'rootNode') {
        _.forEach(this._mounted.rootNodes, function (id) {
            _dismountTemplate.call(this, id, true);
        }.bind(this));
        _.forEach(this._nodeRefs, function(val, key) {
            if (key !== 'rootNode') delete this._nodeRefs[key];
        }.bind(this));
        this._currentMode = data.mode;
    }
    if (data.validationStrings) {
        validation.initialize(data.validationStrings);
    }
    if (data.dataReqs) {
        for (var i = 0; i < data.dataReqs.length; ++i) {
            if (!globalStore.get(data.dataReqs[i])) return;
        }
    }
    if (data.data) {
        for (i = 0; i < data.data.length; ++i) {
            globalStore.set(data.data[i].key, data.data[i].data);
        }
    }
    for (i = 0; i < data.nodes.length; ++i) {
        nodeData = data.nodes[i];
        node = _createNode.call(this, nodeData, componentRefs, dataEvents);
        if (nodeData.saveRef) this._nodeRefs[nodeData.id] = node;
        else refs[nodeData.id] = node;
        if (!node.isZDiv) {
            if (nodeData.parent) {
                parent = this._nodeRefs[nodeData.parent] || refs[nodeData.parent];
                parent.addChild(node);
            } else mountNodes.push(node);
        } else {
            zDivs.push(node.zDivRef);
        }
    }
    delete this._renderQueue[key];
    this._mountQueue[data.rootNode] = {
        title: data.title || '',
        mode: data.mode,
        rootNode: data.rootNode,
        templateID: data.templateID,
        nodes: mountNodes,
        zDivs: zDivs,
        componentRefs: componentRefs,
        events: data.events || null,
        dataEvents: dataEvents,
        transition: data.transition || null
    };
}

function _createNode(data, componentRefs, dataEvents) {
    var node = new Node(),
        component,
        comp,
        dataEvent,
        eventCallback;
    if (data.components && data.components[0] && data.components[0].type === 'ZDiv') {
        node = this._nodeRefs.rootNode.addChild();
    }
    if (data.nodeConfig) {
        data.nodeConfig = _processNodeConfig(data.nodeConfig);
        _.forEach(data.nodeConfig, function(val, key) {
            node[key].apply(node, val);
        });
    }
    if (data.components) {
        for (var i = 0; i < data.components.length; ++i) {
            component = data.components[i];
            if (!component.options) component.options = {};
            comp = new components[component.type](node, component.options);
            if (component.saveRef) componentRefs[component.saveRef] = comp;
            if (component.globalRef) globalStore.set(component.globalRef, comp);
            if (component.dataEvents) {
                for (var j = 0; j < component.dataEvents.length; ++j) {
                    dataEvent = component.dataEvents[j];
                    eventCallback = comp[dataEvent.funcName].bind(comp);
                    this._events.on(dataEvent.id, eventCallback);
                    dataEvents.push({
                        id: dataEvent.id,
                        callback: eventCallback
                    });
                }
            }
            switch (component.type) {
                case 'ZDiv':
                    globalStore.get('registerRootZDiv')(comp);
                    node = comp.contentNode;
                    node.isZDiv = true;
                    node.zDivRef = comp;
                    break;
                default:
                    break;
            }
        }
    }
    return node;
}

function _processNodeConfig(config) {
    if (config.offScreenX) {
        config.setPosition = [-(globalStore.get('windowWidth')), 0, 0];
        delete config.offScreenX;
    }
    if (config.offScreenYPos) {
        config.setPosition = [0, globalStore.get('windowHeight'), 0];
        delete config.offScreenYPos;
    }
    if (config.offScreenYNeg) {
        config.setPosition = [0, -2800, 0];
        delete config.offScreenYNeg;
    }
    return config;
}

module.exports = RenderManager;