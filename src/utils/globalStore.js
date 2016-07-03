var _       = require('lodash'),
    Promise = require('bluebird');

var _Store = {
    id: 0,
    windowWidth: 0,
    windowHeight: 0,
    globalClickActive: false,
    transitionActive: false,
    isIdle: false,
    showSnackBar: null,
    formFilled: false,
    globalTransitions: {},
    pipes: {},
    interactionEvents: {
        click: {},
        mousemove: {},
        touchstart: {},
        touchmove: {}
    },
    executeOnce: {},
    uiEvents: {
        resize: {}
    },
    watch: {}
};

function getID() {
    _Store.id++;
    return String.fromCharCode(Math.floor((Math.random()*25)+65)) + _Store.id.toString();
}

function registerGlobalEventCallback(group, type, func, removeAfterOnce) {
    var id = getID(),
        ref = _Store[group + 'Events'];
    if (!ref[type]) throw new Error('Event type not configured in globalStore.');
    if (removeAfterOnce) {
        ref[type][id] = function(innerGroup, innerType, innerID) {
            func();
            deRegisterGlobalEvent(innerGroup, innerType, innerID);
        }.bind(null, group, type, id)
    } else {
        ref[type][id] = func;
    }
    return id;
}

function deferAction(count) {
    var comp;
    return new Promise(function(resolve, reject) {
        comp = new DeferComponent(_Store.eventRoot, count, resolve);
    }).then(function() {
            _Store.eventRoot.removeComponent(comp);
        });
}

function DeferComponent(node, actionCount, resolve) {
    this._resolve = resolve;
    this._endCount = actionCount;
    this._count = 0;
    this._node = node;
    this._id = this._node.addComponent(this);
    this._node.requestUpdate(this._id);
}

DeferComponent.prototype.onUpdate = function() {
    if (this._count  === this._endCount) {
        this._resolve();
        return;
    }
    this._count++;
    this._node.requestUpdateOnNextTick(this._id);
};

function deRegisterGlobalEvent(group, type, id) {
    var ref = _Store[group + 'Events'];
    if (ref[type] && ref[type][id]) delete ref[type][id];
}

module.exports = {
    killHrefs: function(bool) {
        _Store.workerEventManager.sendMessage('killHrefs', bool);
        _Store.scrollActive = bool;
    },
    pipeScroll: function(payload, id) {
        if (_Store.pipes[id]) {
            _.forEach(_Store.pipes[id], function(val) {
                if (val._scrollSync) val._scrollSync._eventInput.emit('wheel', payload);
            });
        }
    },
    registerPipe: function(id, target) {
        var subID = getID();
        if (!_Store.pipes[id]) _Store.pipes[id] = {};
        _Store.pipes[id][subID] = target;
        return subID;
    },
    deRegisterPipe: function(id, subID) {
        if (_Store.pipes[id] && _Store.pipes[id][subID]) delete _Store.pipes[id][subID];
    },
    set: function(key, data) {
        _Store[key] = data;
        if (_Store.watch[key]) {
            _.forEach(_Store.watch[key], function(val) {
                val(data);
            });
        }
    },
    remove: function(key) {
        if (_Store[key]) delete _Store[key];
    },
    get: function(key) {
        if (!_.isUndefined(_Store[key])) return _Store[key];
        else return null;
    },
    watch: function(key, func) {
        var id;
        if (!_Store.watch[key]) _Store.watch[key] = {};
        id = getID();
        _Store.watch[key][id] = func;
        return id;
    },
    unWatch: function(key, id) {
        if (id === 'all' && _Store.watch[key]) delete _Store.watch[key];
        else if (_Store.watch[key] && _Store.watch[key][id]) {
            delete _Store.watch[key][id];
        }
    },
    setTransition: function() {
        var id = getID();
        _Store.globalTransitions[id] = true;
        _Store.transitionActive = true;
        return id;
    },
    endTransition: function(id) {
        if (_Store.globalTransitions[id]) delete _Store.globalTransitions[id];
        _Store.transitionActive = Object.keys(_Store.globalTransitions).length > 0;
    },
    deferAction: deferAction,
    getUniqueId: getID,
    registerGlobalEventCallback: registerGlobalEventCallback,
    deRegisterGlobalEvent: deRegisterGlobalEvent,
    init: function(data) {
        _.merge(_Store, data);
    }
};