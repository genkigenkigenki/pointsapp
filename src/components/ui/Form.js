var DOMElement          = require('jokismo_engine_fork/dom-renderables/DOMElement'),
    Node                = require('jokismo_engine_fork/core/Node'),
    clock               = require('jokismo_engine_fork/core/FamousEngine').getClock(),
    _                   = require('lodash'),
    Promise             = require('bluebird'),
    AnimateOpacity      = require('../../components/animation/AnimateOpacity'),
    AnimatePosition     = require('../../components/animation/AnimatePosition'),
    Input               = require('../../components/ui/Input'),
    TextDropdown        = require('../../components/ui/TextDropdown'),
    Menu                = require('../../components/ui/Menu'),
    ButtonGroup         = require('../../components/ui/ButtonGroup'),
    Checkbox            = require('../../components/ui/Checkbox'),
    Radio               = require('../../components/ui/Radio'),
    EventRipple         = require('../../components/ui/EventRipple'),
    ScrollContainer     = require('../../components/ui/ScrollContainer'),
    SizeManager         = require('../utils/SizeManager'),
    ZDiv                = require('../../components/ui/ZDiv'),
    getEventReceiver    = require('../../utils/getEventReceiver'),
    globalStore         = require('../../utils/globalStore'),
    DOMRequest          = require('../../utils/DOMAccess/request'),
    PathObserver        = require('observe-js').PathObserver;

var _defaults = {
    templates: {
        title: '<div class="p-absolute {colorClass} {fontClass}" style="top: {offsetTop}px;">{display}' +
        '</div>'
    },
    layout: {
        form: {
            paddingX: 36,
            outerPaddingX: 24
        },
        title: {
            height: 148,
            offsetTop: 96,
            colorClass: 'color-black-87',
            fontClass: 'f-title'
        }
    },
    submitTimeout: 10000
};

var _dummyNode = new Node()
    .setSizeMode('absolute', 'absolute')
    .setAbsoluteSize(0, 0);

function Form(node, options) {
    this._formID = globalStore.getUniqueId();
    this._rootNode = node;
    this._formNode = new ZDiv(node.addChild(), {
        z: 10
    }).contentNode.addChild()
        .setSizeMode('relative', 'absolute')
        .setAbsoluteSize(0, 0);
    new DOMElement(this._formNode, {
        tagName: 'form'
    });
    ScrollContainer.registerChildNodeEvents(this._formNode);
    this._sizeManager = node.sizeManager = new SizeManager({
        direction: 'y',
        positionArray: true
    });
    this._captcha = options.formData.captcha || false;
    this._nodes = [];
    this._modelValidation = [];
    this._observers = {};
    this._observed = {};
    this._functions = {};
    this._pathObservers = [];
    this._globalWatching = [];
    this._id = options.formData.id ? options.formData.id : '';
    this._menuZ = 20;
    this._submitTimeout = options.formData.submitTimeout || _defaults.submitTimeout;
    this._templates = options.formData.templates ? _.merge(_.cloneDeep(_defaults.templates), options.formData.templates) : _defaults.templates;
    this._layout = options.formData.layout ? _.merge(_.cloneDeep(_defaults.layout), options.formData.layout) : _defaults.layout;
    this._model = options.model;
    this._submitObject = options.formData.submitObject || {};
    if (!options.formData.fixedSize) {
        node.setAlign(0.5, 0, 0)
            .setMountPoint(0.5, 0, 0)
            .setDifferentialSize(-(this._layout.form.paddingX * 2));
    }
    _renderForm.call(this, options.formData.fields);
    _positionNodes.call(this);
    node.addComponent({
        onShow: _.once(_setObservers.bind(this, options.formData.watch))
    });
    node.addComponent({
        onDismount:  this.cleanup.bind(this) // TODO once?
    });
}

Form.prototype.createMenuNode = function createMenu() {
    this._menuZ += 10;
    return new ZDiv(this._rootNode.addChild(), {
        z: this._menuZ
    });
};

Form.prototype.cleanup = function() {
    for (var i = 0; i < this._globalWatching.length; ++i) {
        globalStore.unWatch.apply(null, this._globalWatching[i]);
    }
    for (i = 0; i < this._pathObservers.length; ++i) {
        this._pathObservers[i].close();
    }
    this._pathObservers = [];
    this._globalWatching = [];
};

Form.prototype.registerFunction = function(key, f) {
    this._functions[key] = f;
};

Form.prototype.cleanupInputs = function() {
    var node;
    // TODO cleanup model
    if (this._cleanupInputs) {
        for (var i = 0; i < this._cleanupInputs.length; ++i) {
            node = this._cleanupInputs[i];
            node.emit('setValue', {
                change: true,
                value: ''
            });
        }
    }
};

Form.submit = function(options) {
    var valid = _formIsValid.call(this),
        submitObject = this._submitObject,
        captchaComplete = globalStore.get('captchaComplete'),
        lockScreen;
    if (!valid) {
        globalStore.get('showSnackBar')({
            text: options && options.formIncomplete || 'Please correct the fields with error messages.'
        });
    } else {
        globalStore.get('workerEventManager').sendMessage('analyticsEvent', {
            category: 'Form',
            action: 'submit',
            label: options.requestID
        });
        lockScreen = globalStore.get('showLockScreen')({
            rotateY: true,
            content: globalStore.get('logoSVG').format(144, 144, '#ffffff'),
            captcha: this._captcha && !captchaComplete
        });
        lockScreen.getCaptcha()
            .then(function() {
                if (options.processSubmitObject) submitObject = options.processSubmitObject(submitObject);
                this.cleanupInputs();
                _sendRequest.call(this, options.requestID, submitObject)
                    .then(function(data) {
                        if (data.error) {
                            if (options.fail.textMap && options.fail.textMap[data.error]) {
                                return {
                                    text: options.fail.textMap[data.error]
                                };
                            } else return options.fail;
                        }
                        if (options.processData) return options.processData(data.data);
                    })
                    .then(_showSnackBar.bind(null, options.success))
                    .catch(_showSnackBar.bind(null, options.timeout))
                    .finally(lockScreen.exit.bind(lockScreen));
            }.bind(this));
    }
};

function _showSnackBar(options, data) {
    var config = {
        text: data && data.text || options.text
    };
    if (data && data.buttonText) config.button = data.buttonText;
    else if (options.buttonText) config.button = options.buttonText;
    if (options.func) config.func = options.func;
    globalStore.get('showSnackBar')(config);
}

function _sendRequest(requestID, submitObject) {
    globalStore.get('workerEventManager').sendMessage('HTTPRequest', {
        formID: this._formID,
        requestID: requestID,
        data: submitObject
    });
    return new Promise(function(id, timeout, resolve, reject) {
        _waitForHTTP(resolve, reject, id, timeout);
    }.bind(null, this._formID, this._submitTimeout));
}

function _waitForHTTP(resolve, reject, id, timeout, totalTime) {
    var data;
    if (!totalTime) totalTime = 0;
    clock.setTimeout(function() {
        totalTime += 1000;
        if (globalStore.get(id)) {
            data = globalStore.get(id);
            globalStore.remove(id);
            resolve(data);
        } else {
            if (totalTime > timeout) reject();
            else _waitForHTTP(resolve, reject, id, timeout, totalTime);
        }
    }, totalTime === 0 ? 3000 : 1000);
}

function _setObservers(data) {
    if (data) {
        clock.setTimeout(function() {
            var watchData,
                watchIndex,
                watchFunc,
                pathObserver;
            for (var i = 0; i < data.length; ++i) {
                watchData = data[i];
                if (watchData && watchData.type) {
                    switch (watchData.type) {
                        case 'global':
                            watchFunc = _getEvent.call(this, watchData, watchData.key);
                            watchIndex = globalStore.watch(watchData.key, watchFunc);
                            this._globalWatching.push([watchData.key, watchIndex]);
                            if (globalStore.get(watchData.key)) watchFunc(globalStore.get(watchData.key));
                            break;
                        case 'field':
                            watchFunc = _getEvent.call(this, watchData);
                            pathObserver = new PathObserver(this._observed, watchData.key);
                            watchFunc(pathObserver.open(watchFunc));
                            this._pathObservers.push(pathObserver);
                            break;
                    }
                }

            }
        }.bind(this), 1);
    }
}

function _getEvent(data, key) {
    return function(val) {
        var compVal,
            i,
            j;
        for (i = 0; i < data.vals.length; ++i) {
            compVal = data.vals[i];
            if (val === compVal.val || compVal.val === 'all') {
                if (compVal.hide) {
                    for (j = 0; j < compVal.hide.length; ++j) {
                        if (this._observers[compVal.hide[j]]) this._observers[compVal.hide[j]]._node.hide();
                    }
                }
                if (compVal.show) {
                    for (j = 0; j < compVal.show.length; ++j) {
                        if (this._observers[compVal.show[j]]) this._observers[compVal.show[j]]._node.show();
                    }
                }
                if (compVal.reRender) {
                    for (j = 0; j < compVal.reRender.length; ++j) {
                        if (this._observers[compVal.reRender[j]]) this._observers[compVal.reRender[j]].changeModel(val, key);
                    }
                }
            }
        }
    }.bind(this);
}

function _renderForm(data) {
    var node;
    for (var i = 0; i < data.length; ++i) {
        node = this._formNode.addChild();
        switch (data[i].type) {
            case 'title':
                _createComponent.call(this, _createTitle, data[i], node, true);
                break;
            case 'input':
                _createComponent.call(this, _createInput, data[i], node);
                break;
            case 'select':
                _createComponent.call(this, _createSelect, data[i], node);
                break;
            case 'buttonGroup':
                _createComponent.call(this, _createButtonGroup, data[i], node, true);
                break;
            case 'radio':
                _createComponent.call(this, _createRadio, data[i], node);
                break;
            case 'checkbox':
                _createComponent.call(this, _createCheckbox, data[i], node);
                break;
            case 'html':
                if (data[i].grecaptcha) this.captcha = true;
                _createComponent.call(this, _createHTML, data[i], node, true);
                break;
        }
    }
}

function _createComponent(func, data, node, noModel) {
    var component = func.call(this, data, node);
    if (data.xPos) {
        this._sizeManager.register(_dummyNode);
        node.formXPos = data.xPos;
    } else this._sizeManager.register(node, data.marginBottom ? data.marginBottom : 0);
    if (data.xRatio) node.formXRatio = data.xRatio;
    if (!noModel) this._modelValidation.push(component);
    this._nodes.push(component._rootNode);
    if (data.observerID) {
        this._observers[data[i].observerID] = component;
    }
    if (data.submit) this._submitObject[data.modelKey] = '';
    if (data.cleanup) {
        if (!this._cleanupInputs) this._cleanupInputs = [];
        this._cleanupInputs.push(node);
    }
}

function _formIsValid() {
    var value,
        valid = true;
    for (var i = 0; i < this._modelValidation.length; ++i) {
        value = this._modelValidation[i].getValue();
        if (!value.valid) valid = false;
        else {
            if (value.key) this._model[value.key] = value.val;
            if (!_.isUndefined(this._submitObject[value.key])) this._submitObject[value.key] = value.val;
        }
    }
    return valid;
}

function _positionNodes() {
    this._sizeManager.events.on('positionArray', function(positions) {
        var node,
            xPos,
            position,
            cache,
            width;
        for (var i = 0; i < positions.length; ++i) {
            node = this._nodes[i];
            if (node.formXRatio) {
                if (!width) width = this._formNode.getSize()[0];
                if (width) {
                    node.setSizeMode('absolute');
                    node.setAbsoluteSize(Math.floor(width * node.formXRatio));
                }
            }
            position = node.getPosition();
            if (node.formXPos && width) xPos = Math.floor(width * node.formXPos);
            else xPos = position[0];
            if (node.formXRatio && !node.formXPos) cache = positions[i];
            if (!(node.formXRatio || node.formXPos)) cache = 0;
            node.setPosition(xPos, cache ? cache : positions[i], position[2]);
            if (node.cachePositionForMenu) node.cachedMenuPosition = position;
        }
    }.bind(this));
}

function _createRadio(data, node) {
    if (!_.isUndefined(this._model[data.model])) {
        data.default = this._model[data.model];
    }
    if (data.observedID) {
        this._observed[data.observedID] = data.default;
        data.callback = function(input) {
            this._observed[data.observedID] = input;
        }.bind(this);
    }
    return new Radio(node, data);
}

function _createCheckbox(data, node) {
    if (!_.isUndefined(this._model[data.model])) {
        data.status = this._model[data.model];
    }
    if (data.observedID) {
        this._observed[data.observedID] = data.status;
        data.callback = function(bool) {
            this._observed[data.observedID] = bool;
        }.bind(this);
    }
    return new Checkbox(node, data);
}

function _createHTML(data, node) {
    node.setSizeMode('relative', 'render');
    return new HTMLField(node, data);
}

function HTMLField(node, data) {
    var id,
        height;
    this._rootNode = node;
    if (data.grecaptcha) {
        id = globalStore.getUniqueId();
        height = globalStore.get('windowWidth') > 500 ? 78 : 144;
        data.template = '<div class="spacer-24"></div></div><div style="height: {1}px;" id="{0}"></div><div class="spacer-24"></div>'.format(id, height);
        DOMRequest.send({
            id: id,
            type: 'grecaptcha'
        });
    }
    this._template = data.template;
    this._el = new DOMElement(node, {
        content: data.placeholder ? data.placeholder : data.template
    });
}

HTMLField.prototype.changeModel = function(val) {
    this._el.setContent(this._template.format(val));
};

function _createButtonGroup(data, node) {
    if (!data.layout) data.layout = {};
    data.functions = this._functions;
    return new ButtonGroup(node, data);
}

function _createTitle(data, node) {
    var layout = this._layout.title,
        template = this._templates.title;
    node.setSizeMode('relative', 'absolute')
        .setAbsoluteSize(0, layout.height);
    layout.display = data.display;
    new DOMElement(node, {
        content: template.format(layout)
    });
    return {
        _rootNode: node
    }
}

function _createInput(data, node) {
    if (this._model[data.model]) data.defaultValue = this._model[data.model];
    if (!_.isUndefined(this._model[data.model])) {
        data.defaultValue = this._model[data.model];
    }
    data.formID = this._formID;
    if (data.observedID) {
        this._observed[data.observedID] = data.defaultValue;
        data.callback = function(input) {
            this._observed[data.observedID] = input;
            if (data.callbackFunc) data.callbackFunc();
        }.bind(this);
    }
    if (data.equality) {
        data.equalityCheck = {
            model: this._observed,
            key: data.equality
        }
    }
    node.cachePositionForMenu = true;
    return new Input(node, data);
}

function _createSelect(data, node) {
    node.cachePositionForMenu = true;
    return new Select(data, node, this.createMenuNode.bind(this), this._model, this._observed);
}

function Select(data, node, createMenuNode, model, observed) {
    var index;
    this.dropdown = new TextDropdown(node, data);
    this._index = data.defaultIndex;
    this._data = data;
    if (model[data.model]) {
        index = data.values.indexOf(model[data.model]);
        if (index !== -1) {
            data.defaultIndex = index;
            this._index = index;
        }
    }
    this._rootNode = node;
    this._modelKey = data.modelKey || null;
    if (data.observedID) {
        observed[data.observedID] = data.values[this._index];
    }
    data.callback = function(index) {
        var value = data.display ? data.display[index] : data.values[index];
        if (data.callbackFunc) data.callbackFunc(index);
        this._index = index;
        this._rootNode.emit('setValue', {
            change: this.dropdown.getValue() !== value,
            value: value
        });
        if (data.observedID) {
            observed[data.observedID] = value;
            Platform.performMicrotaskCheckpoint();
        }
    }.bind(this);
    node.addManagedComponent(getEventReceiver({
        eventName: 'click',
        callback: _createMenuOnClick.bind(this, createMenuNode, data)
    }));
}

Select.prototype.getValue = function() {
    return {
        valid: true,
        val: this._data.values[this._index],
        key: this._modelKey
    }
};

Select.prototype.changeModel = function(val) {
    var index = this._data.values.indexOf(val),
        value = this._data.display ? this._data.display[index] : this._data.values[index];
    if (index !== -1) {
        this._rootNode.emit('setValue', {
            change: this.dropdown.getValue() !== value,
            value: value
        });
        this._index = index;
    }

};

function _createMenuOnClick(createMenuNode, data, event) {
    var position = this._rootNode.cachedMenuPosition,
        zNode;
    if (!this._menu) {
        event.stopPropagation();
        zNode = createMenuNode();
        zNode.contentNode.setPosition(position[0], position[1], 0);
        data.dismountFunc = function() {
            this._menu = null;
            zNode.dismount();
        }.bind(this);
        this._menu = new Menu(zNode.contentNode, data);
        zNode.contentNode.show();
        this._menu.show();
        clock.setTimeout(function() {
            this._menu.show();
        }.bind(this), 160)
    }
}

module.exports = Form;