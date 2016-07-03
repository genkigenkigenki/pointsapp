var CacheManager = require('./CacheManager'),
    _               = require('lodash');

function UIEventManager(eventRoot, renderer) {
    if (!renderer) throw new Error('UIEventManager initialized with missing dependencies.');
    this.eventRoot = eventRoot;
    this.cacheManager = new CacheManager();
    this.renderer = renderer;
    this.inProgress = {};
}

UIEventManager.prototype.init = function() {

};

UIEventManager.prototype.newRoute = function(data) {
    var cached,
        status = true;
    this.inProgress[data.id] = [];
    for (var i = 0; i < data.resources.length; ++i) {
        cached = this.cacheManager.check(data.resources[i], data.route);
        this.inProgress[data.id].push(cached.data);
        if (!cached.status) status = false;
    }
    if (data.sendParams) {
        this.inProgress[data.id].push({
            data: data.sendParams,
            key: data.route + 'Route'
        });
    }
    if (status) {
        this.renderer.pushToQueue(this.inProgress[data.id]);
        delete this.inProgress[data.id];
    }
};

UIEventManager.prototype.routeData = function(data) {
    if (this.inProgress[data.id]) {
        for (var i = 0; i < data.data.length; ++i) {
            if (!this.inProgress[data.id][i]) this.inProgress[data.id][i] = data.data[i];
            else if (_.isString(this.inProgress[data.id][i])) {
                this.cacheManager.set(this.inProgress[data.id][i], data.data[i]);
                this.inProgress[data.id][i] = data.data[i];
            }
        }
        this.renderer.pushToQueue(this.inProgress[data.id]);
        delete this.inProgress[data.id];
    }
};

UIEventManager.prototype.routeCancelled = function(data) {
    delete this.inProgress[data.id];
};

// manager will receive render event, check cache and route to renderer.
// manager will queue and / or cancel new events
// rendering main template - active page render is queued
// active page render is in progress and new page render is received - handle as specified in template
// should try to avoid this scenario by gracefully disabling the nav ability during page rendering
// cancel all for events like viewport change
// able to call a working on it lightbox
// lightbox preferable to laggy animation
function routeEvent() {

}

module.exports = UIEventManager;