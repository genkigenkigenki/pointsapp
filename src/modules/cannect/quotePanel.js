var Promise = require('bluebird'),
    _       = require('lodash'),
    config  = require('../../config/cannect');

var quotePanel = {
    init: init,
    isStandard: false,
    active: false,
    refs: null,
    config: {
        0: {
            buyUp: true,
            sellUp: true
        },
        1: {
            buyUp: true,
            sellUp: true
        },
        2: {
            buyUp: true,
            sellUp: true
        },
        3: {
            buyUp: true,
            sellUp: true
        }
    },
    quotes: null
};

function init(refs) {
    quotePanel.refs = refs;
    refs.workerEventManager.register({
        type: 'message',
        func: processRequest,
        signature: 'quotePanel'
    });
}

function processRequest(req) {
    var panelEl;
    switch(req.type) {
        case 'init':
            quotePanel.active = true;
            quotePanel.quotes = req.data;
            loop();
            break;
        case 'exit':
            quotePanel.active = false;
            panelEl = $$(document, '#quote-panels-container');
            if (panelEl && panelEl[0]) {
                panelEl[0].parentElement.innerHTML = '';
            }
            break;
        case 'changeGroup':
            changeGroup(req.data);
            break;
        case 'changeQuote':
            changeQuote(req.data);
            break;
        default:
            break;
    }
}

function loop() {
    if (quotePanel.active) {
        _backendGet()
            .then(processQuotes)
            .then(updateQuotes)
            .then(function() {
                setTimeout(loop, 1000);
            });
    }
}

function changeGroup(data) {
    var buttonEl = $$(document, '#quote-panel-prem-bt')[0];
    if (buttonEl) {
        buttonEl.classList.add(data === 'premium' ? 'color-milton-yellow' : 'color-milton-black');
        buttonEl.classList.remove(data === 'premium' ? 'color-milton-black' : 'color-milton-yellow');
    }
    buttonEl = $$(document, '#quote-panel-st-bt')[0];
    if (buttonEl) {
        buttonEl.classList.add(data === 'premium' ? 'color-milton-black' : 'color-milton-yellow');
        buttonEl.classList.remove(data === 'premium' ? 'color-milton-yellow' : 'color-milton-black');
    }
    quotePanel.isStandard = data === 'standard';
}

function changeQuote(data) {
    var id = 'quote-panel-{0}'.format(data.id),
        quoteEl;
    quotePanel.quotes[data.id] = data.quote;
    quoteEl = $$(document, '#' + id)[0];
    if (quoteEl) {
        $$(quoteEl, '.quote-panel-instrument')[0].innerHTML = data.quote;
    }
    quotePanel.config[data.id].hideSpread = data.instIsNull;
}


function processQuotes(data) {
    var marketClosed = data.market_closed,
        quotes = data.quotes,
        quoteData,
        dotIndex,
        inst,
        spread,
        bid,
        ask,
        isPro = false,
        panelConfig,
        sellUp,
        startsWithZero,
        askStartsWithZero,
        tempBid,
        buyUp;
    for (var i = 0; i < quotePanel.quotes.length; ++i) {
        inst = quotePanel.quotes[i];
        quoteData = quotes[inst + 'PRO'];
        if (quoteData) {
            isPro = true;
        } else quoteData = quotes[inst];
        bid = quoteData[0];
        ask = quoteData[1];
        dotIndex = bid.indexOf('.');
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
            spread = quotePanel.isStandard ?  (ask - bid + (isPro ? 14: 0)).toString() : (ask - bid).toString();
            if (spread.length === 1) spread = '0.' + spread;
            else spread = spread.substring(0, spread.length - 1) + '.' + spread.substring(spread.length - 1, spread.length);
        } else {
            spread = '--';
        }
        panelConfig = quotePanel.config[i];
        if (panelConfig.buyPrice) {
            buyUp = bid > panelConfig.buyPrice;
            panelConfig.buyUpChange = buyUp !== panelConfig.buyUp;
            panelConfig.buyUp = buyUp;
        }
        if (panelConfig.sellPrice) {
            sellUp = ask > panelConfig.sellPrice;
            panelConfig.sellUpChange = sellUp !== panelConfig.sellUp;
            panelConfig.sellUp = sellUp;
        }
        panelConfig.buyPrice = bid;
        panelConfig.sellPrice = ask;
        if (startsWithZero) {
            bid = '0.' + bid;
            ask = '0.' + ask;
        } else if (dotIndex !== -1) {
            bid = bid.substring(0, dotIndex) + '.' + bid.substring(dotIndex, bid.length);
            ask = ask.substring(0, dotIndex) + '.' + ask.substring(dotIndex, ask.length);
        }
        panelConfig.buyShow = bid;
        panelConfig.sellShow = ask;
        panelConfig.spread = panelConfig.hideSpread ? '--' : spread;
    }
}

function askIsLower(bid, ask) {
    var bidComp;
    bidComp = bid.substring(bid.length - ask.length, bid.length);
    bidComp = parseInt(bidComp);
    ask = parseInt(ask);
    return ask < bidComp;
}

function updateQuotes() {
    var id,
        quoteEl,
        quotePan,
        html;
    _.forEach(quotePanel.config, function(val, key) {
        id = 'quote-panel-{0}'.format(key);
        quoteEl = $$(document, '#' + id)[0];
        if (quoteEl) {
            html = _quoteToHTML(val.buyShow);
            $$(quoteEl, '.quote-panel-buy')[0].innerHTML = html;
            html = _quoteToHTML(val.sellShow);
            $$(quoteEl, '.quote-panel-sell')[0].innerHTML = html;
            $$(quoteEl, '.quote-panel-spread')[0].innerHTML = val.spread;
            if (val.buyUpChange) {
                quotePan = $$(quoteEl, '.quote-panel-right');
                quotePan[0].classList.add(val.buyUp ? 'bg-quote-blue' : 'bg-quote-red');
                quotePan[1].classList.add(val.buyUp ? 'bg-quote-blue' : 'bg-quote-red');
                quotePan[0].classList.remove(val.buyUp ? 'bg-quote-red' : 'bg-quote-blue');
                quotePan[1].classList.remove(val.buyUp ? 'bg-quote-red' : 'bg-quote-blue');
            }
            if (val.sellUpChange) {
                quotePan = $$(quoteEl, '.quote-panel-left');
                quotePan[0].classList.add(val.sellUp ? 'bg-quote-blue' : 'bg-quote-red');
                quotePan[1].classList.add(val.sellUp ? 'bg-quote-blue' : 'bg-quote-red');
                quotePan[0].classList.remove(val.sellUp ? 'bg-quote-red' : 'bg-quote-blue');
                quotePan[1].classList.remove(val.sellUp ? 'bg-quote-red' : 'bg-quote-blue');
            }
        }
    });
}

function _quoteToHTML(float) {
    var str = float.toString(),
        dotInd = str.indexOf('.'),
        len = str.length,
        splitOneEnd = len - 3,
        splitTwoEnd = splitOneEnd + 2;
    if (dotInd !== -1) {
        if (dotInd === len - 2) {
            splitOneEnd -= 1;
            splitTwoEnd -= 1;
        } else if (dotInd === len - 3) {
            splitOneEnd -= 1;
        }
    }
    return '<span class="f-body-three">{0}</span>'.format(str.slice(0, splitOneEnd)) +
        '<span class="f-display-one">{0}</span>'.format(str.slice(splitOneEnd, splitTwoEnd)) +
        '<span class="f-body-three" style="text-indent: 0.15rem;">{0}</span>'.format(str.slice(splitTwoEnd));
}

function _backendGet() {
    return quotePanel.refs.backend.send(config.spreadsPath);
}

module.exports = quotePanel;