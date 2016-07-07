'use strict';

var Promise             = require('bluebird'),
    _                   = require('lodash'),
    Cookie              = require('../utils/cookieUtil'),
    //XMLtoJSON           = require('../utils/XMLtoJSON'),
    XMLHttpObjects      = [],
    XMLHttpFactories    = [
        function () {
            return new XMLHttpRequest();
        },
        function () {
            return new ActiveXObject("Msxml2.XMLHTTP");
        },
        function () {
            return new ActiveXObject("Msxml3.XMLHTTP");
        },
        function () {
            return new ActiveXObject("Microsoft.XMLHTTP");
        }
    ];

function createXMLHTTPObject() {
    var xmlhttp = false;
    for (var i = 0; i < XMLHttpFactories.length; ++i) {
        try {
            xmlhttp = XMLHttpFactories[i]();
        }
        catch (e) {
            continue;
        }
        break;
    }
    return xmlhttp;
}

for (var i = 0; i < 3; ++i) {
    XMLHttpObjects.push(createXMLHTTPObject());
}

function _initCreds(authData) {
    this.creds = {};
    _.forEach(authData, function(data) {
        this.creds[data.name] = {
            header: data.header,
            data: ''
        };
    }.bind(this));
}

function Backend(urls, authData, resetCaptcha) {
    this.urls = {};
    _.forEach(urls, function(url, key) {
        this.urls[key] = url;
    }.bind(this));
    this.creds = null;
    this.resetCaptcha = resetCaptcha;
    if (authData) _initCreds.call(this, authData);
}

Backend.prototype.grecaptchaCallback = function(data) {
    this._captchaData = data;
};

Backend.prototype.clearCaptcha = function() {
    this._captchaData = '';
};

Backend.prototype.getCaptcha = function() {
    return this._captchaData;
};

Backend.prototype.registerCaptcha = function(id) {
    if (!this._captchaIDs) this._captchaIDs = {};
    this._captchaIDs[id] = true;
};

Backend.prototype.send = function (url, postData, isFile) {
    var request,
        method,
        cookie,
        response;
    return new Promise(function(resolve, reject) {
        if (XMLHttpObjects.length > 0) {
            request = XMLHttpObjects.pop();
        } else {
            request = createXMLHTTPObject();
        }
        if (!request) return;
        method = url.forceGet ? 'GET' : postData ? 'POST' : 'GET';
        request.open(method, this.urls[url.key] + url.url, true);
        if (postData) {
            if (url.cookies) {
                for (var i = 0; i < url.cookies.length; ++i) {
                    cookie = url.cookies[i];
                    if (Cookie.get(cookie)) {
                        postData[cookie] = Cookie.get(cookie);
                    }
                }
            }
            if (this._captchaData && url.captcha) {
                postData.captcha = this._captchaData;
                if (this.resetCaptcha) this._captchaData = '';
                _.forEach(this._captchaIDs, function(val, key) {
                    try {
                        grecaptcha.reset(key);
                    } catch (e) {
                        delete this._captchaIDs[key];
                    }
                }.bind(this));
            }
            postData = JSON.stringify(postData);
            request.setRequestHeader('Content-type', 'application/json;charset=UTF-8');
        }
        if (this.creds && url.auth) {
            _.forEach(this.creds, function(cred) {
                if (cred.data) request.setRequestHeader(cred.header, cred.data);
            });
        }
        request.onreadystatechange = function () {
            if (request.readyState != 4) return;
            XMLHttpObjects.push(request);
            if (request.status != 200 && request.status != 304) reject(JSON.parse(request.responseText));
            else {
                if (isFile) {
                    response = request.responseText;
                } else {
                    //if (request.responseText.substring(0, 3) === '<?x') {
                    //    response = XMLtoJSON(request.responseText);
                    //} else response = JSON.parse(request.responseText);
                    response = JSON.parse(request.responseText);
                }
                resolve(response);
            }
        };
        if (request.readyState == 4) return;
        request.send(postData);
    }.bind(this));
};

Backend.prototype.setCreds = function (authData) {
    _.forEach(this.creds, function(cred, name) {
        cred.data = authData[name];
    });
};

module.exports = Backend;