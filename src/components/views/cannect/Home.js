var DOMElement          = require('jokismo_engine_fork/dom-renderables/DOMElement'),
    clock               = require('jokismo_engine_fork/core/FamousEngine').getClock(),
    Node                = require('jokismo_engine_fork/core/Node'),
    Promise             = require('bluebird'),
    _                   = require('lodash'),
    ScrollContainer     = require('../../ui/ScrollContainer'),
    EventRipple         = require('../../ui/EventRipple'),
    ZDiv                = require('../../ui/ZDiv'),
    Menu                = require('../../ui/Menu'),
    SizeManager         = require('../../utils/SizeManager'),
    globalStore         = require('../../../utils/globalStore');

function Home(node, options) {
    this._rootNode = node;
    this._globalWatching = [];
    this._clickMap = {
        fixed: false,
        x: []
    };
    this._clickSizes = {
        fixed: false,
        vals: []
    };
    this._layoutCache = [];
    this._clickMap = {
        fixed: false,
        x: []
    };
    this._clickSizes = {
        fixed: false,
        vals: []
    };
    this._menuZ = 20;
    this._clickClasses = {};
    this._clickFuncMap = {};
    this._clickFuncs = {};
    this._clickMapRequestID = 0;
    this._renderSizes = ['subOne', 'subTwo', 'blurbs'];
    this._quotePanelConfig = {
        blurbsHeight: 0,
        current: 'premium',
        quotes: [],
        display: []
    };
    for (var i = 0; i < options.data.defaultQuotes.length; ++i) {
        this._quotePanelConfig.quotes.push({
            id: options.data.defaultQuotes[i]
        });
    }
    this._quotes = options.data.quotes;
    this._standardOnly = options.data.standardOnly;
    _createScrollContainer.call(this, options);
    _createContent.call(this, options);
    clock.setTimeout(function() {
        if (options.data.contactUs) {
            globalStore.set('contactUs', true);
        }
    }, 300);
}

Home.prototype.cleanup = function() {
    var watching;
    this._el.setContent('');
    for (var i = 0; i < this._globalWatching.length; ++i) {
        watching = this._globalWatching[i];
        globalStore.unWatch(watching.key, watching.index);
    }
    globalStore.get('workerEventManager').sendMessage('quotePanel', {
        type: 'exit'
    });
    globalStore.deRegisterPipe('outerPaperScroll', this._scrollContainer._syncScrollID);
};

Home.prototype._createMenuNode = function createMenu() {
    this._menuZ += 10;
    return new ZDiv(this._contentNode.addChild(), {
        z: this._menuZ
    });
};

function _createScrollContainer(options) {
    var layout = options.layout.paper;
    this._rootNode.setDifferentialSize(options.layout.fixedWidth ? 0 : -( layout.padding * 2 ),
        -layout.marginTop, 0)
        .setAlign(0.5, 1, 0)
        .setMountPoint(0.5, 1, 0);
    this._scrollContainer = new ScrollContainer(this._rootNode, {
        bar: true,
        syncScroll: 'outerPaperScroll',
        shortenBar: 48,
        shiftX: options.mode === 'fixedWide' ? 60 : 0
    });
}

function _createContent(options) {
    var queueFunc = _queueRender.bind(this, options),
        key;
    this._contentNode = new Node()
        .setSizeMode('relative', 'render');
    EventRipple.syncEventsToRipple(this._contentNode, {
        backgroundClassList: [],
        ripple: {
            classList: ['bg-white-21'],
            radius: 150,
            baseScale: 0.12,
            z: 4
        },
        clickFunc: _clickFunc.bind(this)
    });
    this._contentNode.sizeManager = new SizeManager({
        direction: 'y'
    });
    this._contentNode.sizeManager.register(this._contentNode);
    key = 'windowWidth';
    this._globalWatching.push({
        index: globalStore.watch(key, queueFunc),
        key: key
    });
    key = 'windowHeight';
    this._globalWatching.push({
        index: globalStore.watch(key, queueFunc),
        key: key
    });
    this._el = new DOMElement(this._contentNode, {
        content: '<div style="height: 20px;">&nbsp;</div>'
    });
    this._scrollContainer.initContent({
        node: this._contentNode,
        size: {
            mode: 'render'
        }
    });
    ScrollContainer.registerChildNodeEvents(this._contentNode);
    _render.call(this, options);
    clock.setTimeout(function() {
        globalStore.get('workerEventManager').sendMessage('quotePanel', {
            type: 'init',
            data: options.data.defaultQuotes
        });
    }, 500);
}

function _clickFunc(indices) {
    var id = indices.x.toString() + indices.y.toString(),
        funcID = this._clickFuncMap[id];
    this._contentNode._ripple.toggleActive(true);
    if (!_.isUndefined(funcID)) {
        if (_.isNumber(funcID)) {
            _toggleMenu.call(this, funcID);
        }
        else {
            _changeGroup.call(this, funcID);
        }
    }
}

function _toggleMenu(panelID) {
    var quote = this._quotePanelConfig.quotes[panelID],
        instIsNull = false,
        menuConfig = {
            values: this._quotes,
            width: 200,
            background: 'milton-black',
            colorDark: 'white',
            hover: 'milton-yellow',
            rippleClassList: ['bg-white-21'],
            callback: function(ind) {
                if (quote.id !== this._quotes[ind]) {
                    quote.id = this._quotes[ind];
                    if (this._quotePanelConfig.current === 'premium') {
                        instIsNull = this._standardOnly.indexOf(quote.id) !== -1;
                    }
                    globalStore.get('workerEventManager').sendMessage('quotePanel', {
                        type: 'changeQuote',
                        data: {
                            id: panelID,
                            quote: quote.id,
                            instIsNull: instIsNull
                        }
                    });
                }
            }.bind(this)
        },
        zNode;
    if (quote.menu) quote.menu.hide();
    else {
        zNode = this._createMenuNode();
        zNode.contentNode.setPosition(quote.posX, quote.posY + this._quotePanelConfig.blurbsHeight, 0)
            .setOrigin(1, 0, 0);
        menuConfig.dismountFunc = function() {
            quote.menu = null;
            zNode.dismount();
        };
        quote.menu = new Menu(zNode.contentNode, menuConfig);
        zNode.contentNode.show();
        clock.setTimeout(function() {
            quote.menu.show();
        }, 300);
    }
}

function _changeGroup(group) {
    if (group !== this._quotePanelConfig.current) {
        this._quotePanelConfig.current = group;
        globalStore.get('workerEventManager').sendMessage('quotePanel', {
            type: 'changeGroup',
            data: group
        });
    }
}

function _queueRender(options) {
    if (!this._renderQueued) {
        this._renderQueued = true;
        clock.setTimeout(function() {
            this._renderQueued = false;
            _render.call(this, options);
        }.bind(this), 300);
    }
}

function _render(options) {
    var html = '';
    options.windowWidth = globalStore.get('windowWidth');
    options.windowHeight = globalStore.get('windowHeight');
    this._clickMap.x = [];
    this._clickSizes.vals = [];
    this._clickClasses = {};
    this._clickFuncMap = {};
    options.getSize = [];
    html = _addPhoto.call(this, html, options);
    html = _addSubBanners.call(this, html, options);
    html = _addFirstPaper.call(this, html, options);
    html = _addQuotePanels.call(this, html, options);
    html += globalStore.get('disclaimerHTML');
    this._el.setContent(html);
    this._clickMapRequestID++;
    _getRenderSizes.call(this, options)
        .then(_calculateClickMap.bind(this))
}

function _calculateClickMap(sizes) {
    var id,
        ref,
        addID;
    if (sizes[0] && sizes[0].id === this._clickMapRequestID) {
        for (var i = 0; i < sizes.length; ++i) {
            this._quotePanelConfig.blurbsHeight += sizes[i].y;
            id = this._renderSizes[i];
            for (var j = 0; j < this._layoutCache.length; ++j) {
                ref = this._layoutCache[j].ref;
                for (var k = 0; k < this._layoutCache[j].add.length; ++k) {
                    addID = this._layoutCache[j].add[k];
                    if (addID === id) {
                        ref[0] = ref[0] + sizes[i].y;
                        ref[1] = ref[1] + sizes[i].y;
                    }
                }
            }
        }
        EventRipple.changeClickMap(this._contentNode, this._clickMap, this._clickSizes, this._clickClasses);
    }
}

function _getRenderSizes(options) {
    var promises = [],
        renderSizeManager = globalStore.get('renderSizeManager');
    for (var i = 0; i < options.getSize.length; ++i) {
        promises.push(renderSizeManager.getRenderSize({
            content: options.getSize[i],
            id: this._clickMapRequestID
        }));
    }
    return Promise.all(promises);
}

function _addPhoto(html, options) {
    var photo = options.photo,
        layout = options.layout.paper,
        sizeY;
    options.sizeX = options.layout.fixedWidth || Math.floor(options.windowWidth - (layout.padding * 2));
    sizeY = Math.floor(photo.y * (options.sizeX / photo.x));
    html += options.templates.banner.format(options.sizeX, sizeY);
    this._clickMap.x.push({
        min: 0,
        max: options.layout.fixedWidth || (options.windowWidth - (options.layout.paper.padding * 2)),
        y: [[0, 0]]
    });
    this._clickSizes.vals.push([ [options.sizeX, sizeY] ]);
    options.currentY = sizeY;
    return html;
}

var _blurbs = ['subOne', 'subTwo', 'blurbs'];

function _addQuotePanels(html, options) {
    var layout = options.layout.quotePanel,
        templates = options.templates,
        language = options.language,
        quotes = options.data.defaultQuotes,
        isTwoCol = options.sizeX >= layout.twoCol,
        top = 0,
        paperTop = options.currentY,
        buttonHeight = isTwoCol ? layout.buttonMarginTopTwoCol : layout.buttonMarginTopOneCol,
        skew = layout.padding,
        buttonWidth = 144,
        buttonSize,
        instrumentSize,
        posY,
        minX,
        horiz,
        halfWidth,
        buttons;
    html += templates.quotePanelsContainer.format({
        sizeX: options.sizeX,
        subPageBreak: options.layout.subPageBreak
    });
    buttonSize = [buttonWidth, layout.buttonHeight];
    if (isTwoCol) {
        buttons = templates.quoteButtonsTwoCol;
        halfWidth = Math.floor(options.sizeX / 2);
        this._clickMap.x.push({
            min: halfWidth - buttonWidth,
            max: halfWidth,
            y: [[options.currentY + 36, options.currentY + 36 + layout.buttonHeight]]
        });
        this._layoutCache.push({
            ref: this._clickMap.x[3].y[0],
            add: _blurbs
        });
        this._clickSizes.vals.push([ [buttonWidth, layout.buttonHeight] ]);
        this._clickMap.x.push({
            min: halfWidth,
            max: halfWidth + buttonWidth,
            y: [[options.currentY + 36, options.currentY + 36 + layout.buttonHeight]]
        });
        this._layoutCache.push({
            ref: this._clickMap.x[4].y[0],
            add: _blurbs
        });
        this._clickSizes.vals.push([ buttonSize ]);
        this._clickFuncMap['30'] = 'premium';
        this._clickClasses['30'] = options.data.buttonRippleClasses;
        this._clickFuncMap['40'] = 'standard';
        this._clickClasses['40'] = options.data.buttonRippleClasses;
        buttonHeight += layout.buttonHeight + layout.buttonMarginBottom;
    } else {
        buttons = templates.quoteButtonsOneCol;
        minX = Math.floor(options.sizeX / 2 - (buttonWidth / 2));
        this._clickMap.x.push({
            min: minX,
            max: minX + buttonWidth,
            y: [[options.currentY + 24, options.currentY + 24 + layout.buttonHeight],
                [options.currentY + 24 + layout.buttonHeight, options.currentY + 24 + (layout.buttonHeight * 2)]]
        });
        this._layoutCache.push({
            ref: this._clickMap.x[3].y[0],
            add: _blurbs
        });
        this._layoutCache.push({
            ref: this._clickMap.x[3].y[1],
            add: _blurbs
        });
        this._clickFuncMap['30'] = 'premium';
        this._clickClasses['30'] = options.data.buttonRippleClasses;
        this._clickFuncMap['31'] = 'standard';
        this._clickClasses['31'] = options.data.buttonRippleClasses;
        this._clickSizes.vals.push([ buttonSize, buttonSize ]);
        buttonHeight += layout.buttonHeight * 2;
    }
    options.currentY += buttonHeight;
    html += buttons.format(language);
    instrumentSize = [layout.width, 48];
    if (isTwoCol) {
        if (options.sizeX > layout.width * 2 + layout.padding * 3) {
            skew = Math.floor(( options.sizeX - (layout.width * 2 + layout.padding * 2) ) / 2);
        }
        this._clickMap.x.push({
            min: skew,
            max: skew + layout.width,
            y: []
        });
        for (var i = 0; i < 2; ++i) {
            posY = options.currentY + ((layout.height + layout.marginBottom) * i);
            this._quotePanelConfig.quotes[i === 0 ? 0 : 2].posX = skew;
            this._quotePanelConfig.quotes[i === 0 ? 0 : 2].posY = posY;
            this._clickMap.x[5].y.push([posY, posY + 48]);
            this._layoutCache.push({
                ref: this._clickMap.x[5].y[i],
                add: _blurbs
            });
        }
        this._clickSizes.vals.push([instrumentSize, instrumentSize]);
        this._clickMap.x.push({
            min: skew + layout.width + 24,
            max: skew + (layout.width * 2) + 24,
            y: []
        });
        for (i = 0; i < 2; ++i) {
            posY = options.currentY + ((layout.height + layout.marginBottom) * i);
            this._quotePanelConfig.quotes[i === 0 ? 1 : 3].posX = skew + layout.width + 24;
            this._quotePanelConfig.quotes[i === 0 ? 1 : 3].posY = posY;
            this._clickMap.x[6].y.push([posY, posY + 48]);
            this._layoutCache.push({
                ref: this._clickMap.x[6].y[i],
                add: _blurbs
            });
        }
        this._clickSizes.vals.push([instrumentSize, instrumentSize]);
        this._clickFuncMap['50'] = 0;
        this._clickFuncMap['51'] = 2;
        this._clickFuncMap['60'] = 1;
        this._clickFuncMap['61'] = 3;
        for (i = 0; i < quotes.length; ++i) {
            top = i < 2 ? buttonHeight : buttonHeight + layout.height + layout.marginBottom;
            horiz = '{0}: {1}px'.format(i % 2 === 0 ? 'left' : 'right', skew);
            html += templates.quotePanel.format({
                index: i,
                horiz: horiz,
                top: top,
                instrument: quotes[i]
            });
        }
        options.currentY += layout.height * 2 + layout.marginBottom * 2;
    } else {
        html += '<div class="spacer-24"></div>';
        minX = Math.floor((options.sizeX - layout.width) / 2);
        this._clickMap.x.push({
            min: minX,
            max: minX + layout.width,
            y: []
        });
        for (i = 0; i < 4; ++i) {
            posY = options.currentY + ((layout.height + layout.marginBottom) * i);
            this._quotePanelConfig.quotes[i].posX = minX;
            this._quotePanelConfig.quotes[i].posY = posY;
            this._clickMap.x[4].y.push([posY, posY + 48]);
            this._layoutCache.push({
                ref: this._clickMap.x[4].y[i],
                add: _blurbs
            });
        }
        this._clickSizes.vals.push([instrumentSize, instrumentSize, instrumentSize, instrumentSize]);
        this._clickFuncMap['40'] = 0;
        this._clickFuncMap['41'] = 1;
        this._clickFuncMap['42'] = 2;
        this._clickFuncMap['43'] = 3;
        for (i = 0; i < quotes.length; ++i) {
            html += templates.quotePanel.format({
                index: i,
                horiz: 'left: {0}px'.format(minX),
                top: buttonHeight,
                instrument: quotes[i]
            });
            buttonHeight += layout.height + layout.marginBottom;
        }
        options.currentY += (layout.height + layout.marginBottom) * quotes.length;
    }
    html += '</div>';
    return html.format({
        height: options.currentY - paperTop + 24
    });
}

function _addSubBanners(html, options) {
    var template = options.templates.subBanner,
        banners = options.language.subBanners,
        sizeY = Math.floor(options.subBanner.y * (options.sizeX / options.subBanner.x)),
        banner;
    for (var i = 0; i < banners.length; ++i) {
        banner = banners[i];
        html += template.format({
            link: banner.link,
            svg: banner.svg.format(options.sizeX, sizeY),
            blurb: banner.blurb,
            sizeX: options.sizeX,
            sizeY: sizeY,
            subPageBreak: options.layout.subPageBreak
        });
        options.currentY += options.layout.subPageBreak;
        options.currentY += sizeY;
        options.getSize.push(options.getSizes.subBanner.format({
            sizeX: options.sizeX,
            blurb: banner.blurb
        }));
    }
    return html;
}

function _addFirstPaper(html, options) {
    var layout = options.layout,
        templates = options.templates,
        language = options.language,
        itemContent,
        accountData,
        template,
        content = '',
        height,
        sizeX = options.sizeX - (layout.accountCard.padding * 2);
    options.currentY += layout.subPageBreak;
    html += templates.subDesc.format({
        sizeX: options.sizeX,
        subPageBreak: layout.subPageBreak
    }).format(language);
    options.getSize.push(options.getSizes.subDesc.format({
        sizeX: options.sizeX
    }).format(language));
    for (var i = 0; i < language.accountTypes.length; ++i) {
        accountData = language.accountTypes[i];
        itemContent = '';
        for (var j = 0; j < accountData.items.length; ++j) {
            template = j % 2 === 0 ? templates.accountItem : templates.accountItemOdd;
            itemContent += template.format(accountData.items[j]);
        }
        height = 120 + 48 * accountData.items.length;
        this._clickMap.x.push({
            min: options.layout.paper.padding,
            max: sizeX,
            y: [[options.currentY, options.currentY + height]]
        });
        this._layoutCache.push({
            ref: this._clickMap.x[i + 1].y[0],
            add: _blurbs
        });
        this._clickSizes.vals.push([ [sizeX, height] ]);
        options.currentY += height;
        content += templates.accountContainer.format({
            sizeX: sizeX,
            content: templates.accountType.format({
                svg: accountData.svg,
                accountType: accountData.accountType,
                sizeX: sizeX,
                headerY: height,
                svgLeft: Math.floor((sizeX - 96) / 2),
                titleMargin: 24,
                circleMarginTop: 24,
                cardMarginTop: 120,
                content: itemContent
            })
        });
        if (i !== language.accountTypes.length - 1) {
            content += '<div class="spacer-24"></div>';
            options.currentY += 24;
        }
    }
    html += content;
    html += '<div class="spacer-24"></div>' +
    '</div>';
    options.currentY += 24 + layout.subPageBreak;
    return html
}

module.exports = Home;