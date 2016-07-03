var DOMElement          = require('jokismo_engine_fork/dom-renderables/DOMElement'),
    Node                = require('jokismo_engine_fork/core/Node'),
    clock               = require('jokismo_engine_fork/core/FamousEngine').getClock(),
    _                   = require('lodash'),
    Promise             = require('bluebird'),
    ScrollContainer     = require('../../components/ui/ScrollContainer'),
    AnimateOpacity      = require('../../components/animation/AnimateOpacity'),
    EventRipple         = require('../../components/ui/EventRipple'),
    getEventReceiver    = require('../../utils/getEventReceiver'),
    globalStore         = require('../../utils/globalStore');

var _defaults = {
    templates: {
        outer: '<div class="width-100" style="height: {0}px">{1}</div>',
        inner: '<a role="button" class="inline-block pointer pad-16-h {3} f-button f-upper f-center no-wrap" ' +
        'style="top: {0}px; right: {1}px; line-height: 48px; height: 48px;">{2}</a>'
    },
    layout: {
        lineMargin: 100,
        rightMargin: 0,
        formPaddingX: 0
    }
};

function ButtonGroup(node, options) {
    this._rootNode = node;
    this._rootNode.setSizeMode('relative', 'render');
    this._el = new DOMElement(this._rootNode, {
        content: '<div class="width-100" style="height: 1px">&nbsp;</div>'
    });
    this._clickMap = {
        fixed: false,
        x: []
    };
    this._clickSizes = {
        fixed: false,
        vals: []
    };
    this._functions = options.functions || null;
    this._clickFuncs = {};
    if (options.observerID) this._model = {};
    this._buttons = options.buttons;
    this._templates = options.templates ? _.merge(_.cloneDeep(_defaults.templates), options.templates) : _defaults.templates;
    this._layout = options.layout ? _.merge(_.cloneDeep(_defaults.layout), options.layout) : _defaults.layout;
    ScrollContainer.registerChildNodeEvents(this._rootNode);
    EventRipple.syncEventsToRipple(this._rootNode, {
        backgroundClassList: ['radius-3', 'bg-black-21'],
        ripple: {
            classList: ['bg-black-21'],
            radius: 120,
            baseScale: 0.02,
            z: 4
        },
        clickFunc: _clickFunc.bind(this)
    });
    this._rootNode.addManagedComponent({
        onSizeChange: _processButtons.bind(this)
    });
    _getRenderSizes.call(this, options)
        .then(function(val) {
            this._buttonSizes = val;
            _processButtons.call(this);
        }.bind(this));
}

ButtonGroup.prototype.changeModel = function(val, key) {
    this._model[key] = val;
    if (this._buttonSizes) _processButtons.call(this);
};

function _clickFunc(indices) {
    var id = indices.x.toString() + indices.y.toString(),
        funcID;
    if (this._functions) {
        for (var i = 0; i < this._clickFuncs[id].length; ++i) {
            funcID = this._clickFuncs[id][i];
            if (this._functions[funcID]) this._functions[funcID]();
        }
    }
    this._rootNode._ripple.toggleActive(true);
}

function _processButtons() {
    var button,
        nodeSize = this._rootNode.getSize(),
        formWidth = nodeSize && nodeSize[0] || 0,
        outerTemplate = this._templates.outer,
        innerTemplate = this._templates.inner,
        html = '',
        yPos = 0,
        xPos = 0,
        clickXPos = formWidth - this._layout.rightMargin,
        yStack = 0,
        xStack = 0,
        width = 0,
        size,
        stackVertical = false,
        shownButtons = [],
        show = true,
        watched;
    if (this._buttonSizes) {
        this._clickMap.x = [];
        this._clickSizes.vals = [];
        for (var i = 0; i < this._buttons.length; ++i) {
            show = true;
            button = this._buttons[i];
            if (button.show) {
                for (var j = 0; j < button.show.length; ++j) {
                    watched = button.show[j];
                    if (_.isUndefined(this._model[watched.id])) continue;
                    if (this._model[watched.id] !== watched.val) show = false;
                }
            }
            if (show) {
                if (!stackVertical) {
                    width += this._buttonSizes[i].x;
                    if (width > ( formWidth - this._layout.lineMargin )) stackVertical = true;
                }
                shownButtons.push(i);
            }
        }
        for (i = 0; i < shownButtons.length; ++i) {
            size = this._buttonSizes[shownButtons[i]];
            button = this._buttons[shownButtons[i]];
            this._clickMap.x.push({
                min: clickXPos - size.x,
                max: clickXPos,
                y: [[yPos, yPos + size.y]]
            });
            this._clickSizes.vals.push([[size.x, size.y]]);
            html += innerTemplate.format(yPos, xPos, button.display, 'p-absolute');
            this._clickFuncs[xStack.toString() + yStack.toString()] = button.funcs;
            if (stackVertical) {
                yPos += size.y;
                yStack += 1;
            }
            else {
                clickXPos -= size.x;
                xPos += size.x;
                xStack += 1;
            }
            if (i === shownButtons.length - 1) yPos += size.y;
        }
        this._el.setContent(outerTemplate.format(yPos, html));
        EventRipple.changeClickMap(this._rootNode, this._clickMap, this._clickSizes);
    }
}



function _getRenderSizes(options) {
    var promises = [],
        renderSizeManager = globalStore.get('renderSizeManager'),
        template = options.templates && options.templates.inner || _defaults.templates.inner;
    for (var i = 0; i < options.buttons.length; ++i) {
        promises.push(renderSizeManager.getRenderSize({
            content: template.format(0, 0, options.buttons[i].display, '')
        }));
    }
    return Promise.all(promises);
}

module.exports = ButtonGroup;