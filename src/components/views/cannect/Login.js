var clock               = require('jokismo_engine_fork/core/FamousEngine').getClock(),
    _                   = require('lodash'),
    DefaultView         = require('./DefaultView'),
    DOMRequest          = require('../../../utils/DOMAccess/request'),
    Form                = require('../../ui/Form'),
    globalStore         = require('../../../utils/globalStore');

function Login(node, options) {
    var id;
    DefaultView.call(this, node, options);
    this._clickMapRequestID = 0;
    this.render = _render.bind(this, options);
    this.render();
    _createForm.call(this, options);
    if (options.data && options.data.boundClicks) {
        this.processClick = _processClick.bind(this, options.templates);
        id = globalStore.get('workerEventManager').register({
            type: 'message',
            func: this.processClick,
            signature: 'gotClick'
        });
        this.customCleanup = _customCleanup.bind(null, id);
        if (globalStore.get('showBanner')) {
            this.showBanner(globalStore.get('showBanner'));
        }
        clock.setTimeout(_bindClicks.bind(null, options.data.boundClicks), 1000);
    }
}

Login.prototype = Object.create(DefaultView.prototype);
Login.prototype.constructor = DefaultView;

Login.prototype.showBanner = function() {
    globalStore.remove('showBanner');
    this.processClick({
        x: 0,
        y: 0,
        id: 'partner'
    });
};

function _render(options) {
    var html = '';
    options.windowWidth = globalStore.get('windowWidth');
    options.windowHeight = globalStore.get('windowHeight');
    //html = this.addBanner(html, options);
    html += _createPaper.call(this, options);
    html += globalStore.get('disclaimerHTML');
    this._el.setContent(html);
    this._clickMapRequestID++;
    _getRenderSize.call(this, options)
        .then(_positionForm.bind(this));
}

function _customCleanup(id) {
    globalStore.get('workerEventManager').deRegister({
        type: 'message',
        id: id,
        signature: 'gotClick'
    });
}

function _bindClicks(clicks) {
    for (var i = 0; i < clicks.length; ++i) {
        DOMRequest.send({
            id: clicks[i],
            type: 'getClick'
        });
    }
}

function _processClick(templates, data) {
    if (data.id.indexOf('partner') !== -1) {
        if (!this._rippleOpen) {
            this._rippleOpen = true;
            globalStore.get('rippleToPaper')({
                content: templates.banners,
                posX: data.x,
                posY: data.y,
                bar: true
            }).show(function() {
                this._rippleOpen = false;
            }.bind(this));
        }
    }
}

function _getRenderSize(options) {
    return globalStore.get('renderSizeManager').getRenderSize({
        content: options.getSizeString,
        id: this._clickMapRequestID
    });
}

function _positionForm(size) {
    if (size && size.id === this._clickMapRequestID) {
        this._formNode.setPosition(0, size.y + this._currentY + 12, 2);
    }
}

function _createForm(options) {
    var form;
    this._formNode = this._contentNode.addChild();
    form = new Form(this._formNode, {
        formData: options.forms.inquiry.config,
        model: {}
    });
    form.registerFunction('submit', Form.submit.bind(form, options.forms.inquiry.request));
    this._scrollContainer.watchForm(form._formID);
}

function _createPaper(options) {
    var html = '',
        width = options.layout.fixedWidth ? options.layout.fixedWidth : options.windowWidth - (options.layout.paper.padding * 2);
    html += options.templates.blurb.format(options.templates.blurbInner);
    options.getSizeString = options.getSize.blurb.format(width, options.templates.blurbInner);
    this._currentY = 0;
    return html;
}

module.exports = Login;