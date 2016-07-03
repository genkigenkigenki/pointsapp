var DOMElement          = require('jokismo_engine_fork/dom-renderables/DOMElement'),
    Node                = require('jokismo_engine_fork/core/Node'),
    clock               = require('jokismo_engine_fork/core/FamousEngine').getClock(),
    _                   = require('lodash'),
    Promise             = require('bluebird'),
    AnimateOpacity      = require('../../components/animation/AnimateOpacity'),
    AnimateScale        = require('../../components/animation/AnimateScale'),
    ZDiv                = require('../../components/ui/ZDiv'),
    ScrollContainer     = require('../../components/ui/ScrollContainer'),
    SizeManager         = require('../../components/utils/SizeManager'),
    EventRipple         = require('../../components/ui/EventRipple'),
    getEventReceiver    = require('../../utils/getEventReceiver'),
    globalStore         = require('../../utils/globalStore');

var _defaults = {

};

function RippleToPaper(node, options) {
    _.merge(options, _defaults);
    this._rootNode = node;
    this._toggleNode = options.toggleNode || null;
    this._dismountFunc = options.dismountFunc || null;
    this._content = options.content || '';
    this._node = options.node || null;
    this._formID = options.formID || '';
    _renderPaper.call(this);
    _renderContent.call(this, options);
    this.show = function(secondaryDismountFunc) {
        if (secondaryDismountFunc) this._secondaryDismountFunc = secondaryDismountFunc;
        clock.setTimeout(_rippleIn.bind(this, options.posX, options.posY), 300);
    }
}

RippleToPaper.prototype.dismount = function() {
    if (this._dismountFunc) this._dismountFunc();
    if (this._secondaryDismountFunc) this._secondaryDismountFunc();
};

function _renderPaper() {
    var buttonNode;
    this._paperRootNode = this._rootNode.addChild()
        .setAlign(0.5, 0.5, 0)
        .setMountPoint(0.5, 0.5, 0)
        .setDifferentialSize(-100, -100);
    this._paperNode = new ZDiv(this._paperRootNode, {
        z: 0
    }).contentNode;
    this._buttonNode = new ZDiv(this._paperRootNode, {
        z: 50
    }).contentNode;
    buttonNode = this._buttonNode.addChild()
        .setSizeMode('absolute', 'absolute')
        .setAbsoluteSize(48, 48)
        .setAlign(1, 0, 0)
        .setMountPoint(0.5, 0.5, 0)
        .setOpacity(0);
    new DOMElement(buttonNode, {
        classes: ['shadow-one', 'bg-white', 'radius-24', 'pointer'],
        content: '<div class="p-absolute" style="top:10px; left: 10px;"><svg fill="#000000" height="28" viewBox="0 0 24 24" width="28" xmlns="http://www.w3.org/2000/svg"> <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/> <path d="M0 0h24v24H0z" fill="none"/> </svg></div>'
    });
    this._buttonAnimation = new AnimateOpacity(buttonNode);
    EventRipple.syncEventsToRipple(buttonNode, {
        scrollOverride: true,
        backgroundClassList: ['radius-24'],
        ripple: {
            z: 4
        },
        clickFunc: function() {
            if (this._toggleNode && this._toggleNode.isMounted()) this._toggleNode.show();
            this._buttonAnimation.start({
                opacity: 0
            }).then(function() {
                if (this._dismountFunc) this._dismountFunc();
                if (this._secondaryDismountFunc) this._secondaryDismountFunc();
            }.bind(this));
        }.bind(this)
    });
}

function _rippleIn(posX, posY) {
    var rippleNode,
        animation,
        opacityAnimation,
        parentNode,
        windowWidth = globalStore.get('windowWidth'),
        windowHeight = globalStore.get('windowHeight'),
        radius = windowHeight > windowWidth ? windowHeight : windowWidth,
        size;
    radius = Math.floor(radius * 1.2);
    size = radius * 2;
    parentNode = this._rootNode.addChild()
        .setSizeMode('absolute', 'absolute')
        .setAbsoluteSize(0, 0)
        .setPosition(posX, posY);
    rippleNode = parentNode.addChild()
        .setMountPoint(0.5, 0.5, 1)
        .setAlign(0.5, 0.5, 1)
        .setOrigin(0.5, 0.5, 1)
        .setSizeMode('absolute', 'absolute')
        .setAbsoluteSize(size, size)
        .setOpacity(0)
        .setScale(0.02, 0.02, 1);
    new DOMElement(rippleNode, {
        classes: ['bg-white'],
        properties: {
            'border-radius': radius + 'px'
        }
    });
    clock.setTimeout(function() {
        opacityAnimation = new AnimateOpacity(rippleNode);
        opacityAnimation.start({
            opacity: 1,
            duration: 200,
            curve: 'linear'
        });
        animation = new AnimateScale(rippleNode);
        animation.start({
            x: 1,
            y: 1,
            curve: 'outSine',
            duration: 600
        }).then(function() {
            new DOMElement(this._rootNode, {
                classes: ['bg-white']
            });
        }.bind(this)).then(function() {
            parentNode.dismount();
        }).then(function() {
            if (this._node) {
                this._contentNode.sizeManager.register(this._node.sizeManager ? this._node.sizeManager : this._node);
                this._contentNode.sizeManager.deRegister(this._contentSizeID);
                new DOMElement(this._contentNode, {
                    classes: ['width-100'],
                    content: '<div style="height: 10000px"></div>'
                });
                if (this._formID) this._scrollContainer.watchForm(this._formID);
                this._contentNode.addChild(this._node);
            } else {
                new DOMElement(this._contentNode, {
                    content: this._content
                });
            }
        }.bind(this)).then(this._buttonAnimation.start.bind(this._buttonAnimation, {
            opacity: 1
        })).then(function() {
            globalStore.set('globalClickActive', false);
            if (this._toggleNode) this._toggleNode.hide();
        }.bind(this));
    }.bind(this), 120);

}

function _renderContent(options) {
    this._scrollContainer = new ScrollContainer(this._paperNode, {
        bar: options.bar || false,
        shiftX: 24,
        shiftY: 24,
        shortenBar: 24
    });
    this._contentNode = new Node()
        .setSizeMode('relative', 'render');
    this._contentNode.sizeManager = new SizeManager({
        direction: 'y'
    });
    this._scrollContainer.initContent({
        node: this._contentNode,
        size: {
            mode: 'render'
        }
    });
    this._contentSizeID = this._contentNode.sizeManager.register(this._contentNode);
    ScrollContainer.registerChildNodeEvents(this._contentNode);
}

module.exports = RippleToPaper;