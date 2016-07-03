var DOMElement          = require('jokismo_engine_fork/dom-renderables/DOMElement'),
    Node                = require('jokismo_engine_fork/core/Node'),
    _                   = require('lodash'),
    Promise             = require('bluebird'),
    AnimateScale        = require('../../components/animation/AnimateScale'),
    EventRipple         = require('../../components/ui/EventRipple'),
    getEventReceiver    = require('../../utils/getEventReceiver'),
    globalStore         = require('../../utils/globalStore');

var _defaults = {
    templates: {
        outer: '<div class="width-100 height-100">' +
        '<div class="p-absolute pointer">' +
            '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">' +
            '<rect fill="none" stroke="{0}" stroke-width="2" x="17" y="17" width="14" height="14" rx="2" ry="2"/>' +
            '</svg>' +
        '</div>' +
        '<div class="p-absolute f-body-one color-black-87" style="left: 48px; padding: 14px 8px 0 8px">{1}</div>' +
        '</div>' +
        '</div>',
        center: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">' +
        '<rect fill="{0}" x="19" y="19" width="10" height="10" rx="2" ry="2"/>' +
        '</svg>'
    },
    layout: {
        lineMargin: 100,
        formPaddingX: 0
    },
    colorError: '#F44336',
    colorActive: '#3F51B5',
    colorInactive: '#212121'
};

function Checkbox(node, options) {
    this._rootNode = node;
    this._isActive = options.status || false;
    this._modelKey = options.modelKey || '';
    this._isRequired = options.required || false;
    this._options = options;
    node.setSizeMode('relative', 'absolute')
        .setAbsoluteSize(0, 72);
    this._el = new DOMElement(node);
    EventRipple.syncEventsToRipple(this._rootNode, {
        backgroundClassList: ['radius-24'],
        ripple: {
            classList: ['bg-black-54'],
            radius: 150,
            baseScale: 0.12,
            z: 4
        },
        clickMap: {
            fixed: false,
            x: [{
                min: 0,
                max: 48,
                y: [[0, 48]]
            }]
        },
        size: {
            fixed: true,
            x: 48,
            y: 48
        },
        clickFunc: _clickFunc.bind(this)
    });
    _renderHTML.call(this, options);
}

Checkbox.prototype.getValue = function() {
    var valid = this._isRequired ? this._isActive : true;
    if (!valid) {
        _renderHTML.call(this, this._options, this._options.colorError || _defaults.colorError);
    }
    return {
        valid: valid,
        val: this._isActive,
        key: this._modelKey
    }
};

function _renderCenter(options) {
    var centerTemplate = options.templates && options.templates.center || _defaults.templates.center,
        colorActive = options.colorActive || _defaults.colorActive;
    this._centerNode = this._rootNode.addChild()
        .setSizeMode('absolute', 'absolute')
        .setAbsoluteSize(48, 48)
        .setPosition(0, 0, 2)
        .setOrigin(0.5, 0.5, 0)
        .setScale(0, 0, 1);
    new DOMElement(this._centerNode, {
        classes: ['events-none'],
        content: centerTemplate.format(colorActive)
    });
    this._centerNode.animation = new AnimateScale(this._centerNode);
    return this._centerNode.animation.start({
        x: 1,
        y: 1,
        duration: 300
    });
}

function _deRenderCenter() {
    if (this._centerNode) return this._centerNode.animation.start({
        x: 0,
        y: 0,
        duration: 300
    }).then(function() {
        this._centerNode.dismount();
        this._centerNode = null;
    }.bind(this));
}

function _renderHTML(options, colorOverride) {
    var template = options.templates && options.templates.outer || _defaults.templates.outer,
        colorActive = options.colorActive || _defaults.colorActive,
        colorInactive = options.colorInactive || _defaults.colorInactive,
        color = colorOverride || (this._isActive ? colorActive : colorInactive);
    this._el.setContent(template.format(color, options.display));
}

function _clickFunc() {
    this._rootNode._ripple.toggleActive(true);
    this._isActive = !this._isActive;
    if (this._isActive) {
        _renderCenter.call(this, this._options)
            .then(function() {
                _renderHTML.call(this, this._options);
                if (this._options.callback) this._options.callback(true);
            }.bind(this));
    } else {
        _deRenderCenter.call(this)
            .then(function() {
                _renderHTML.call(this, this._options);
                if (this._options.callback) this._options.callback(false);
            }.bind(this));
    }
}

module.exports = Checkbox;