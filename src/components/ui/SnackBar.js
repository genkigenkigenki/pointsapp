var DOMElement          = require('jokismo_engine_fork/dom-renderables/DOMElement'),
    Node                = require('jokismo_engine_fork/core/Node'),
    _                   = require('lodash'),
    AnimatePosition     = require('../../components/animation/AnimatePosition'),
    getEventReceiver    = require('../../utils/getEventReceiver'),
    globalStore         = require('../../utils/globalStore');

var _defaults = {
        padding: 0,
        bar: {
            template: '<div class="width-100 bg-grey">' +
            '<div class="color-white" style="padding: 24px 12px 24px 12px;" style="width: {0}px">{1}</div>' +
            '</div>'
        },
        button: {
            width: 150,
            height: 48,
            template: '<div class="height-100 d-flex flex-center">' +
            '<div class="pointer pad-12-v width-100 pointer f-center f-upper f-button color-white-87">{0}</div>' +
            '</div>'
        }
    };

function SnackBar(node, options) {
    this._rootNode = node;
    this._dismountFunc = options.dismountFunc || null;
    this._clickFunc = options.func || null;
    options = _.merge(_.cloneDeep(_defaults), options);
    _render.call(this, options);
    _disableClickPropagation.call(this);
}

SnackBar.prototype.dismount = function() {
    this._dismountFunc();
};

function _disableClickPropagation() {
    this._rootNode.registerEvent('click');
    this._rootNode.addManagedComponent(getEventReceiver({
        eventName: 'click',
        callback: function(event) {
            event.stopPropagation();
        }
    }));
}

function _render(options) {
    options.windowWidth = globalStore.get('windowWidth');
    _setSize.call(this, options);
    _renderText.call(this, options);
    if (options.buttonText) _renderButton.call(this, options);
    _show.call(this); // TODO onShow
}

function _setSize(options) {
    this._rootNode.setSizeMode('absolute', 'render')
        .setAbsoluteSize(options.windowWidth - ( options.padding * 2 ))
        .setPosition(options.padding, 100, 0);
    this._yPosition = -options.padding;
}

function _renderText(options) {
    var textWidth = options.windowWidth - options.button.width - (options.padding * 2);
    new DOMElement(this._rootNode, {
        content: options.bar.template.format(textWidth, options.text)
    });
}

function _renderButton(options) {
    var buttonNode;
    buttonNode = this._rootNode.addChild()
        .setAlign(1, 0.5, 0)
        .setMountPoint(1, 0.5, 0)
        .setPosition(-options.padding, 0, 2)
        .setSizeMode('absolute')
        .setAbsoluteSize(options.button.width, options.button.height);
    new DOMElement(buttonNode, {
        content: options.button.template.format(options.buttonText)
    });
    buttonNode.registerEvent('click');
    buttonNode.addManagedComponent(getEventReceiver({
        eventName: 'click',
        callback: function() {
            if (this._clickFunc) this._clickFunc();
            _hide.call(this);
        }.bind(this)
    }));
}

function _show() {
    this._animate = new AnimatePosition(this._rootNode);
    this._animate.start({
        y: this._yPosition,
        duration: 300
    }).then(_registerGlobalClick.bind(this));
}

function _hide() {
    _deRegisterGlobalClick.call(this);
    this._animate.start({
        y: 400
    }).then(function() {
        if (this._dismountFunc) this._dismountFunc();
    }.bind(this));
}

function _registerGlobalClick() {
    this._clickID = globalStore.registerGlobalEventCallback('interaction', 'click', _hide.bind(this));
    globalStore.set('globalClickActive', true);
}

function _deRegisterGlobalClick() {
    if (this._clickID) globalStore.deRegisterGlobalEvent('interaction', 'click', this._clickID);
    globalStore.set('globalClickActive', false);
}

module.exports = SnackBar;