var _functions = {},
    id = 0;

function register(config) {
    var func;
    id++;
    if (config.type === 'error') {
        this.worker.addEventListener('error', function(e) {
            config.func(e);
        }, false);
    } else {
        func = _getFunc(config);
        if (!_functions[config.signature]) _functions[config.signature] = {};
        _functions[config.signature][id] = func;
        this.worker.addEventListener('message', func, false);
    }
    return id;
}

function _getFunc(config) {
    return function(e) {
        if (e.data.signature && e.data.signature === config.signature) {
            config.func(e.data.data);
        }
    }
}

function deRegister(config) {
    if (_functions[config.signature] && _functions[config.signature][config.id]) {
        this.worker.removeEventListener(config.type, _functions[config.signature][config.id], false);
        delete _functions[config.signature][config.id];
    }
}

function sendMessage(signature, data) {
    this.worker.postMessage({
        signature: signature,
        data: data
    });
}

function WorkerEventManager(worker) {
    this.worker = worker;
}
WorkerEventManager.prototype.register = register;
WorkerEventManager.prototype.deRegister = deRegister;
WorkerEventManager.prototype.sendMessage = sendMessage;

module.exports = WorkerEventManager;