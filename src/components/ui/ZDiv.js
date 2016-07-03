// Creates a parent div to translate layers at top level when z translate will not work
var DOMElement          = require('jokismo_engine_fork/dom-renderables/DOMElement'),
    _                   = require('lodash'),
    getEventReceiver    = require('../../utils/getEventReceiver');

function ZDiv (node, options) {
    var childNode,
        size = node.getSize();
    this._rootNode = node;
    if (_.isUndefined(options.z)) {
        throw new Error('Z not defined for ZDiv');
    }
    this.groupName = options.groupName || '';
    childNode = node.addChild().setPosition(0, 0, options.z * 2)
        .setSizeMode('absolute', 'absolute')
        .setAbsoluteSize(0, 0);
    this.el = new DOMElement(childNode, {
        tagName: 'div',
        properties: {
            'z-index': options.z
        }
    });
    _bindEvents.call(this, node);
    this.contentNode = childNode.addChild()
        .setSizeMode('absolute', 'absolute')
        .setAbsoluteSize(size[0], size[1]);
    if (!options.noResize) _bindResize.call(this, node);
}

ZDiv.prototype.dismount = function dismount() {
    this._rootNode.dismount();
};

function _bindEvents(node) {
    var listener = getEventReceiver({
            eventName: 'change-depth',
            groupName: this.groupName,
            callback: function(data) {
                _changeDepth.call(this, data);
            }.bind(this)
        });
    node.addManagedComponent(listener);
}

function _bindResize(node) {
    node.addManagedComponent({
        onSizeChange: function(x, y) {
            this.contentNode.setAbsoluteSize(x, y);
        }.bind(this)
    });
}

function _changeDepth (z) {
    if (_.isUndefined(z)) {
        throw new Error('Z not defined for ZDiv');
    }
    this.el.setProperty('z-index', z);
    this.setPosition(0, 0, z * 2);
}

module.exports = ZDiv;