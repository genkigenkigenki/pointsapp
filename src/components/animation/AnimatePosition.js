var Transitionable      = require('jokismo_engine_fork/transitions/Transitionable'),
    _                   = require('lodash'),
    Promise             = require('bluebird');

function AnimatePosition (nodeOrArrayOfNodes) {
    this._nodeList = nodeOrArrayOfNodes;
    this._node = nodeOrArrayOfNodes[0] || nodeOrArrayOfNodes;
    this._id = this._node.addComponent(this);
    this._transitionable = new Transitionable([0, 0, 0]);
    this._resolve = null;
}

AnimatePosition.prototype.start = function start (options) {
    return new Promise(function(resolve, reject) {
        this._resolve = resolve;
        var position = this._node.getPosition(),
            toX = _.isNumber(options.x) ? options.x : position[0],
            toY = _.isNumber(options.y) ? options.y : position[1],
            toZ = _.isNumber(options.z) ? options.z : position[2];
        this._node.requestUpdate(this._id);
        this._transitionable.from(position).to([toX, toY, toZ], options.curve || 'outExpo', options.duration || 600, function() {
            if (options.callback) options.callback();
            resolve();
        });
    }.bind(this));
};

AnimatePosition.prototype.onUpdate = function onUpdate () {
    if (this._transitionable.isActive()) {
        var position = this._transitionable.get();
        if (this._nodeList[0]) {
            for (var i = 0; i < this._nodeList.length; ++i) {
                this._nodeList[i].setPosition(position[0], position[1], position[2]);
            }
        } else {
            this._node.setPosition(position[0], position[1], position[2]);
        }
        this._node.requestUpdateOnNextTick(this._id);
    }
};

AnimatePosition.prototype.cancel = function cancel () {
    this._transitionable.halt();
    if (this._resolve) {
        this._resolve();
        this._resolve = null;
    }
};

module.exports = AnimatePosition;