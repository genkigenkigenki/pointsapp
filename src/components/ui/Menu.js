var DOMElement          = require('jokismo_engine_fork/dom-renderables/DOMElement'),
    Node                = require('jokismo_engine_fork/core/Node'),
    _                   = require('lodash'),
    getEventReceiver    = require('../../utils/getEventReceiver'),
    globalStore         = require('../../utils/globalStore'),
    DOMRequest          = require('../../utils/DOMAccess/request'),
    ScrollContainer     = require('../../components/ui/ScrollContainer'),
    EventRipple         = require('../../components/ui/EventRipple'),
    AnimateScale        = require('../../components/animation/AnimateScale');

var _defaults = {
    multiNode: false,
    colorDark: 'black-87',
    marginX: 24,
    paddingLeft: 16,
    paddingTop: 8,
    height: 48,
    maxYStack: 4,
    lineHeight: 48,
    incrementX: 56,
    multiplierX: 3,
    font: 'f-body-one',
    background: 'white',
    shadowDepth: 'one',
    hover: 'grey' // set in backgrounds.less
};

function Menu(node, options) {
    this._init = true;
    //this._hackInit = false;
    this._eventId = '';
    this._id = globalStore.getUniqueId();
    this._callback = options.callback;
    this._dismountFunc = options.dismountFunc;
    this._values = options.values;
    this._rootNode = node;
    this._scrollContainer = _createContainer(node, options);
    this._contentNode = _createContent.call(this, options);
    this._scrollContainer.initContent({
        node: this._contentNode,
        overflowHidden: true,
        size: {
            mode: 'absolute'
        }
    });
    ScrollContainer.registerChildNodeEvents(this._contentNode);
    this._rootNode.registerEvent('click');
    node.addManagedComponent(getEventReceiver({
        eventName: 'click',
        callback: function(event) {
            event.stopPropagation();
        }.bind(this)
    }));
    this._rootNode.setScale(0, 0, 1);
    this._scaleAnimation = new AnimateScale(this._rootNode);
}

Menu.prototype.show = function() {
    this._toggle(true);
    this._registerToggle();
};

Menu.prototype.hide = function() {
    this._toggle(false);
};

Menu.prototype._toggle = function(bool) {
    if (!bool) this._deRegisterToggle();
    if (bool) this._rootNode.show();
    this._scaleAnimation.start({
        x: bool ? 1 : 0,
        y: bool ? 1 : 0,
        duration: 200
    })
        .then(function() {
            if (!bool) {
                this._rootNode.dismount();
                if (this._dismountFunc) this._dismountFunc();
            }
        }.bind(this));
};

Menu.prototype._deRegisterToggle = function() {
    if (this._eventId) {
        globalStore.deRegisterGlobalEvent('interaction', 'click', this._eventId);
        this._eventId = ''
    }
    globalStore.set('globalClickActive', false);
};

Menu.prototype._registerToggle = function() {
    globalStore.set('globalClickActive', true);
    if (!this._eventId) this._eventId = globalStore.registerGlobalEventCallback('interaction', 'click', function() {
        this._toggle(false);
    }.bind(this));
};

function _createContainer(node, options) {
    var numItems = options.values.length,
        maxYStack = options.maxYStack || _defaults.maxYStack,
        yStack = numItems > maxYStack ? maxYStack + 0.4 : numItems,
        itemHeight = options.height || _defaults.height,
        paddingTop = options.paddingTop || _defaults.paddingTop,
        height = Math.floor((yStack * itemHeight) + (paddingTop * 2)),
        incrementX = options.incrementX || _defaults.incrementX,
        multiplierX = options.multiplierX || _defaults.multiplierX,
        width = options.width ? options.width : incrementX * multiplierX,
        background = 'bg-' + (options.background || _defaults.background),
        shadowDepth = 'shadow-' + (options.shadowDepth || _defaults.shadowDepth);
    node.setSizeMode('absolute', 'absolute')
        .setAbsoluteSize(width, height);
    new DOMElement(node, {
        tagName: 'div',
        classes: [background, shadowDepth, 'oflow-hidden', 'radius-3']
    });
    return new ScrollContainer(node, {
        bar: true
    });
}

var _rippleClassList = ['bg-black-21'],
    _backgroundClassList = [];

function _createContent(options) {
    var html = '',
        node,
        color = options.colorDark || _defaults.colorDark,
        paddingLeft = options.paddingLeft || _defaults.paddingLeft,
        paddingTop = options.paddingTop || _defaults.paddingTop,
        height= options.height || _defaults.height,
        lineHeight= options.lineHeight || _defaults.lineHeight,
        font = options.font || _defaults.font,
        hover = options.hover || _defaults.hover,
        display = options.display ? options.display : options.values,
        clickMap = _createClickMap(options),
        styling = globalStore.get('hasTouch') ? 'class="p-absolute width-100 oflow-hidden no-wrap pad-{0}-h {1} color-{2}  pointer" '.format(
            paddingLeft.toString(), font, color
        ) :
        'class="p-absolute width-100 oflow-hidden no-wrap pad-{0}-h {1} color-{2} hover-{3} pointer" '.format(
            paddingLeft.toString(), font, color, hover
        );
    node = new Node()
        .setSizeMode('relative', 'absolute')
        .setAbsoluteSize(0, (display.length * height) + (paddingTop * 2));
    for (var i = 0; i < display.length; ++i) {
        html += '<div ' + styling +
        'style="height: {0}px; line-height: {1}px; top: {2}px">'.format(height, lineHeight, paddingTop + (height * i)) +
        '{0}</div>'.format(display[i]);
    }
    new DOMElement(node, {
        content: html
    });
    EventRipple.syncEventsToRipple(node, {
        globalClickSetter: true,
        backgroundClassList: _backgroundClassList,
        ripple: {
            classList: options.rippleClassList ? options.rippleClassList : _rippleClassList,
            z: 4
        },
        clickMap: clickMap.clickMap,
        size: clickMap.size,
        clickFunc: function(indices) {
            this._callback(indices.y);
            this._toggle(false);
        }.bind(this)
    });
    return node;
}

function _createClickMap(options) {
    var paddingTop = options.paddingTop || _defaults.paddingTop,
        height= options.height || _defaults.height;
    return {
        size: {
            fixed: true,
            y: height
        },
        clickMap: {
            fixed: true,
            y: {
                start: paddingTop,
                step: height,
                num: options.values.length
            }
        }
    }
}

module.exports = Menu;