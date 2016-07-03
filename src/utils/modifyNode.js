var Node                = require('jokismo_engine_fork/core/Node'),
    GestureHandler      = require('jokismo_engine_fork/components/GestureHandler'),
    ComponentManager    = require('./ComponentManager'),
    NodeEventManager    = require('./NodeEventManager'),
    globalStore         = require('./globalStore'),
    ScrollSync          = require('./ScrollSync'),
    MouseSync           = require('./MouseSync'),
    TouchSync           = require('./TouchSync');

Node.prototype.watchAbsolutePosition = function() {
    this.addManagedComponent({
        onPositionChange: this.getAbsolutePosition.bind(this)
    });
};

Node.prototype.getAbsolutePosition = function(node) {
    var parent,
        align,
        alignX,
        alignY,
        size,
        mountPoint,
        mountX,
        mountY,
        parentSize;
    if (!node) {
        node = this;
        this._absoluteXPosition = 0;
        this._absoluteYPosition = 0;
    }
    var position = this.getPosition();
    node._absoluteXPosition += position[0];
    node._absoluteYPosition += position[1];
    parent = this.getParent();
    if (!parent.getDispatch) {
        align = this.getAlign();
        mountPoint = this.getMountPoint();
        mountX = mountPoint[0];
        mountY = mountPoint[1];
        alignX = align[0];
        alignY = align[1];
        if (alignX !== 0 || alignY !== 0) {
            size = this.getSize();
            parentSize = parent.getSize();
            if (alignX === 0.5) {
                node._absoluteXPosition += Math.floor(( parentSize[0] - size[0] ) / 2)
            }
            if (alignX === 1) {
                if (mountX === 0) {
                    node._absoluteXPosition += Math.floor(parentSize[0]);
                } else {
                    node._absoluteXPosition += Math.floor(parentSize[0] - size[0]);
                }
            }
            if (alignY === 0.5) {
                node._absoluteYPosition += Math.floor(( parentSize[1] - size[1] ) / 2)
            }
            if (alignY === 1) {
                if (mountY === 0) {
                    node._absoluteYPosition += Math.floor(parentSize[1]);
                } else {
                    node._absoluteYPosition += Math.floor(parentSize[1] - size[1]);
                }
            }
        }
        parent.getAbsolutePosition(node);
    }
};

Node.prototype.addManagedComponent = function(component) {
    if (!this._componentManager) this._componentManager = new ComponentManager(this);
    this._componentManager.addComponent(component);
};

Node.prototype.registerEvent = function(event) {
    if (!this._nodeEventManager) this._nodeEventManager = new NodeEventManager(this);
    this._nodeEventManager.registerEvent(event);
};

Node.prototype.registerGesture = function(gesture, callback, noEventsOnNode) {
    if (!this._gestureHandler) this._gestureHandler = new GestureHandler(this);
    this._gestureHandler.on(gesture, callback);
};

Node.prototype.scrollSyncStart = function(options) {
    this.registerEvent('wheel');
    if (!this._scrollSync) this._scrollSync = new ScrollSync({
        direction: options && options.direc === 'x' ? 0 : 1
    });
    this.addManagedComponent({
        onReceive: function(event, payload) {
            if (event === 'wheel') {
                payload.stopPropagation();
                if (options.pipe) globalStore.pipeScroll(payload, options.pipeID);
                else this._scrollSync._eventInput.emit('wheel', payload);
            }
        }.bind(this)
    });
    this._scrollSync.componentID = this.addComponent({
        onUpdate: function() {
            if (this._scrollSync && this._scrollSync.newFrameLoop()) {
                this.requestUpdateOnNextTick(this._scrollSync.componentID);
            }
        }.bind(this)
    });
    this._scrollSync._eventOutput.on('frameLoop', function() {
        this.requestUpdate(this._scrollSync.componentID);
    }.bind(this));
};

Node.prototype.touchSyncStart = function(options) {
    for (var i = 0; i < this.touchSyncEvents.length; ++i) {
        this.registerEvent(this.touchSyncEvents[i]);
    }
    if (!this._touchSync) this._touchSync = new TouchSync({
        direction: options && options.direc === 'x' ? 0 : 1
    });
    if (options && options._stopPropagation) this._touchSync._stopPropagation = true;
    this.addManagedComponent({
        onReceive: function(event, payload) {
            if (this.touchSyncEvents.indexOf(event) !== -1) {
                if (this._touchSync._stopPropagation) payload.stopPropagation();
                else if (event !== 'touchstart') payload.stopPropagation();
                this._touchSync._touchTracker.eventInput.emit(event, payload);
            } else if (event === 'click' && this._touchSync._stopPropagation) payload.stopPropagation();
        }.bind(this)
    });
};

Node.prototype.touchSyncEvents = ['touchstart', 'touchmove', 'touchend', 'touchcancel'];

Node.prototype.mouseSyncStart = function(options) {
    for (var i = 0; i < this.mouseSyncEvents.length; ++i) {
        this.registerEvent(this.mouseSyncEvents[i]);
    }
    if (!this._mouseSync) this._mouseSync = new MouseSync({
        direction: options && options.direc === 'x' ? 0 : 1,
        crossover: options && options.crossover || false,
        snapOnLeave: options && options.snapOnLeave || false
    });
    this.addManagedComponent({
        onReceive: function(event, payload) {
            if (this.mouseSyncEvents.indexOf(event) !== -1) {
                payload.stopPropagation();
                this._mouseSync._eventInput.emit(event, payload);
            }
        }.bind(this)
    });
};

Node.prototype.mouseSyncEvents = ['mousedown', 'mousemove', 'mouseup', 'mouseleave', 'mouseenter', 'click'];