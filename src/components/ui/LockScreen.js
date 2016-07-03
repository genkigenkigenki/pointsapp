var DOMElement          = require('jokismo_engine_fork/dom-renderables/DOMElement'),
    Node                = require('jokismo_engine_fork/core/Node'),
    clock               = require('jokismo_engine_fork/core/FamousEngine').getClock(),
    _                   = require('lodash'),
    Promise             = require('bluebird'),
    AnimateOpacity      = require('../../components/animation/AnimateOpacity'),
    AnimateRotate       = require('../../components/animation/AnimateRotate'),
    ZDiv                = require('../../components/ui/ZDiv'),
    EventRipple         = require('../../components/ui/EventRipple'),
    getEventReceiver    = require('../../utils/getEventReceiver'),
    DOMRequest          = require('../../utils/DOMAccess/request'),
    globalStore         = require('../../utils/globalStore');

var _defaults = {
    bgClass: 'bg-black-87'
};

function LockScreen(node, options) {
    this._options = _.merge(_.cloneDeep(_defaults), options);
    this._rootNode = node
        .setOpacity(0);
    this._dismountFunc = this._options.dismountFunc || null;
    this._secondaryDismountFunc = this._options.secondaryDismountFunc || null;
    this._eventManagerID = globalStore.get('workerEventManager').register({
        type: 'message',
        func: _gotCaptcha.bind(this),
        signature: 'gotCaptcha'
    });
    _render.call(this);
    node.addManagedComponent({
        onShow: _show.bind(this)
    });
}

LockScreen.prototype.exit = function() {
    globalStore.get('workerEventManager').deRegister({
        type: 'message',
        id: this._eventManagerID,
        signature: 'gotCaptcha'
    });
    this._opacityAnimation.start({
        opacity: 0
    }).then(this._animation.cancel.bind(this._animation))
        .then(function() {
        if (this._dismountFunc) this._dismountFunc();
        if (this._secondaryDismountFunc) this._secondaryDismountFunc();
    }.bind(this));
};

LockScreen.prototype.getCaptcha = function() {
    return new Promise(function(resolve) {
        if (!this._options.captcha) resolve(true);
        else {
            this._resolveCaptcha = resolve;
        }
    }.bind(this));
};

function _gotCaptcha(data) {
    if (this._resolveCaptcha) this._resolveCaptcha(data);
    this._resolveCaptcha = null;
    this._centerOpacityAnimation.start({
        opacity: 0,
        duration: 1000
    }).then(function() {
        this._el.setContent(this._options.content);
        return this._centerOpacityAnimation.start({
            opacity: 1,
            duration: 1000,
            curve: 'easeIn'
        });
    }.bind(this)).then(function() {
        if (this._options.rotateY) this._animation.start({
            y: Math.PI * 2,
            forever: true,
            duration: 3000
        });
    }.bind(this));
}

function _render() {
    var centerNode,
        id,
        height;
    new DOMElement(this._rootNode, {
        classes: [this._options.bgClass]
    });
    centerNode = this._rootNode.addChild()
        .setSizeMode('render', 'render')
        .setAlign(0.5, 0.5, 0)
        .setMountPoint(0.5, 0.5, 0)
        .setPosition(0, 0, 150)
        .setOrigin(0.5, 0.5, 0.5);
    this._opacityAnimation = new AnimateOpacity([this._rootNode, centerNode]);
    this._centerOpacityAnimation = new AnimateOpacity(centerNode);
    this._el = new DOMElement(centerNode);
    if (this._options.rotateY) {
        this._animation = new AnimateRotate(centerNode);
    }
    if (this._options.captcha) {
        id = globalStore.getUniqueId();
        height = globalStore.get('windowWidth') > 500 ? 78 : 144;
        this._el.setContent('<div class="spacer-24"></div></div><div style="height: {1}px;" id="{0}"></div><div class="spacer-24"></div>'.format(id, height));
        DOMRequest.send({
            id: id,
            type: 'grecaptcha'
        });
    } else {
        this._el.setContent(this._options.content);
    }
}

function _show() {
    this._opacityAnimation.start({
        opacity: 1
    }).then(function() {
        if (this._options.rotateY && !this._options.captcha) this._animation.start({
            y: Math.PI * 2,
            forever: true,
            duration: 3000
        });
    }.bind(this));
}

module.exports = LockScreen;