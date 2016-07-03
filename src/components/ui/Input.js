var DOMElement          = require('jokismo_engine_fork/dom-renderables/DOMElement'),
    _                   = require('lodash'),
    getEventReceiver    = require('../../utils/getEventReceiver'),
    validation          = require('../../utils/validate'),
    globalStore         = require('../../utils/globalStore'),
    DOMRequest          = require('../../utils/DOMAccess/request'),
    ScrollContainer     = require('../../components/ui/ScrollContainer'),
    AnimateScale        = require('../../components/animation/AnimateScale'),
    AnimateOpacity      = require('../../components/animation/AnimateOpacity'),
    AnimatePosition     = require('../../components/animation/AnimatePosition');

var _defaults = {
    colorLight: 'black-54',
    colorDark: 'black-87',
    colorError: 'red',
    colorAccent: 'accent',
    marginX: 0,
    font: 'f-body-one',
    errorFont: 'f-caption',
    inputPadding: 12,
    titleScale: 0.8
};

validation.initialize({
    'alphabet': 'what up',
    'password': {
        length: 'aaa',
        noNumber: 'bbb'
    }
});

function Input (node, options) {
    var padding = options.inputPadding || _defaults.inputPadding,
        size = options.textarea ? Math.ceil(padding * 17.2) : Math.ceil(padding * 6.6);
    this._formID = options.formID || '';
    this._rootNode = node;
    this._value = this._defaultValue = options.defaultValue || '';
    this._modelKey = options.modelKey || null;
    this._validationResult = {};
    this._validation = options.validation || null;
    this._equalityCheck = options.equalityCheck || null;
    if (!options) options = {};
    this._options = options;
    node.setSizeMode('relative', 'absolute')
        .setDifferentialSize(-options.marginX * 2 || -_defaults.marginX * 2)
        .setAbsoluteSize(0, size)
        .setPosition(0, 0, 2);
    _createElements.call(this, node, options);
    node.addManagedComponent({
        onShow: this._setInitialState.bind(this)
    });
    node.addManagedComponent(getEventReceiver({
        eventName: 'mouseenter',
        callback: function(event) {
            this._mouseActive = true;
        }.bind(this)
    }));
    node.addManagedComponent(getEventReceiver({
        eventName: 'focusin',
        callback: function(event) {
            if (globalStore.get('hasMouse') && this._rootNode.cachedMenuPosition && this._formID && !this._mouseActive) {
                globalStore.set('inputTabWatch' + this._formID, this._rootNode.cachedMenuPosition[1]);
            }
            this._mouseActive = false;
            event.stopPropagation();
            node.emit('focusIn');
        }.bind(this)
    }));
    node.addManagedComponent(getEventReceiver({
        eventName: 'focusout',
        callback: function(event) {
            event.stopPropagation();
            node.emit('focusOut', {
                isDirty: this._value.length > 0
            });
        }.bind(this)
    }));
    node.addManagedComponent(getEventReceiver({
        eventName: 'setValue',
        callback: function(val) {
            this._value = val.value;
            if (this._error) this._error = null;
        }.bind(this)
    }));
    node.addManagedComponent(getEventReceiver({
        eventName: 'input',
        callback: _inputFunc.bind(this)
    }));
}

function _inputFunc(event) {
    var valid;
    event.stopPropagation();
    this._value = event.value;
    if (this._validation && this._value.length === 0 && !_.includes(this._validation, 'required')) valid = true;
    else valid = this._isValid();
    if (valid) {
        this._rootNode.emit('isNotError');
        if (this._error) this._error = null;
        if (this._options.callback) this._options.callback(this._value);
    } else {
        if (!this._error) this._error = new Error(this._rootNode, this._options);
        this._rootNode.emit('isError', {
            error: this._validationResult.error
        });
    }
    this._rootNode.emit('titleShift');
}

Input.prototype._setInitialState = function() {
    this._rootNode.emit('setValue', {
        change: this._value !== this._defaultValue,
        value: this._defaultValue
    });
    if (this._error) this._error = null;
};

Input.prototype._isValid = function() {
    var equalityValue = this._equalityCheck ? this._equalityCheck.model[this._equalityCheck.key] : null;
    if (this._validation) this._validationResult = validation.isValid(this._value, this._validation, equalityValue);
    return this._validation ? this._validationResult.result : true;
};

Input.prototype.getValue = function() {
    var valid;
    if (this._validation && this._value.length === 0 && !_.includes(this._validation, 'required')) valid = true;
    else valid = this._isValid();
    if (valid) {
        this._rootNode.emit('isNotError');
        if (this._error) this._error = null;
        return {
            valid: true,
            val: this._value,
            key: this._modelKey
        };
    } else {
        if (!this._error) this._error = new Error(this._rootNode, this._options);
        this._rootNode.emit('isError', {
            error: this._validationResult.error
        });
        return {
            valid: false,
            key: this._modelKey
        }
    }
};

Input.prototype.isValid = function() {
    return this._isValid();
};

function _createElements(node, options) {
    new Title(node, options);
    new InputField(node, options);
}

function Title(node, options) {
    var padding = options.inputPadding || _defaults.inputPadding,
        font = options.font || _defaults.font,
        title = options.title;
    this._rootNode = node;
    this._inputPadding = padding;
    this._isTextarea = !!options.textarea;
    node = node.addChild();
    this._scaleDown = options.titleScale || _defaults.titleScale;
    this._posY = this._isTextarea ? Math.ceil(padding * 11.2) : Math.ceil(padding * 1.8);
    this._shiftY = 0;
    this._isError = false;
    this._isShifted = false;
    this._inputIsDirty = false;
    this._colorMap = {
        normal: options.colorLight || _defaults.colorLight,
        accent: options.colorAccent || _defaults.colorAccent,
        error: options.colorError || _defaults.colorError
    };
    _createTitle.call(this, node, 'normal', font, title, options.colorLight || _defaults.colorLight, 1);
    this._scaleAnimation = new AnimateScale(node);
    this._positionAnimation = new AnimatePosition(node);
    _registerTitleEvents.call(this, node);
    node.setPosition(0, this._posY, 0);
}

Title.prototype._showType = _showType;

function _showType(type) {
    _.forEach(this._colorMap, function(val, key) {
        if (key === type) {
            this._el.addClass('color-' + val);
            if (this._lineNode) this._lineNode.el.addClass('bg-' + val);
        }
        else {
            this._el.removeClass('color-' + val);
            if (this._lineNode) this._lineNode.el.removeClass('bg-' + val);
        }
    }.bind(this));
}

function _createLine() {
    var bgColor = 'bg-' + (this._isError ? this._colorMap.error : this._colorMap.accent);
    this._lineNode = this._rootNode.addChild()
        .setOrigin(0.5, 0.5)
        .setPosition(0, this._isTextarea ? Math.ceil(this._inputPadding * 13.8) : Math.ceil(this._inputPadding * 4.2), 4)
        .setSizeMode('relative', 'absolute')
        .setAbsoluteSize(0, 2)
        .setScale(0, 0, 1);
    this._lineNode.el = new DOMElement(this._lineNode, {
        tagName: 'div',
        classes: [bgColor, 'events-none'],
        properties: {
            'z-index': 2
        }
    });
    this._lineNode.animation = new AnimateScale(this._lineNode);
}

function _toggleLine(bool) {
    if (this._lineNode) {
        this._lineNode.animation.start({
            x: bool ? 1 : 0,
            y: bool ? 1 : 0,
            duration: 400
        }).then(function() {
            if (!bool) {
                this._lineNode.dismount();
                this._lineNode = null;
            }
        }.bind(this));
    }
}

function _registerTitleEvents(node) {
    node.addManagedComponent(getEventReceiver({
        eventName: 'focusIn',
        callback: function() {
            this._isShifted = true;
            this._moveToShifted(true);
            if (!this._lineNode) _createLine.call(this);
            _toggleLine.call(this, true);
        }.bind(this)
    }));
    node.addManagedComponent(getEventReceiver({
        eventName: 'titleShift',
        callback: function() {
            if (!this._isShifted) this._moveToShifted(true, true);
        }.bind(this)
    }));
    node.addManagedComponent(getEventReceiver({
        eventName: 'focusOut',
        callback: function(data) {
            this._inputIsDirty = data.isDirty;
            this._isShifted = false;
            this._moveToShifted(false);
            _toggleLine.call(this, false);
        }.bind(this)
    }));
    node.addManagedComponent(getEventReceiver({
        eventName: 'isError',
        callback: function() {
            this._showType('error');
            this._isError = true;
        }.bind(this)
    }));
    node.addManagedComponent(getEventReceiver({
        eventName: 'isNotError',
        callback: function() {
            this._isError = false;
            this._showType(this._isShifted ? 'accent' : 'normal');
        }.bind(this)
    }));
    node.addManagedComponent(getEventReceiver({
        eventName: 'setValue',
        callback: function(data) {
            this._inputIsDirty = data.value.length > 0;
            this._isError = false;
            this._moveToShifted(this._inputIsDirty, true);
        }.bind(this)
    }));
}

Title.prototype._moveToShifted = function(bool, init) {
    var scale = bool ? this._scaleDown : 1,
        posY = bool ? this._shiftY : this._posY;
    bool && !init ? (this._isError ? this._showType('error') : this._showType('accent')) : this._showType('normal');
    if (!bool && this._inputIsDirty) return;
    this._scaleAnimation.start({
        x: scale,
        y: scale,
        duration: 450
    });
    this._positionAnimation.start({
        y: posY,
        duration: 450
    });
};

function _createTitle(node, type, font, title, color, opacity) {
    node.titleType = type;
    this._el = new DOMElement(node, {
        tagName: 'div',
        classes: ['events-none', font, 'color-' + color],
        content: title
    });
    node.setOpacity(opacity);
    node.animation = new AnimateOpacity(node);
    return node;
}

function InputField(node, options) {
    var font = options.font || _defaults.font,
        color = options.colorDark || _defaults.colorDark,
        padding = options.inputPadding || _defaults.inputPadding,
        defaultValue = options.defaultValue || '',
        nameString = ' ',
        childNode = node.addChild()
            .setPosition(0, options.textarea ? Math.ceil(padding * 1.4) : Math.ceil(padding * 0.7), 2)
            .setSizeMode('relative', 'render');
    this._id = globalStore.getUniqueId();
    if (options.htmlType) nameString += "type='{0}' ".format(options.htmlType);
    if (options.htmlName) nameString += "name='{0}' ".format(options.htmlName);
    new DOMElement(childNode, {
        tagName: 'div',
        id: this._id,
        classes: ['color-' + color],
        content: options.textarea ?
        '<textarea{3}class="width-100 font-override {0} {1}" rows="5" value="{2}" style="color: inherit">'.format(font, 'pad-{0}-v'.format(padding.toString()), defaultValue, nameString) +
        '</textarea>' +
        '<div class="b-bottom-black-54 p-absolute width-100" style="top:{0}px;"></div>'.format(Math.floor(padding * 12.5)) :
        '<input{3}class="width-100 font-override {0} {1}" value="{2}" style="color: inherit">'.format(font, 'pad-{0}-v'.format(padding.toString()), defaultValue, nameString) +
        '<div class="b-bottom-black-54 p-absolute width-100" style="top:{0}px;"></div>'.format(Math.floor(padding * 3.5))
    });
    childNode.registerEvent('click');
    childNode.registerEvent('focusin');
    childNode.registerEvent('focusout');
    childNode.registerEvent('input');
    childNode.registerEvent('mouseenter');
    ScrollContainer.registerChildNodeEvents(childNode);
    childNode.addManagedComponent(getEventReceiver({
        eventName: 'click',
        callback: function(formID, event) {
            var pageHeight = globalStore.get('windowHeight'),
                yPos = event.y;
            if (yPos > pageHeight - 330) {
                globalStore.set('inputWatch' + options.formID, yPos - (pageHeight - 300));
            }
        }.bind(null, options.formID)
    }));
    _registerValueChange.call(this, childNode);
}

function _registerValueChange(node) {
    node.addManagedComponent(getEventReceiver({
        eventName: 'setValue',
        callback: function(data) {
            if (data.change) DOMRequest.send({
                id: this._id,
                type: 'value',
                value: data.value
            });
        }.bind(this)
    }));
}

function Error(node, options) {
    var font = options.errorFont || _defaults.errorFont,
        color = options.colorError || _defaults.colorError,
        padding = options.inputPadding || _defaults.inputPadding,
        childNode = node.addChild()
            .setPosition(0, options.textarea ? Math.ceil(padding * 14.6) : Math.ceil(padding * 5), 0)
    //    validationType = _.isArray(options.validation) ? options.validation[0] : options.validation;
    //this.content = validation.getErrorText(validationType);
    this.el = new DOMElement(childNode, {
        tagName: 'div',
        classes: [font, 'color-' + color, 'events-none']
        //content: this.content
    });
    childNode.setOpacity(0);
    childNode.animation = new AnimateOpacity(childNode);
    _registerErrorEvents.call(this, childNode);
    childNode.show();
    childNode.animation.start({
        opacity: 1
    });
}

Error.prototype.dismount = function() {

};

function _registerErrorEvents(node) {
    node.addManagedComponent(getEventReceiver({
        eventName: 'isError',
        callback: function(data) {
            this.el.setContent(data.error);
        }.bind(this)
    }));
    node.addManagedComponent(getEventReceiver({
        eventName: 'isNotError',
        callback: function() {
            node.animation.start({
                opacity: 0
            }).then(function() {
                node.dismount();
            });
        }
    }));
    node.addManagedComponent(getEventReceiver({
        eventName: 'setValue',
        callback: function() {
            node.animation.start({
                opacity: 0
            }).then(function() {
                node.dismount();
            });
        }
    }));
}

module.exports = Input;