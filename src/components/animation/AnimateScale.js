var Transitionable      = require('jokismo_engine_fork/transitions/Transitionable'),
    _                   = require('lodash'),
    Promise             = require('bluebird');

function AnimateScale (nodeOrArrayOfNodes) {
    this._nodeList = nodeOrArrayOfNodes;
    this._node = nodeOrArrayOfNodes[0] || nodeOrArrayOfNodes;
    this._id = this._node.addComponent(this);
    this._transitionable = new Transitionable([0, 0, 0]);
    this._resolve = null;
}

AnimateScale.prototype.start = function start (options) {
    return new Promise(function(resolve, reject) {
        this._resolve = resolve;
        var scale = this._node.getScale(),
            toX = _.isNumber(options.x) ? options.x : scale[0],
            toY = _.isNumber(options.y) ? options.y : scale[1],
            toZ = _.isNumber(options.z) ? options.z : scale[2];
        this._node.requestUpdate(this._id);
        this._transitionable.from(scale).to([toX, toY, toZ], options.curve || 'outQuad', options.duration || 600, function() {
            if (options.callback) options.callback();
            resolve();
        });
    }.bind(this));
};

AnimateScale.prototype.onUpdate = function onUpdate () {
    if (this._transitionable.isActive()) {
        var scale = this._transitionable.get();
        if (this._nodeList[0]) {
            for (var i = 0; i < this._nodeList.length; ++i) {
                this._nodeList[i].setScale(scale[0], scale[1], scale[2]);
            }
        } else {
            this._node.setScale(scale[0], scale[1], scale[2]);
        }
        this._node.requestUpdateOnNextTick(this._id);
    }
};

AnimateScale.prototype.cancel = function cancel () {
    this._transitionable.halt();
    if (this._resolve) {
        this._resolve();
        this._resolve = null;
    }
};

module.exports = AnimateScale;