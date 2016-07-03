function EventEmitter() {
    this.listeners = {};
    this._owner = this;
}

EventEmitter.prototype.emit = function emit(type, event) {
    var handlers = this.listeners[type];
    if (handlers) {
        for (var i = 0; i < handlers.length; i++) {
            handlers[i].call(this._owner, event);
        }
    }
    return this;
};

EventEmitter.prototype.on = function on(type, handler) {
    if (!(type in this.listeners)) this.listeners[type] = [];
    var index = this.listeners[type].indexOf(handler);
    if (index < 0) this.listeners[type].push(handler);
    return this;
};

EventEmitter.prototype.addListener = EventEmitter.prototype.on;

EventEmitter.prototype.removeListener = function removeListener(type, handler) {
    var index;
    if (type === 'all') {
        this.listeners = {};
    } else if (handler === 'all') {
        this.listeners[type] = [];
    } else {
        index = this.listeners[type].indexOf(handler);
        if (index >= 0) this.listeners[type].splice(index, 1);
    }
    return this;
};

EventEmitter.prototype.bindThis = function bindThis(owner) {
    this._owner = owner;
};

module.exports = EventEmitter;