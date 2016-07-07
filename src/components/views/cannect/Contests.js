var DefaultView         = require('./DefaultView'),
    globalStore         = require('../../../utils/globalStore');

function Contests(node, options) {
    DefaultView.call(this, node, options);
    this.render = _render.bind(this, options);
    this.render();
}

Contests.prototype = Object.create(DefaultView.prototype);
Contests.prototype.constructor = DefaultView;

function _render(options) {
    var html = '';
    options.windowWidth = globalStore.get('windowWidth');
    options.windowHeight = globalStore.get('windowHeight');
    html = this.addBanner(html, options);
    html += _createPaper(options);
    html += globalStore.get('disclaimerHTML');
    this._el.setContent(html);
}

function _createPaper(options) {
    return options.templates.paper;
}

module.exports = Contests;