var execute = require('./execute').execute;

var DOMRequest = {
        _eventManager: null,
        init: init,
        send: execute,
        _queue: {},
        queueIsEmpty: queueIsEmpty,
        waitForEmptyQueue: waitForEmptyQueue
    },
    Promise     = require('bluebird'),
    clock       = require('jokismo_engine_fork/core/FamousEngine').getClock();

try {
    var i = document;
}
catch (e) {
    DOMRequest.send = send;
}

function init(eventManager) {
    DOMRequest._eventManager = eventManager;
    eventManager.register({
        type: 'message',
        func: function(data) {
            if (DOMRequest._queue[data.id]) delete DOMRequest._queue[data.id];
        },
        signature: 'DomRequestComplete'
    });
}

function send(data) {
    DOMRequest._queue[data.id] = 1;
    DOMRequest._eventManager.sendMessage('DOMRequest', data);
}

function queueIsEmpty(resolve) {
    var isEmpty = Object.keys(DOMRequest._queue).length === 0;
    if (resolve) {
        if (isEmpty) resolve();
        else {
            clock.setTimeout(function() {
                queueIsEmpty(resolve);
            }, 1);
        }
    }
    else return isEmpty;
}

function waitForEmptyQueue() {
    return new Promise(function(resolve, reject) {
        queueIsEmpty(resolve);
    });
}

module.exports = DOMRequest;