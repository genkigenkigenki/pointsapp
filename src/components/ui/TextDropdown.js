var DOMElement          = require('jokismo_engine_fork/dom-renderables/DOMElement'),
    _                   = require('lodash'),
    getEventReceiver    = require('../../utils/getEventReceiver'),
    globalStore         = require('../../utils/globalStore'),
    DOMRequest          = require('../../utils/DOMAccess/request');

var _defaults = {
    colorLight: 'black-54',
    colorDark: 'black-87',
    border: 'b-bottom-black-54',
    svgFill: 'rgba(0, 0, 0, 0.54)',
    marginX: 0,
    font: 'f-body-one',
    titleFont: 'f-body-one',
    selectionPadding: 10
};

function TextDropdown(node, options) {
    this._value = this._defaultValue = options.display ? options.display[options.defaultIndex || 0] : options.values[options.defaultIndex || 0];
    this._node = node;
    //this._hackInit = false;
    node.setSizeMode('relative', 'absolute')
        .setAbsoluteSize(0, 84)
        .setPosition(0, 0, 2)
        .setDifferentialSize(-options.marginX * 2 || -_defaults.marginX * 2);
    _createDOMElement.call(this, node, options);
}

TextDropdown.prototype.getValue = function() {
    return this._value;
};

TextDropdown.prototype._setInitialState = function() {
    this._node.emit('setValue', {
        change: this._value !== this._defaultValue,
        value: this._defaultValue
    });
};

function _createDOMElement(node, options) {
    var content = '',
        title = options.title,
        padding = options.selectionPadding || _defaults.selectionPadding,
        colorLight = options.colorLight || _defaults.colorLight,
        svgFill = options.svgFill || _defaults.svgFill,
        skew = title ? Math.ceil(padding * 2) : 0,
        svgSkew = title ? Math.ceil(padding * 1.2) + skew : Math.ceil(padding * 1.7),
        borderSkew = svgSkew + Math.ceil(padding * 2.4),
        elementID = globalStore.getUniqueId();

    //this._node.addComponent({
    //    onShow: function() {
    //        if (!this._hackInit) {
    //            this._hackInit = true;
    //        } else {
    //            node.show();
    //        }
    //    }.bind(this)
    //});
    if (title) {
        content += '<span class="{0} {1}">{2}</span>'.format(options.titleFont || _defaults.titleFont, 'color-' + colorLight, title);
    }
    content += '<div class="{0} {1} {2} pointer p-absolute width-100" style="top: {3}" id="{4}">{5}</div>'
        .format(options.font || _defaults.font, 'color-' + (options.colorDark || _defaults.colorDark),
        'pad-{0}-v'.format(padding), skew + 'px', elementID, this._value);
    content += '<div class="p-absolute width-100 {0}" style="top: {1}px;"></div>'.format(options.border || _defaults.border, borderSkew);
    content += '<svg class="p-absolute" width="18" height="18" viewBox="0 0 32 32" ' +
    'style="top: {0}px; right: 0; cursor: pointer; pointer-events: none">'.format(svgSkew) +
    '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">' +
    '<path fill="{0}" transform="rotate(90, 16, 16)" d="M11.684,25.682L21.316,15.5L11.684,5.318V25.682z"></path>'.format(svgFill) +
    '</svg></svg>';
    new DOMElement(node, {
        tagName: 'div',
        content: content
    });
    node.registerEvent('click');
    node.addManagedComponent(getEventReceiver({
        eventName: 'setValue',
        callback: function(data) {
            this._value = data.value;
            if (data.change) DOMRequest.send({
                id: elementID,
                type: 'div',
                value: data.value
            });
        }.bind(this)
    }));
}


module.exports = TextDropdown;