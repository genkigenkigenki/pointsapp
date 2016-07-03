var Transitionable      = require('jokismo_engine_fork/transitions/Transitionable'),
    _                   = require('lodash'),
    Promise             = require('bluebird');

function AnimateRotate (nodeOrArrayOfNodes) {
    this._nodeList = nodeOrArrayOfNodes;
    this._node = nodeOrArrayOfNodes[0] || nodeOrArrayOfNodes;
    this._id = this._node.addComponent(this);
    this._transitionable = new Transitionable([0, 0, 0]);
    this._resolve = null;
}

AnimateRotate.prototype.start = function start (options) {
    return new Promise(function(resolve, reject) {
        this._resolve = resolve;
        var rotation = this._node.getRotation(),
            toX = _.isNumber(options.x) ? options.x : rotation[0],
            toY = _.isNumber(options.y) ? options.y : rotation[1],
            toZ = _.isNumber(options.z) ? options.z : rotation[2];
        this._node.requestUpdate(this._id);
        this._transitionable.from(rotation).to([toX, toY, toZ], options.curve || 'linear', options.duration || 600, function() {
            if (options.callback) options.callback();
            if (options.forever) {
                this._node.setRotation(0, 0, 0);
                this.start(options);
            }
            else resolve();
        }.bind(this));
    }.bind(this));
};

AnimateRotate.prototype.onUpdate = function onUpdate () {
    if (this._transitionable.isActive()) {
        var rotation = this._transitionable.get();
        if (this._nodeList[0]) {
            for (var i = 0; i < this._nodeList.length; ++i) {
                this._nodeList[i].setRotation(rotation[0], rotation[1], rotation[2]);
            }
        } else {
            this._node.setRotation(rotation[0], rotation[1], rotation[2]);
        }
        this._node.requestUpdateOnNextTick(this._id);
    }
};

AnimateRotate.prototype.cancel = function cancel () {
    this._transitionable.halt();
    if (this._resolve) {
        this._resolve();
        this._resolve = null;
    }
};

module.exports = AnimateRotate;