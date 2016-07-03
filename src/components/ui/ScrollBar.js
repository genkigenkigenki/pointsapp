var DOMElement          = require('jokismo_engine_fork/dom-renderables/DOMElement'),
    clock               = require('jokismo_engine_fork/core/FamousEngine').getClock(),
    _                   = require('lodash'),
    AnimateOpacity      = require('../../components/animation/AnimateOpacity'),
    EventEmitter        = require('../../utils/EventEmitter'),
    getEventReceiver    = require('../../utils/getEventReceiver'),
    globalStore         = require('../../utils/globalStore'),
    ZDiv                = require('./ZDiv');

var _defaults = {
    containerWidth: 24,
    minBarHeight: 48,
    barWidth: 24,
    barTouchWidth: 48,
    barClassList: ['events-none', 'bg-white', 'shadow-one'],
    containerClassList: ['bg-black-54']
};

function ScrollBar(node, options) {
    var direction = options && options.direction || 'y';
    this._rootNode = node;
    this._isX = direction === 'x';
    this._positionRatio = 1;
    this._mounted = false;
    this._container = {
        max: 0,
        classList: options && options.containerClassList || _defaults.containerClassList,
        width: options && options.containerWidth || _defaults.containerWidth,
        mouseIn: false
    };
    this._showing = false;
    this._bar = {
        min: options && options.minBarHeight || _defaults.minBarHeight,
        width: options && options.barWidth || _defaults.barWidth,
        touchWidth: options && options.barTouchWidth || _defaults.barTouchWidth,
        classList: options && options.barClassList || _defaults.barClassList,
        size: 0,
        maxPosition: 0,
        position: 0,
        status: 'init'
    };
    this._scrollContentSize = 0;
    this._scrollContainerSize = 0;
    this._mode = 'init';
    this.events = new EventEmitter();
    this._changeModeFunc = _getChangeModeFunc.call(this);
    _watchMaxHeight.call(this);
    _render.call(this);
}

ScrollBar.prototype.onShow = function() {
    _listenToResizeEvents.call(this);
    _handleInteractionType.call(this, globalStore.get('hasMouse'));
    _watchInteractionType.call(this);
    _syncBar.call(this);
    _listenToScrollPosition.call(this);
};

ScrollBar.prototype.onHide = function() {
    _clearEvents.call(this);
    _unWatchInteractionType.call(this);
    this._mode = 'init';
    this._bar.status = 'init';
};

ScrollBar.prototype._setPosition = function(pos) {
    var bar = this._bar;
    if (pos > bar.maxPosition) pos = bar.maxPosition;
    if (pos < 0) pos = 0;
    bar.node.setPosition(this._isX ? pos : 0, this._isX ? 0 : pos, 0);
    bar.position = pos;
};

function _render() {
    _createContainer.call(this, new ZDiv(this._rootNode.addChild(), {
        z: 2
    }).contentNode);
    _createBar.call(this, new ZDiv(this._rootNode.addChild(), {
        z: 4
    }).contentNode);
}

function _createContainer(node) {
    //var direc = this._isX ? 'x' : 'y';
    this._container.node = node.addChild()
        .setSizeMode('absolute', 'relative')
        .setAbsoluteSize(24, 0)
        .setAlign(0.5, 0.5, 0.5)
        .setMountPoint(0.5, 0.5, 0.5);
    this._container.classList.push('pointer');
    this._container.el = new DOMElement(this._container.node, {
        classes: this._container.classList
    });
    this._container.opacityAnimation = new AnimateOpacity(this._container.node);
    this._container.node.registerEvent('click');
    this._container.node.registerEvent('mouseenter');
    this._container.node.registerEvent('mouseleave');
    this._container.node.registerEvent('wheel');
    //this._container.node.mouseSyncStart({
    //    direc: direc,
    //    crossover: true,
    //    snapOnLeave: true
    //});
    //this._container.node._mouseSync._eventOutput.on('start', _dragStart.bind(this));
    //this._container.node._mouseSync._eventOutput.on('update', _drag.bind(this));
    //this._container.node._mouseSync._eventOutput.on('end', _dragEnd.bind(this));
    _registerContainerEvents.call(this, this._container.node);
    return node;
}

function _registerContainerEvents(node) {
    node.addManagedComponent(getEventReceiver({
        eventName: 'click',
        callback: function(event) {
            if (this._mode === 'mouse') {
                var offset = this._isX ? event.offsetX : event.offsetY,
                    bar = this._bar;
                if (offset < bar.position) {
                    this._setPosition(offset);
                } else {
                    this._setPosition(offset - bar.size);
                }
                this.events.emit('update', -Math.floor(bar.position * this._positionRatio));
            }
        }.bind(this)
    }));
    node.addManagedComponent(getEventReceiver({
        eventName: 'mouseenter',
        callback: _showContainer.bind(this)
    }));
    node.addManagedComponent(getEventReceiver({
        eventName: 'mouseleave',
        callback: _hideContainer.bind(this)
    }));
}

function _showContainer(resize) {
    if (!this._container.mouseIn && this._mode === 'mouse') {
        if (resize) {
            this._bar.eventsNode.setSizeMode('absolute', 'absolute')
                .setAbsoluteSize(4000, 4000);
            clock.setTimeout(function() {
                if (!this._dragging) {
                    this._bar.eventsNode.setSizeMode('relative', 'relative');
                }
            }.bind(this), 300);
        }
        this._container.mouseIn = true;
        this._container.opacityAnimation.start({
            opacity: 1,
            duration: 800
        });
    }
}

function _hideContainer() {
    if (this._mode === 'touch') {
        this._container.mouseIn = false;
        this._container.node.setOpacity(0);
    } else if (this._container.mouseIn) {
        this._container.mouseIn = false;
        this._container.opacityAnimation.start({
            opacity: 0,
            duration: 800
        });
    }
}

function _createBar(node) {
    var direc = this._isX ? 'x' : 'y',
        bar = this._bar;
    bar.node = node.addChild()
        .setSizeMode('absolute', 'absolute')
        .setAbsoluteSize(this._isX ? 0 : bar.width, this._isX ? bar.width : 0)
        .setAlign(0.5, 0, 0.5)
        .setMountPoint(0.5, 0, 0.5);
    bar.renderNode = bar.node.addChild()
        .setSizeMode('relative', 'relative')
        //.setAbsoluteSize(this._isX ? 0 : bar.width, this._isX ? bar.width : 0)
        .setAlign(0.5, 0, 0.5)
        .setMountPoint(0.5, 0, 0.5);
    bar.eventsNode = bar.node.addChild()
        .setSizeMode('relative', 'relative')
        .setAlign(0.5, 0.5, 0.5)
        .setMountPoint(0.5, 0.5, 0.5)
        .setPosition(0, 0, 2);
    bar.node.opacityAnimation = new AnimateOpacity(bar.renderNode);
    bar.eventsNode.registerEvent('wheel');
    _registerBarEvents.call(this, bar.eventsNode);
    bar.eventsEl = new DOMElement(bar.eventsNode, {
        classes: ['pointer']
    });
    new DOMElement(bar.renderNode, {
        classes: bar.classList
    });
    bar.eventsNode.touchSyncStart({
        direc: direc,
        stopPropagation: true
    });
    bar.eventsNode._touchSync._eventOutput.on('start', _dragStart.bind(this));
    bar.eventsNode._touchSync._eventOutput.on('update', _drag.bind(this));
    bar.eventsNode._touchSync._eventOutput.on('end', _dragEnd.bind(this));
    bar.eventsNode.mouseSyncStart({
        direc: direc
        //crossover: true
    });
    bar.eventsNode._mouseSync._eventOutput.on('start', _dragStart.bind(this));
    bar.eventsNode._mouseSync._eventOutput.on('update', _drag.bind(this));
    bar.eventsNode._mouseSync._eventOutput.on('end', _dragEnd.bind(this));
}

function _registerBarEvents(node) {
    node.addManagedComponent(getEventReceiver({
        eventName: 'mouseenter',
        callback: _showContainer.bind(this, true)
    }));
    node.addManagedComponent(getEventReceiver({
        eventName: 'mouseleave',
        callback: _hideContainer.bind(this)
    }));
}

function _showBar(init) {
    var bar = this._bar;
    if (bar.status !== 'showing') {
        bar.status = 'showing';
        bar.node.show();
        bar.node.opacityAnimation.start({
            opacity: 1,
            duration: 200
        });
    }
    if (!init) _showContainer.call(this);
}

function _hideBar() {
    var bar = this._bar;
    if (bar.status !== 'hidden') {
        bar.status = 'hidden';
        bar.node.opacityAnimation.start({
            opacity: 0,
            duration: 2000,
            callback: bar.node.hide.bind(bar.node)
        });
    }
    _hideContainer.call(this);
}

function _dragStart() {
    this.events.emit('start');
    this._dragging = true;
    if (this._mode === 'touch') _showBar.call(this);
    else {
        this._bar.eventsNode.setSizeMode('absolute', 'absolute')
            .setAbsoluteSize(4000, 4000);
    }
}

function _drag(e) {
    var delta = e.delta,
        bar = this._bar;
    this._setPosition(bar.position + delta);
    this.events.emit('update', -Math.floor(bar.position * this._positionRatio));
}

function _dragEnd(e) {
    var bar = this._bar;
    this._dragging = false;
    if (this._mode !== 'touch') {
        this._bar.eventsNode.setSizeMode('relative', 'relative');
    }
    if (_.isNumber(e.snapOnLeave)) {
        if (Math.abs(e.snapOnLeave) < 25) {
            this._setPosition(0);
            this.events.emit('update', -Math.floor(bar.position * this._positionRatio));
        } else if (Math.abs(e.snapOnLeave - this._container.max) < 25) {
            this._setPosition(this._container.max);
            this.events.emit('update', -Math.floor(bar.position * this._positionRatio));
        }
    }
    this.events.emit('end');
    if (this._mode === 'touch') _hideBar.call(this);
    //if (_.isNumber(e.timestamp)) {
    //    this._container.node._mouseSync.setCrossoverTimestamp(e.timestamp);
    //    bar.node._mouseSync.setCrossoverTimestamp(e.timestamp);
    //}
}

function _changeMode() {
    var bar = this._bar;
    if (!this._mode || this._mode === 'mouse') {
        _showBar.call(this, true);
        this._container.el.addClass('pointer');
        this._container.el.removeClass('events-none');
        this._bar.node.setAbsoluteSize(this._isX ? bar.size : bar.width, this._isX ? bar.width : bar.size);
        this._bar.renderNode.setDifferentialSize(0, 0);
    } else {
        _hideBar.call(this);
        this._container.el.removeClass('pointer');
        this._container.el.addClass('events-none');
        this._bar.node.setAbsoluteSize(this._isX ? bar.size : bar.touchWidth, this._isX ? bar.touchWidth : bar.size);
        this._bar.renderNode.setDifferentialSize(this._isX ? 0 : bar.width - bar.touchWidth, this._isX ? bar.width - bar.touchWidth : 0);
    }
}

function _getChangeModeFunc() {
    return function(hasMouse) {
        _handleInteractionType.call(this, hasMouse);
    }.bind(this)
}

function _handleInteractionType(hasMouse) {
    var mode = !_.isBoolean(hasMouse) ? 'touch' : hasMouse ? 'mouse' : 'touch';
    if (mode !== this._mode) {
        this._mode = mode;
        _changeMode.call(this);
    }
}

function _watchInteractionType() {
    globalStore.watch('hasMouse', this._changeModeFunc);
}

function _unWatchInteractionType() {
    globalStore.unWatch('hasMouse', this._changeModeFunc);
}

function _watchMaxHeight() {
    this._rootNode.addManagedComponent({
        onSizeChange: function(x, y) {
            this._container.max = this._isX ? x : y;
        }.bind(this)
    });
}

function _listenToResizeEvents() {
    this.events.on('contentResize', function(size) {
        //clock.setTimeout(function() {
            this._scrollContentSize = size;
            _syncBar.call(this);
        //}.bind(this), 0);
    }.bind(this));
    this.events.on('containerResize', function(size) {
        clock.setTimeout(function() {
            this._scrollContainerSize = size;
            _syncBar.call(this);
        }.bind(this), 0);
    }.bind(this));
}

function _syncBar() {
    _setBarSize.call(this);
    if (this._showing) _setBarPosition.call(this);
}

function _setBarSize() {
    var bar = this._bar,
        minSize = bar.min,
        show = Math.floor(this._scrollContentSize) > Math.ceil(this._scrollContainerSize),
        visibleAmount,
        barSize;
    if (this._container.max < this._bar.min + 100 || !show) {
        this._rootNode.hide();
        this._showing = false;
        return;
    } else if (!this._showing && show) {
        this._rootNode.show();
        this._showing = show;
    }
    if (this._scrollContentSize === 0 || this._container.max === 0) return;
    if (this._showing) {
        visibleAmount = this._scrollContainerSize / this._scrollContentSize;
        barSize = Math.floor(visibleAmount * this._container.max);
        if (barSize < minSize) barSize = minSize;
        bar.size = barSize;
        bar.maxPosition = this._container.max - bar.size;
        this._positionRatio = (this._scrollContentSize - this._scrollContainerSize) / bar.maxPosition;
        bar.node.setAbsoluteSize(this._isX ?
            barSize : this._mode === 'touch' ? bar.touchWidth : bar.width,
            this._isX ? this._mode === 'touch' ? bar.touchWidth : bar.width : barSize);
    }
}

function _setBarPosition() {
    this.events.emit('getPosition');
}

function _listenToScrollPosition() {
    this.events.on('scrollUpdate', function(position) {
        if (this._mode === 'touch') _showBar.call(this);
        else _showContainer.call(this);
        _parsePositon.call(this, position);
    }.bind(this));
    this.events.on('scrollEnd', function() {
        if (this._mode === 'touch') _hideBar.call(this);
        else _hideContainer.call(this);
    }.bind(this));
    this.events.on('setPosition', _parsePositon.bind(this));
}

function _parsePositon(position) {
    position = -position;
    position = position / this._positionRatio;
    this._setPosition(position);
}

function _clearEvents() {
    this.events.removeListener('all');
}

module.exports = ScrollBar;