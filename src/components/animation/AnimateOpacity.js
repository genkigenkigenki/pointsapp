var Transitionable      = require('jokismo_engine_fork/transitions/Transitionable'),
    _                   = require('lodash'),
    Promise             = require('bluebird');

function AnimateOpacity (nodeOrArrayOfNodes) {
    this._nodeList = nodeOrArrayOfNodes;
    this._node = nodeOrArrayOfNodes[0] || nodeOrArrayOfNodes;
    this._id = this._node.addComponent(this);
    this._transitionable = new Transitionable(0);
    this._reject = null;
}

AnimateOpacity.prototype.start = function start (options) {
    return new Promise(function(resolve, reject) {
        this._reject = reject;
        var opacity = this._node.getOpacity();
        this._node.requestUpdate(this._id);
        this._transitionable.from(opacity).to(options.opacity, options.curve || 'outQuad', options.duration || 600, function() {
            if (options.callback) options.callback();
            resolve();
        });
    }.bind(this));
};

AnimateOpacity.prototype.onUpdate = function onUpdate () {
    if (this._transitionable.isActive()) {
        var opacity = this._transitionable.get();
        if (this._nodeList[0]) {
            for (var i = 0; i < this._nodeList.length; ++i) {
                this._nodeList[i].setOpacity(opacity);
            }
        } else {
            this._node.setOpacity(opacity);
        }
        this._node.requestUpdateOnNextTick(this._id);
    }
};

AnimateOpacity.prototype.cancel = function cancel () {
    this._transitionable.halt();
    if (this._reject) {
        this._reject();
        this._reject = null;
    }
};

module.exports = AnimateOpacity;