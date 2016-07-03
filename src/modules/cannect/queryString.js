var Cookie  = require('../../utils/cookieUtil'),
    _       = require('lodash');

var queryString = {
    init: init,
    handleString: handleString
};

function init(refs) {
    queryString.refs = refs;
}

function handleString(str) {
    var queryObj = paramsToObj(str);
    _.forEach(queryObj, function(val, key) {
        switch (key) {
            case 'IB':
                Cookie.set('ib_code', val, 30);
                break;
            case 'ib':
                Cookie.set('ib_code', val, 30);
                break;
        }
    });
}

function paramsToObj (str) {
    return (str || document.location.search).replace(/(^\?)/,'').split("&").map(function(n){return n = n.split("="),this[n[0]] = n[1],this}.bind({}))[0];
}

module.exports = queryString;