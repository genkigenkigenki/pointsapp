var _gestureEvents = ['drag', 'tap', 'rotate', 'pinch'];

function NodeEventManager (node) {
    this.node = node;
    this.events = {
        gesture: [],
        mouse: []
    };
    this.onDismount = this.stopEvent.bind(this, 'all');
    this.onHide = this.stopEvent.bind(this, 'all');
    this.onShow = this.startEvent.bind(this, 'all');
    node.addComponent(this);
}

NodeEventManager.prototype.stopEvent = function stopEvent (type) {
    if (type === 'all') {
        for (var i = 0; i < this.events.mouse.length; ++i) {
            this.node.removeUIEvent(this.events.mouse[i]);
        }
        for (i = 0; i < this.events.gesture.length; ++i) {
            this.node._gestureHandler.off(this.events.gesture[i]);
        }
    } else {
        if (_gestureEvents.indexOf(type) !== -1) {
            this.node.removeUIEvent(type);
        } else {
            this.node._gestureHandler.off(type);
        }
    }
};

NodeEventManager.prototype.startEvent = function startEvent (type) {
    if (type === 'all') {
        for (var i = 0; i < this.events.mouse.length; ++i) {
            this.node.addUIEvent(this.events.mouse[i]);
        }
        for (i = 0; i < this.events.gesture.length; ++i) {
            this.node._gestureHandler.on(this.events.gesture[i]);
        }
    } else {
        if (_gestureEvents.indexOf(type) !== -1) {
            this.node.addUIEvent(type);
        } else {
            this.node._gestureHandler.on(type);
        }
    }
};

NodeEventManager.prototype.registerEvent = function registerEvent (type) {
    if (_gestureEvents.indexOf(type) !== -1) {
        if (this.events.gesture.indexOf(type) === -1) this.events.gesture.push(type);
    }
    else if (this.events.mouse.indexOf(type) === -1) this.events.mouse.push(type);
};

module.exports = NodeEventManager;