function getEventReceiver(options) {
    return {
        onReceive: function(event, payload) {
            if (event === options.eventName) {
                if (options.callback) options.callback(payload);
            }
        }.bind(this)
    }
}

module.exports = getEventReceiver;