var DOMElement          = require('jokismo_engine_fork/dom-renderables/DOMElement'),
    Node                = require('jokismo_engine_fork/core/Node'),
    _                   = require('lodash'),
    AnimateScale        = require('../../components/animation/AnimateScale'),
    AnimateOpacity      = require('../../components/animation/AnimateOpacity'),
    EventEmitter        = require('../../utils/EventEmitter'),
    getEventReceiver    = require('../../utils/getEventReceiver'),
    globalStore         = require('../../utils/globalStore'),
    processClickMap     = require('../../utils/processClickMap');

var _defaults = {
        backgroundClassList: ['bg-black-21'],
        ripple: {
            classList: ['bg-black-54'],
            radius: 250,
            baseScale: 0.12,
            z: 0
        }
    },
    _pool = [],
    _poolMax = 4;

for (var i  = 0; i < _poolMax; ++i) {
    _pool.push(new EventRipple());
}

function EventRipple() {
    this._node = new Node();
    this._node.animation = new AnimateOpacity(this._node);
    this._node.el = new DOMElement(this._node, {
        classes: ['events-none', 'oflow-hidden']
    });
    this._node.setOpacity(0)
        .setPosition(0, 0, 0);
    this._rippleNode = this._node.addChild()
        .setAlign(0, 0, 0)
        .setMountPoint(0.5, 0.5, 0)
        .setOrigin(0.5, 0.5, 0)
        .setSizeMode('absolute', 'absolute');
    this._rippleNode.el = new DOMElement(this._rippleNode, {
        'classes': ['events-none']
    });
    this._rippleNode.animation = new AnimateScale(this._rippleNode);
}

EventRipple.changeClickMap = function(node, clickMap, size, classMap) {
    if (node._ripple) {
        node._ripple.config.clickMap = clickMap;
        if (size) node._ripple.config.size = size;
        if (classMap) node._ripple.config.classMap = classMap;
    } else throw new Error('changeClickMap called on unconfigured node.');
};

EventRipple.syncEventsToRipple = function(node, options) {
    //node.watchAbsolutePosition();
    node._ripple = {
        config: {
            scrollOverride: options && options.scrollOverride || false,
            backgroundClassList: options && options.backgroundClassList || _defaults.backgroundClassList,
            rippleClassList: options && options.ripple && options.ripple.classList || _defaults.ripple.classList,
            radius: options && options.ripple && options.ripple.radius || _defaults.ripple.radius,
            baseScale: options && options.ripple && options.ripple.baseScale || _defaults.ripple.baseScale,
            z: options && options.ripple && options.ripple.z || _defaults.ripple.z,
            clickFunc: options && options.clickFunc || null,
            clickMap: options && options.clickMap || null,
            classMap: options && options.classMap || null,
            size: options && options.size || null,
            scrollContainerRef: options && options.scrollContainerRef || null,
            globalClickSetter: options && options.globalClickSetter || null,
            noRipple: options && options.noRipple || false
        },
        active: true
    };
    node._ripple.toggleActive = function(bool) {
        node._ripple.active = bool;
    };
    node.registerGesture('drag', function(e) {
        switch (e.status) {
            case 'start':
                _start.call(node, e);
                break;
            case 'move':
                _move.call(node, e);
                break;
            case 'end':
                _end.call(node, e);
        }
    }.bind(this));
};

function _start() {
    this._ripple.moveCount = 0;
    if (!this._ripple.config.noRipple) {
        this._ripple.obj = _initRipple(this._ripple.config);
    }
}

function _initRipple(config) {
    var eventRipple = _pool.pop(),
        radius = config.radius === 'windowWidth' ? globalStore.get('windowWidth') : config.radius;
    if (!eventRipple) eventRipple = new EventRipple();
    if (!config.classMap) {
        _addClasses(eventRipple._rippleNode.el, config.rippleClassList);
        _addClasses(eventRipple._node.el, config.backgroundClassList);
    }
    eventRipple._rippleNode.el.setProperty('border-radius', radius + 'px');
    eventRipple._rippleNode.setScale(config.baseScale, config.baseScale, 1)
        .setAbsoluteSize(radius * 2, radius * 2);
    return eventRipple;
}

function _addClasses(el, classList) {
    for (var i = 0; i < classList.length; ++i) {
        el.addClass(classList[i]);
    }
}

function _move(e) {
    if (!e.isMouse) this._ripple.moveCount++;
}

function _end(e) {
    var eventRipple = this._ripple.obj,
        config = this._ripple.config,
        globalClickActive = globalStore.get('globalClickActive'),
        scrollKill = false,
        x,
        y,
        classConfig,
        mapXIndex = 0,
        mapYIndex = 0,
        clickData = '',
        clickMapReturn,
        scrollPos;
    if (globalStore.get('scrollActive')) {
        if (!config.scrollOverride) scrollKill = true;
    }
    if (this._ripple.moveCount === 0 && !scrollKill && this._ripple.active && !( globalClickActive && !config.globalClickSetter )) {
        if (config.noRipple) {
            this._ripple.active = false;
            this.getAbsolutePosition();
            x = e.center.x - this._absoluteXPosition;
            y = e.center.y - this._absoluteYPosition;
            if (config.scrollContainerRef) {
                scrollPos = config.scrollContainerRef.getPosition();
                if (scrollPos.isX) x += Math.floor(Math.abs(scrollPos.pos));
                else y += Math.floor(Math.abs(scrollPos.pos));
            }
            if (config.clickMap) {
                clickMapReturn = processClickMap(config.clickMap, x, y);
                if (!clickMapReturn.valid) {
                    this._ripple.active = true;
                    return;
                }
                mapXIndex = clickMapReturn.xIndex;
                mapYIndex = clickMapReturn.yIndex;
                clickData = clickMapReturn.data;
            }
            if (config.clickFunc) config.clickFunc({
                screenX: e.center.x,
                screenY: e.center.y,
                x: mapXIndex,
                y: mapYIndex,
                data: clickData
            });
            else this._ripple.active = true;
        } else {
            if (!eventRipple) return;
            this._ripple.active = false;
            this.getAbsolutePosition();
            x = e.center.x - this._absoluteXPosition;
            y = e.center.y - this._absoluteYPosition;
            if (config.scrollContainerRef) {
                scrollPos = config.scrollContainerRef.getPosition();
                if (scrollPos.isX) x += Math.floor(Math.abs(scrollPos.pos));
                else y += Math.floor(Math.abs(scrollPos.pos));
            }
            if (config.clickMap) {
                clickMapReturn = processClickMap(config.clickMap, x, y);
                if (!clickMapReturn.valid) {
                    _returnRippleToPool(eventRipple, config);
                    this._ripple.active = true;
                    return;
                }
                mapXIndex = clickMapReturn.xIndex;
                mapYIndex = clickMapReturn.yIndex;
                clickData = clickMapReturn.data;
                x = x - clickMapReturn.mapX;
                y = y - clickMapReturn.mapY;
                eventRipple._node.setPosition(clickMapReturn.mapX, clickMapReturn.mapY, config.z);
            } else eventRipple._node.setPosition(0, 0, config.z);
            if (config.size) {
                if (config.size.fixed) {
                    eventRipple._node.setSizeMode(config.size.x ? 'absolute' : 'relative', config.size.y ? 'absolute' : 'relative')
                        .setAbsoluteSize(config.size.x ? config.size.x : 0, config.size.y ? config.size.y : 0);
                } else {
                    eventRipple._node.setSizeMode('absolute', 'absolute')
                        .setAbsoluteSize(config.size.vals[mapXIndex][mapYIndex][0], config.size.vals[mapXIndex][mapYIndex][1]);
                }
            }
            if (config.classMap) {
                if (config.classMap['' + mapXIndex + mapYIndex]) {
                    classConfig = config.classMap['' + mapXIndex + mapYIndex];
                    if (classConfig.bg) {
                        _addClasses(eventRipple._node.el, classConfig.bg);
                    } else {
                        _addClasses(eventRipple._node.el, config.backgroundClassList);
                    }
                    if (classConfig.ripple) {
                        _addClasses(eventRipple._rippleNode.el, classConfig.ripple);
                    } else {
                        _addClasses(eventRipple._rippleNode.el, config.rippleClassList);
                    }
                } else {
                    _addClasses(eventRipple._rippleNode.el, config.rippleClassList);
                    _addClasses(eventRipple._node.el, config.backgroundClassList);
                }
            }
            eventRipple._rippleNode.setPosition(x, y, 0);
            this.addChild(eventRipple._node);
            eventRipple._node.animation.start({
                opacity: 1,
                duration: 200,
                curve: 'outQuart'
            });
            eventRipple._rippleNode.animation.start({
                x: 1,
                y: 1,
                duration: 200,
                curve: 'outQuart'
            }).then(function() {
                eventRipple._node.dismount();
                delete this._ripple.obj;
                if (_pool.length < _poolMax) _pool.push(new EventRipple());
                if (config.clickFunc) config.clickFunc({
                    x: mapXIndex,
                    y: mapYIndex,
                    data: clickData
                });
                else this._ripple.active = true;
            }.bind(this));
        }
    } else {
        if (eventRipple) {
            _returnRippleToPool(eventRipple, config);
        }
    }
}

function _returnRippleToPool(ripple, config) {
    _removeClasses(ripple._rippleNode.el, config.rippleClassList);
    _removeClasses(ripple._node.el, config.backgroundClassList);
    if (_pool.length < _poolMax) _pool.push(ripple);
}

function _removeClasses(el, classList) {
    for (var i = 0; i < classList.length; ++i) {
        el.removeClass(classList[i]);
    }
}

module.exports = EventRipple;