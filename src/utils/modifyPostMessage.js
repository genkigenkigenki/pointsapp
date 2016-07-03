var _ = require('lodash');
var _transferablesSupported = true;
var _initialize = _.once(function(workerOrWindow) {
    var args;
    if (!ArrayBuffer) {
        _transferablesSupported = false;
    } else {
        arrayBuffer = new ArrayBuffer(1);
        args = workerOrWindow instanceof Worker ? [arrayBuffer, [arrayBuffer]] : [arrayBuffer, '*', [arrayBuffer]];
        workerOrWindow.postMessage.apply(workerOrWindow, args);
        _transferablesSupported = !arrayBuffer.byteLength
    }
});

function modifyPostMessage(workerOrWindow) {
    var postMessage;
    _initialize(workerOrWindow);
    postMessage = workerOrWindow.webkitPostMessage || workerOrWindow.postMessage;
    if (_transferablesSupported) workerOrWindow.postMessage = postMessage;
    else {
        workerOrWindow.postMessage = workerOrWindow instanceof Worker ? function(message, transfer) {
            postMessage.call(workerOrWindow, message);
        } : function(message, origin, transfer) {
            postMessage.call(workerOrWindow, message, origin);
        }
    }
}

module.exports = modifyPostMessage;