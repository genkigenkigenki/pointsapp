var Promise = require('bluebird'),
    _       = require('lodash'),
    config  = require('../../config/cannect');

var spreads = {
    init: init,
    spreadAdd: '0.',
    active: false,
    refs: null,
    lastQuotes: {}
};

function init(refs) {
    spreads.refs = refs;
    refs.workerEventManager.register({
        type: 'message',
        func: processRequest,
        signature: 'spreads'
    });
}

function processRequest(req) {
    switch(req.type) {
        case 'init':
            spreads.active = true;
            loop();
            break;
        case 'exit':
            spreads.active = false;
            break;
        default:
            break;
    }
}

function loop() {
    if (spreads.active) {
        _backendGet()
            .then(processQuotes)
            .then(function() {
                setTimeout(loop, 2000);
            });
    }
}

function _backendGet() {
    return spreads.refs.backend.send(config.spreadsPath);
}

function processQuotes(data) {
    var spreadsEl = $$(document, '#spreads-content')[0],
        spreadEl,
        el,
        bid,
        ask,
        isPro,
        tempBid,
        spreadPr,
        spreadSt,
        marketClosed,
        startsWithZero,
        askStartsWithZero;
    if (spreadsEl) {
        marketClosed = data.market_closed;
        _.forEach(data.quotes, function(quote, quoteID) {
            isPro = quoteID.indexOf('PRO') !== -1;
            if (isPro) quoteID = quoteID.substring(0, quoteID.length - 3);
            spreadEl = $$(spreadsEl, '#' + quoteID)[0];
            if (spreadEl) {
                bid = quote[0];
                ask = quote[1];
                startsWithZero = bid.indexOf('0') === 0;
                if (startsWithZero) bid = bid.substring(1, bid.length);
                askStartsWithZero = ask.indexOf('0') === 0;
                if (askStartsWithZero) ask = ask.substring(1, ask.length);
                bid = bid.replace('.', '');
                ask = ask.replace('.', '');
                if (askIsLower(bid, ask)) {
                    tempBid = bid.substring(0, bid.length - ask.length);
                    tempBid = (parseInt(tempBid) + 1).toString();
                    ask = tempBid.substring(0, bid.length - ask.length) + ask;
                } else {
                    ask = bid.substring(0, bid.length - ask.length) + ask;
                }
                if (!marketClosed) {
                    spreadPr = (ask - bid).toString();
                    spreadSt = (ask - bid + (isPro ? 14: 0)).toString();
                    if (spreadPr.length === 1) spreadPr = '0.' + spreadPr;
                    else spreadPr = spreadPr.substring(0, spreadPr.length - 1) + '.' + spreadPr.substring(spreadPr.length - 1, spreadPr.length);
                    if (spreadSt.length === 1) spreadSt = '0.' + spreadSt;
                    else spreadSt = spreadSt.substring(0, spreadSt.length - 1) + '.' + spreadSt.substring(spreadSt.length - 1, spreadSt.length);
                } else {
                    spreadPr = '--';
                    spreadSt = '--';
                }
                el = $$(spreadEl, '.spread-price')[0];
                if (el) el.innerHTML = quote[0];
                el = $$(spreadEl, '.spread-pr')[0];
                if (el) el.innerHTML = spreadPr;
                el = $$(spreadEl, '.spread-st')[0];
                if (el) el.innerHTML = spreadSt;
            }
        });
    }
}

function askIsLower(bid, ask) {
    var bidComp;
    bidComp = bid.substring(bid.length - ask.length, bid.length);
    bidComp = parseInt(bidComp);
    ask = parseInt(ask);
    return ask < bidComp;
}

module.exports = spreads;