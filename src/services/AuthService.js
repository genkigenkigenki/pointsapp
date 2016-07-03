var cookieUtil  = require('../utils/cookieUtil'),
    Promise = require('bluebird'),
    _       = require('lodash');

function hasStoredCreds() {
    return new Promise(function(resolve, reject) {
        if (_hasCookies.call(this)) {
            if (this.backend) this.backend.setCreds(this.data.creds);
            if (this.workerEventManager) {
                this.workerEventManager.sendMessage('authComplete', true);
            }
            resolve();
        }
        else reject();
    }.bind(this));
}

function _hasCookies() {
    var hasCookies = true;
    _.forEach(this.data.creds, function(cred, name) {
        var storedCred = cookieUtil.get(name);
        if (storedCred) this.data.creds[name] = this.data.creds[name] ? this.data.creds[name].format(storedCred) : storedCred;
        else hasCookies = false;
    }.bind(this));
    return hasCookies;
}

function _setCreds(expiryDays, data) {
    if (this.workerEventManager) {
        this.workerEventManager.sendMessage('authComplete', true);
    }
    _.forEach(data, function(cred, name) {
        this.data.creds[name] = this.data.creds[name] ? this.data.creds[name].format(cred) : cred;
        cookieUtil.set(name, cred, expiryDays);
    }.bind(this));
    console.log(this.data.creds);
    return data;
}

function _initCreds(authData) {
    this.data.creds = {};
    _.forEach(authData, function(data) {
        this.data.creds[data.name] = data.string || '';
    }.bind(this));
}

function _getLoginFunc(authData) {
    var loginData = authData.login;
    return function(login, pass) {
        var data = {};
        data[loginData.username] = login;
        data[loginData.password] = pass;
        return this.backend.send(loginData.url, data)
            .then(_setCreds.bind(this, authData.cookieExpiryDays))
            .then(this.backend.setCreds.bind(this.backend))
            .catch(function() {
                throw new Error(loginData.error);
            });
    }.bind(this);
}

function AuthService(authData, backend) {
    this.data = {
        url: authData && authData.url ? authData.url : null
    };
    this.backend = backend ? backend : null;
    this.authenticate = authData && authData.login ? _getLoginFunc.call(this, authData) : null;
    if (authData && authData.params) _initCreds.call(this, authData.params);
}
AuthService.prototype.hasStoredCreds = hasStoredCreds;

AuthService.prototype.registerWorkerEventManager = function(workerEventManager) {
    this.workerEventManager = workerEventManager;
};

module.exports = AuthService;