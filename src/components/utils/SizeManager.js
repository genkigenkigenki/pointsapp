var EventEmitter        = require('../../utils/EventEmitter'),
    globalStore        = require('../../utils/globalStore'),
    getEventReceiver    = require('../../utils/getEventReceiver'),
    _                   = require('lodash');

var _defaults = {
    direction: 'y'
};

function SizeManager(options) {
    this.isSizeManager = true;
    this._direction = options && options.direction || _defaults.direction;
    this._elements = {};
    this._id = 0;
    this._size = 0;
    this.events = new EventEmitter();
    if (options && options.positionArray) this._positionArray = [];
}

SizeManager.prototype.register = function(node, margin) {
    var sizeMode,
        isX = this._direction === 'x',
        mode,
        id = this._id,
        addSize = margin ? margin : 0,
        sizeArray,
        size;
    if (node.isSizeManager) {
        node.events.on('resize', function(size) {
            this._elements[id] = size;
            this._calcSize();
        }.bind(this))
    } else {
        sizeMode =  node.getSizeMode();
        mode = isX ? sizeMode[0] : sizeMode[1];
        if (mode === 1) {
            sizeArray = node.getAbsoluteSize();
            size = isX ? sizeArray[0] : sizeArray[1];
            this._elements[id] = size;
        } else {
            this._elements[id] = 0;
            node.addManagedComponent({
                onSizeChange: function(isX, id, addSize, x, y){
                    if (!node._sizeManagerHidden && _.isNumber(this._elements[id])) {
                        this._elements[id] = isX ? x : y;
                        if (margin) this._elements[id] += addSize;
                        this._calcSize();
                    }
                }.bind(this, isX, id, addSize)
            });
            node.addManagedComponent({
                onShow: function(id){
                    var size;
                    if (node._sizeManagerHidden && _.isNumber(this._elements[id])) {
                        size = node.getSize();
                        node._sizeManagerHidden = false;
                        this._elements[id] = isX ? size[0] : size[1];
                        if (margin) this._elements[id] += addSize;
                        this._calcSize();
                    }
                }.bind(this, id)
            });
            node.addManagedComponent({
                onHide: function(id){
                    if (_.isNumber(this._elements[id])) {
                        node._sizeManagerHidden = true;
                        this._elements[id] = 0;
                        this._calcSize();
                    }
                }.bind(this, id)
            });
        }
    }
    this._calcSize();
    this._id++;
    return id;
};

SizeManager.prototype.deRegister = function(id) {
    if (_.isNumber(this._elements[id])) {
        this._elements[id] = null;
    }
    this._calcSize();
};

SizeManager.prototype._calcSize = function() {
    var oldSize = this._size;
    this._size = 0;
    if (this._positionArray) this._positionArray = [];
    for (var i = 0; i < Object.keys(this._elements).length; ++i) {
        if (this._positionArray) {
            this._positionArray.push(this._size);
        }
        if (_.isNumber(this._elements[i])) this._size += this._elements[i];
    }
    this._size = Math.ceil(this._size);
    if (this._size !== oldSize) {
        this.events.emit('resize', this._size);
        if (this._positionArray) {
            this.events.emit('positionArray', this._positionArray);
        }
    }
};

SizeManager.prototype.forceEmit = function() {
    this.events.emit('resize', this._size);
    if (this._positionArray) {
        this.events.emit('positionArray', this._positionArray);
    }
};

module.exports = SizeManager;