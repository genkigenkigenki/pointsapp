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
        outer: '<div class="width-100" style="height: {0}px">{1}</div>',
        inner: '<div class="p-absolute" style="top: {0}px; left: {1}px;">' +
        '<div class="p-absolute pointer">' +
        '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">' +
        '<circle fill="none" stroke="{2}" stroke-width="2" cx="24" cy="24" r="7"/>' +
        '</svg>' +
        '</div>' +
        '{3}' +
        '</div>',
        center: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">' +
        '<circle fill="{0}" cx="24" cy="24" r="5"/>' +
        '</svg>',
        text: '<div class="{0} no-wrap f-subhead color-black-87 pad-8-h" style="left: 48px; line-height: 48px;">{1}</div>'
    },
    layout: {
        lineMargin: 100
    },
    colorActive: '#3F51B5',
    colorInactive: '#212121'
};

function Radio(node, options) {
    this._rootNode = node;
    node.setSizeMode('relative', 'render');
    this._el = new DOMElement(this._rootNode, {
        content: '<div class="width-100" style="height: 1px">&nbsp;</div>'
    });
    this._isVerticalStack = false;
    this._currentIndex = options.values.indexOf(options.default);

    this._clickMap = {
        fixed: false,
        x: []
    };
    this._clickSizes = {
        fixed: false,
        vals: []
    };
    this._values = options.values;
    this._modelKey = options.modelKey || '';
    EventRipple.syncEventsToRipple(this._rootNode, {
        backgroundClassList: ['radius-24'],
        ripple: {
            classList: ['bg-black-54'],
            radius: 150,
            baseScale: 0.12,
            z: 4
        },
        clickFunc: _clickFunc.bind(this, options)
    });
    _getRenderSizes.call(this, options)
        .then(function(val) {
            this._textSizes = val;
            _renderHTML.call(this, options);
            _renderCenter.call(this, options);
        }.bind(this));
}

Radio.prototype.getValue = function() {
    return {
        valid: true,
        val: this._values[this._currentIndex],
        key: this._modelKey
    }
};

function _clickFunc(options, indices) {
    var index = indices.x;
    if (index !== this._currentIndex) {
        this._currentIndex = index;
        _deRenderCenter.call(this)
            .then(_renderCenter.bind(this, options))
            .then(_renderHTML.bind(this, options))
            .then(function() {
                this._rootNode._ripple.toggleActive(true);
                if (options.callback) options.callback(options.values[this._currentIndex]);
            }.bind(this));
    } else this._rootNode._ripple.toggleActive(true);
}

function _renderCenter(options) {
    var centerTemplate = options.templates && options.templates.center || _defaults.templates.center,
        colorActive = options.colorActive || _defaults.colorActive,
        posX = 0,
        posY = 0;
    for (var i = 0; i < this._currentIndex; ++i) {
        if (this._isVerticalStack) posY += 48;
        else posX += 48 + this._textSizes[i].x;
    }
    this._centerNode = this._rootNode.addChild()
        .setSizeMode('absolute', 'absolute')
        .setAbsoluteSize(48, 48)
        .setPosition(posX, posY, 2)
        .setOrigin(0.5, 0.5, 0)
        .setScale(0, 0, 1);
    new DOMElement(this._centerNode, {
        classes: ['events-none'],
        content: centerTemplate.format(colorActive)
    });
    this._centerNode.animation = new AnimateScale(this._centerNode);
    return this._centerNode.animation.start({
        x: 1,
        y: 1
    });
}

function _deRenderCenter() {
    if (this._centerNode) return this._centerNode.animation.start({
        x: 0,
        y: 0
    }).then(function() {
        this._centerNode.dismount();
        this._centerNode = null;
    }.bind(this));
}


function _renderHTML(options) {
    var windowWidth = globalStore.get('windowWidth'),
        outerTemplate = options.templates && options.templates.outer || _defaults.templates.outer,
        innerTemplate = options.templates && options.templates.inner || _defaults.templates.inner,
        textTemplate = options.templates && options.templates.text || _defaults.templates.text,
        lineMargin = options.layout && options.layout.lineMargin || _defaults.layout.lineMargin,
        display = options.display ? options.display : options.values,
        colorActive = options.colorActive || _defaults.colorActive,
        colorInactive = options.colorInactive || _defaults.colorInactive,
        color,
        html = '',
        yPos = 0,
        xPos = 0,
        width = 0,
        size;
    this._clickMap.x = [];
    this._clickSizes.vals = [];
    for (var i = 0; i < display.length; ++i) {
        if (!this._isVerticalStack) {
            width += this._textSizes[i].x + 48;
            if (width > ( windowWidth - lineMargin )) this._isVerticalStack = true;
        }
    }
    for (i = 0; i < display.length; ++i) {
        size = this._textSizes[i];
        color = i === this._currentIndex ? colorActive : colorInactive;
        this._clickMap.x.push({
            min: xPos,
            max: xPos + 48,
            y: [[yPos, yPos + size.y]]
        });
        this._clickSizes.vals.push([[48, 48]]);
        html += innerTemplate.format(yPos, xPos, color, textTemplate.format('p-absolute', display[i]));
        if (this._isVerticalStack) yPos += size.y;
        else xPos += 48 + size.x;
        if (i === display.length - 1) yPos += size.y;
        this._el.setContent(outerTemplate.format(yPos, html));
    }
    EventRipple.changeClickMap(this._rootNode, this._clickMap, this._clickSizes);
}

function _getRenderSizes(options) {
    var promises = [],
        renderSizeManager = globalStore.get('renderSizeManager'),
        template = options.templates && options.templates.text || _defaults.templates.text,
        display = options.display ? options.display : options.values;
    for (var i = 0; i < display.length; ++i) {
        promises.push(renderSizeManager.getRenderSize({
            content: template.format('', display[i])
        }));
    }
    return Promise.all(promises);
}

module.exports = Radio;