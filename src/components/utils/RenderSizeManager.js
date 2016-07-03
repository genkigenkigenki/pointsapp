var Promise     = require('bluebird'),
    DOMElement  = require('jokismo_engine_fork/dom-renderables/DOMElement'),
    Node        = require('jokismo_engine_fork/core/Node');

function RenderSizeManager(options) {
    this._rootNode = options.node;
}

RenderSizeManager.prototype.getRenderSize = function(options) {
    var promise,
        el,
        node = new Node().setSizeMode('render', 'render')
            .setOpacity(0);
    promise = new Promise(function(resolve, reject) {
        node.addManagedComponent({
            onSizeChange: function(x, y) {
                if (x !== 0 && y !== 0) {
                    resolve({
                        x: Math.floor(x),
                        y: Math.floor(y),
                        id: options.id || 0
                    });
                }
            }
        });
    });
    el = new DOMElement(node, {
        content: options.content
    });
    this._rootNode.addChild(node); // TODO investigate was getting conflict here without double addChild
    return promise
        .then(function(val) {
            el.setContent('');
            node.dismount();
            return val;
        });
};

module.exports = RenderSizeManager;