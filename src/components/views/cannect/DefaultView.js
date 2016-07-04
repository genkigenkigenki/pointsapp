var DOMElement          = require('jokismo_engine_fork/dom-renderables/DOMElement'),
    clock               = require('jokismo_engine_fork/core/FamousEngine').getClock(),
    Node                = require('jokismo_engine_fork/core/Node'),
    Promise             = require('bluebird'),
    _                   = require('lodash'),
    ScrollContainer     = require('../../ui/ScrollContainer'),
    SizeManager         = require('../../utils/SizeManager'),
    globalStore         = require('../../../utils/globalStore');

function DefaultView(node, options) {
    this._rootNode = node;
    this._globalWatching = [];
    _createScrollContainer.call(this, options);
    _createContent.call(this, options);
}

DefaultView.prototype.cleanup = function() {
    var watching;
    for (var i = 0; i < this._globalWatching.length; ++i) {
        watching = this._globalWatching[i];
        globalStore.unWatch(watching.key, watching.index);
    }
    if (this.customCleanup) this.customCleanup();
    this._el.setContent('');
    globalStore.deRegisterPipe('outerPaperScroll', this._scrollContainer._syncScrollID);
};

DefaultView.prototype.addBanner = _addBanner;

function _createScrollContainer(options) {
    var layout = options.layout.paper;
    this._rootNode.setDifferentialSize(options.layout.fixedWidth ? 0 : -( layout.padding * 2 ),
        -layout.marginTop, 0)
        .setAlign(0.5, 1, 0)
        .setMountPoint(0.5, 1, 0);
    this._scrollContainer = new ScrollContainer(this._rootNode, {
        syncScroll: 'outerPaperScroll',
        shortenBar: 48,
        shiftX: options.mode === 'fixedWide' ? 60 : 0
    });
}

function _createContent(options) {
    var queueFunc = _queueRender.bind(this, options),
        key;
    this._contentNode = new Node();
    this._elementNode = this._contentNode.addChild()
        .setSizeMode('relative', 'render');
    this._contentNode.sizeManager = new SizeManager({
        direction: 'y'
    });
    this._contentNode.sizeManager.register(this._elementNode);
    key = 'windowWidth';
    this._globalWatching.push({
        index: globalStore.watch(key, queueFunc),
        key: key
    });
    key = 'windowHeight';
    this._globalWatching.push({
        index: globalStore.watch(key, queueFunc),
        key: key
    });
    this._el = new DOMElement(this._elementNode, {
        content: '<div style="height: 20px;">&nbsp;</div>'
    });
    this._scrollContainer.initContent({
        node: this._contentNode,
        size: {
            mode: 'render'
        }
    });
    ScrollContainer.registerChildNodeEvents(this._contentNode);
    ScrollContainer.registerChildNodeEvents(this._elementNode);
}

function _queueRender(options) {
    if (!this._renderQueued) {
        this._renderQueued = true;
        clock.setTimeout(function() {
            this._renderQueued = false;
            this.render();
        }.bind(this), 300);
    }
}

function _addBanner(html, options) {
    var svg = options.bannerSVG,
        layout = options.layout.paper,
        sizeY;
    options.sizeX = options.layout.fixedWidth || Math.floor(options.windowWidth - (layout.padding * 2));
    sizeY = Math.floor(svg.y * (options.sizeX / svg.x));
    html += svg.content.format(options.sizeX, sizeY);
    options.currentY = sizeY;
    return html;
}

module.exports = DefaultView;