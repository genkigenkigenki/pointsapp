var analytics = {
    page: runIfLoaded(page),
    event: runIfLoaded(event)
};

function runIfLoaded(func) {
    return function() {
        if (ga) func.apply(null, Array.prototype.slice.call(arguments));
    }
}

function event(config) {
    ga('send', {
        'hitType': 'event',
        'eventCategory': config.category ? config.category : 'button',   // Required.
        'eventAction': config.action ? config.action : 'click',      // Required.
        'eventLabel': config.label ? config.label : 'nav buttons',
        'eventValue': config.value ? config.value : 0
    });
}

function page(url) {
    ga('set', 'page', url);
    ga('send', 'pageview');
}

module.exports = analytics;