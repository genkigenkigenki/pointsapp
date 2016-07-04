var DOMElement = require('jokismo_engine_fork/dom-renderables/DOMElement'),
    clock = require('jokismo_engine_fork/core/FamousEngine').getClock(),
    Node = require('jokismo_engine_fork/core/Node'),
    _ = require('lodash'),
    Promise = require('bluebird'),
    AnimateOpacity = require('../../animation/AnimateOpacity'),
    AnimatePosition = require('../../animation/AnimatePosition'),
    AnimateScale = require('../../animation/AnimateScale'),
    ScrollContainer = require('../../ui/ScrollContainer'),
    SizeManager = require('../../utils/SizeManager'),
    ZDiv = require('../../ui/ZDiv'),
    Form = require('../../ui/Form'),
    EventRipple = require('../../ui/EventRipple'),
    getEventReceiver = require('../../../utils/getEventReceiver'),
    StateMachine = require('../../../utils/StateMachine'),
    globalStore = require('../../../utils/globalStore');

function AppMenu(node, options) {
    StateMachine.call(this, ['main', 'hidden']);
    this._rootNode = node;
    this._templates = options.templates;
    this._language = options.language;
    this._configData = options.data;
    this._layout = options.layout;
    if (globalStore.get('windowWidth') < 1438 && !globalStore.get('hasVisited')) {
        this._toolTip = {
            shown: false,
            active: false
        };
    }
    this._button = {
        node: null,
        logo: options.logo
    };
    this._supportButtons = {
        node: null,
        active: false
    };
    if (options.templates.fbLogo) {
        this._fbButton = {
            node: null
        };
    }
    this._middleButton = {
        node: null,
        active: false
    };
    this._links = options.links;
    this._paper = {
        rootNode: null,
        node: null,
        current: '',
        links: [],
        subLinks: []
    };
    _render.call(this, options);
    globalStore.watch('authComplete', function() {
        this._button.node.setScale(1, 1, 1);
        this._button.node.setOpacity(1);
        if (this._SMCurrent === 'hidden' && !this._paper.rootNode) {
            this._paper.rootNode = new Node();
            _createPaper.call(this, new ZDiv(this._paper.rootNode, {
                z: 2
            }).contentNode);
            _renderLinks.call(this);
            this._rootNode.addChild(this._paper.rootNode);
            globalStore.deferAction(10)
                .then(this.changeState.bind(this, 'main'));
        }
    }.bind(this));
}

AppMenu.prototype = Object.create(StateMachine.prototype);

AppMenu.prototype.initView = function initView() {
    var id = globalStore.setTransition();
    _renderButton.call(this);
    _renderLinks.call(this);
    _registerClickToggle.call(this);
    _registerGlobalEvent.call(this);
    this.changeState('hidden');
    //_showBottomDrawer.call(this);
    if (globalStore.get('authComplete')) {
        clock.setTimeout(function () {
            if (globalStore.get('fullWidthShowing')) _renderMiddleButton.call(this);
            globalStore.endTransition(id);
            if (this._SMCurrent === 'hidden' && !this._paper.rootNode) {
                this._paper.rootNode = new Node();
                _createPaper.call(this, new ZDiv(this._paper.rootNode, {
                    z: 2
                }).contentNode);
                _renderLinks.call(this);
                this._rootNode.addChild(this._paper.rootNode);
                globalStore.deferAction(10)
                    .then(this.changeState.bind(this, 'main'));
            }
            clock.setTimeout(function () {
                if (!this._SMDirty && globalStore.get('windowWidth') < 1438) this.changeState('hidden');
            }.bind(this), 15000);
        }.bind(this), 2000);
    } else {
        globalStore.endTransition(id);
        this._button.node.setScale(0, 0, 0);
        this._button.node.setOpacity(0);
    }
};

//AppMenu.prototype.reloadLang = function (lang) {
//    globalStore.get('workerEventManager').sendMessage('reloadLang', lang);
//};

//AppMenu.prototype.bottomDrawer = function() {
//    _showBottomDrawer.call(this, true);
//};

//function _showBottomDrawer(renderFull) {
//    var data,
//        subPages = false,
//        fullIDs = [],
//        full = {},
//        inner = '',
//        innerMid = '';
//    if (!globalStore.get('bottomDrawerShown')) {
//        globalStore.set('bottomDrawerShown', true);
//        for (var i = 0; i < this._configData.news.length; ++i) {
//            data = this._configData.news[i];
//            if (data.showTitle) inner += this._templates.newsInner.format(data.title);
//            innerMid += this._templates.midInner.format(data.title, data.mid, data.date);
//            if (data.fullID) {
//                innerMid += this._templates.newsLink.format(data.fullID);
//                subPages = true;
//                fullIDs.push(data.fullID);
//                full[data.fullID] = this._templates.mid.format(this._templates.midInner.format(data.title, data.full, data.date));
//            }
//            if (i < this._configData.news.length - 1) {
//                if (data.showTitle) inner += '<div class="spacer-24"></div>';
//                innerMid += '<div class="spacer-24"></div>';
//            }
//        }
//        globalStore.deferAction(10)
//            .then(function () {
//                globalStore.get('showBottomDrawer')({
//                    subPages: subPages,
//                    clickIDs: fullIDs,
//                    marginTop: this._layout.marginTop,
//                    templates: {
//                        min: this._templates.news.format(this._language.news, inner),
//                        mid: this._templates.mid.format(innerMid),
//                        full: full
//                    },
//                    secondaryDismountFunc: function() {
//                        globalStore.set('bottomDrawerShown', false);
//                    },
//                    renderFull: !!renderFull
//                });
//            }.bind(this));
//    }
//}

function _render(options) {
    this._paper.rootNode = this._rootNode.addChild();
    _createPaper.call(this, new ZDiv(this._paper.rootNode, {
        z: 2
    }).contentNode);
    _createButtons.call(this, new ZDiv(this._rootNode.addChild(), {
        z: 60
    }).contentNode, options);
}

function _renderToolTip() {
    var node;
    this._toolTip.shown = true;
    this._toolTip.active = true;
    this._toolTip.zDiv = new ZDiv(this._rootNode.addChild(), {
        z: 58
    });
    node = this._toolTip.zDiv.contentNode.addChild();
    node.setSizeMode('render', 'absolute')
        .setPosition(-300, 16, 0)
        .setAbsoluteSize(0, 64);
    new DOMElement(node, {
        classes: ['shadow-one', 'bg-white', 'p-relative'],
        properties: {
            "border-top-right-radius": "3px",
            "border-bottom-right-radius": "3px"
        },
        content: this._templates.clickForMenu
    });
    node.registerEvent('click');
    node.addManagedComponent(getEventReceiver({
        eventName: 'click',
        callback: function (event) {
            event.stopPropagation();
        }
    }));
    this._toolTip.animate = new AnimatePosition(node);
    this._toolTip.animate.start({
        x: 0
    });
    this.registerChangeFunc('main', 'in', function() {
        if (this._toolTip.active) {
            this._toolTip.active = false;
            this._toolTip.animate.start({
                x: -300
            }).then(function() {
                this._toolTip.zDiv.dismount();
            }.bind(this));
        }
    }.bind(this));
}

function _registerClickToggle() {
    this.registerChangeFunc('main', 'in', _registerGlobalEvent.bind(this));
    this.registerChangeFunc('hidden', 'in', function () {
        if (this._toolTip && !this._toolTip.shown) _renderToolTip.call(this);
        if (this._clickID) globalStore.deRegisterGlobalEvent('interaction', 'click', this._clickID);
        globalStore.set('globalClickActive', false);
    }.bind(this));
}

function _registerGlobalEvent() {
    this._clickID = globalStore.registerGlobalEventCallback('interaction', 'click', function () {
        if (globalStore.get('windowWidth') < 1438) this.changeState('hidden');
    }.bind(this));
    if (globalStore.get('windowWidth') < 1438) globalStore.set('globalClickActive', true);
}

function _createButtons(node) {
    this._button.node = node.addChild();
    this._button.node.setSizeMode('absolute', 'absolute')
        .setPosition(12, 24, 0)
        .setAbsoluteSize(48, 48);
    new DOMElement(this._button.node, {
        classes: ['radius-24', 'bg-lt-6-grey', 'b-lt-4-grey', 'pointer', 'oflow-hidden']
    });
    this._button.node.registerEvent('click');
    this._button.node.addManagedComponent(getEventReceiver({
        eventName: 'click',
        callback: function (event) {
            event.stopPropagation();
        }
    }));
    this._button.positionAnimation = new AnimatePosition(this._button.node);
    this.registerChangeFunc('main', 'in', function () {
        this._button.positionAnimation.start({
            x: 150
        });
    }.bind(this));
    this._supportButtons.node = node.addChild();
    this._supportButtons.node.setSizeMode('absolute', 'absolute')
        .setPosition(-12, 24, 0)
        .setAbsoluteSize(48, 48)
        .setAlign(1, 0, 0)
        .setMountPoint(1, 0, 0);
    if (this._fbButton) {
        this._fbButton.node = node.addChild();
        this._fbButton.node.setSizeMode('absolute', 'absolute')
            .setPosition(-12, -24, 0)
            .setAbsoluteSize(48, 48)
            .setAlign(1, 1, 0)
            .setMountPoint(1, 1, 0);
    }
    this._middleButton.node = node.addChild();
    this._middleButton.node.setSizeMode('absolute', 'absolute')
        .setAbsoluteSize(250, 32)
        .setPosition(0, -32, 0)
        .setAlign(0.5, 0, 0)
        .setMountPoint(0.5, 0, 0);
    this._middleButton.positionAnimation = new AnimatePosition(this._middleButton.node);
    globalStore.watch('fullWidthShowing', function (bool) {
        if (bool) _renderMiddleButton.call(this);
        else _removeMiddleButton.call(this);
    }.bind(this))
}

function _createPaper(node) {
    var width = globalStore.get('windowHeight') * 2.2,
        childNode;
    this._paper.rippleNode = node.addChild()
        .setSizeMode('absolute', 'relative')
        .setAbsoluteSize(236);
    new DOMElement(this._paper.rippleNode, {
        classes: ['oflow-hidden']
    });
    childNode = this._paper.rippleNode.addChild()
        .setPosition(0, globalStore.get('windowHeight') / 2, 1);
    this._paper.expandRipple = childNode.addChild()
        .setScale(0.5, 0.5, 1)
        .setMountPoint(0.5, 0.5, 1)
        .setOrigin(0.5, 0.5, 0.5)
        .setSizeMode('absolute', 'absolute')
        .setAbsoluteSize(width, width)
        .setPosition(-width / 2, 0, 0);
    new DOMElement(this._paper.expandRipple, {
        classes: ['bg-lt-6-grey'],
        properties: {
            'border-radius': '{0}px'.format(width)
        }
    });
    this._paper.node = node.addChild();
    this._paper.node.setSizeMode('absolute', 'relative')
        .setAbsoluteSize(236);
    new DOMElement(this._paper.node, {
        classes: ['bg-lt-6-grey']
    });
    this._paper.node.setOpacity(0);
    this._paper.node.registerEvent('click');
    this._paper.node.addManagedComponent(getEventReceiver({
        eventName: 'click',
        callback: function (event) {
            event.stopPropagation();
            this._SMDirty = true;
        }.bind(this)
    }));
    this._paper._scrollContainer = new ScrollContainer(this._paper.node);
    this._paper.opacityAnimation = new AnimateOpacity(this._paper.node);
    this._paper.expandAnimation = new AnimateScale(this._paper.expandRipple);
    this._paper.positionAnimation = new AnimatePosition(this._paper.expandRipple);
    this.registerChangeFunc('hidden', 'in', function () {
        this._paper.opacityAnimation.start({
            opacity: 0,
            duration: 200
        }).then(function() {
            this._button.positionAnimation.start({
                x: 12
            });
            this._paper.positionAnimation.start({
                x: -(globalStore.get('windowHeight') * 1.1)
            });
            this._paper.expandAnimation.start({
                x: 0.5,
                y: 0.5,
                duration: 200
            }).then(function () {
                this._paper.rootNode.dismount();
                this._paper.rootNode = null;
                this._paper.current = '';
            }.bind(this));
        }.bind(this));
    }.bind(this));
    this.registerChangeFunc('main', 'in', function () {
        this._paper.positionAnimation.start({
            x: 0
        });
        this._paper.expandAnimation.start({
            x: 1,
            y: 1,
            duration: 300
        }).then(function() {
            this._paper.opacityAnimation.start({
                opacity: 1,
                duration: 300
            });
        }.bind(this));
    }.bind(this));
}

function _renderMiddleButton() {
    if (!this._middleButton.active) {
        this.changeState('hidden');
        this._middleButton.active = true;
        this._button.opacityAnimation.start({
            opacity: 0
        }).then(function() {
            this._button.node.setScale(0, 0, 0);
        }.bind(this));
        this._middleButton.buttonNode = this._middleButton.node.addChild()
            .setPosition(0, 0, 2);
        new DOMElement(this._middleButton.buttonNode, {
            content: this._templates.middleButton
        });
        this._middleButton.positionAnimation.start({
            y: 0
        });
    }
}

function _removeMiddleButton() {
    if (this._middleButton.active) {
        this._middleButton.active = false;
        this._button.node.setScale(1, 1, 1);
        this._button.opacityAnimation.start({
            opacity: 1
        });
        this._middleButton.positionAnimation.start({
            y: -100
        }).then(function () {
            this._middleButton.buttonNode.dismount();
            this._middleButton.buttonNode = null;
        }.bind(this));
    }
}

function _logout() {

}

function _renderLinks() {
    var node,
        topNode,
        index = 0,
        yArray = [],
        bottomHTML = '',
        pos = 0;
    this._paper.links = [];
    this._paper.contentNode = new Node()
        .setSizeMode('absolute', 'absolute')
        .setAbsoluteSize(236);
    ScrollContainer.registerChildNodeEvents(this._paper.contentNode);
    this._paper.contentNode.sizeManager = new SizeManager({
        direction: 'y'
    });
    topNode = new ZDiv(this._paper.contentNode, {
        z: 50
    }).contentNode;
    this._subMenuNode = new ZDiv(this._paper.contentNode, {
        z: 2
    }).contentNode;
    node = _getMenuNode.call(this, this._layout.logout, index, pos);
    pos = node.currentBottomPos;
    index++;
    EventRipple.syncEventsToRipple(node, {
        globalClickSetter: true,
        backgroundClassList: ['bg-black-21'],
        ripple: {
            classList: ['bg-black-21'],
            radius: 140,
            baseScale: 0.02,
            z: 4
        },
        size: {
            fixed: true,
            y: 48
        },
        clickMap: {
            fixed: true,
            y: {
                start: 97,
                step: 48
            }
        },
        clickFunc: _logout.call(this)
    });
    new DOMElement(node, {
        classes: ['bg-lt-6-grey'],
        content: this._templates.logout.format(this._language.logout)
    });
    topNode.addChild(node);

    node = _getMenuNode.call(this, this._layout.bottomLinks, index, pos);
    for (var i = 0; i < this._configData.bottomLinks.length; ++i) {
        yArray.push([i * 48, i * 48 + 48]);
    }
    EventRipple.syncEventsToRipple(node, {
        globalClickSetter: true,
        backgroundClassList: ['bg-black-21'],
        ripple: {
            classList: ['bg-black-21'],
            radius: 140,
            baseScale: 0.02,
            z: 4
        },
        size: {
            fixed: true,
            y: 48
        },
        clickMap: {
            fixed: false,
            x: [
                {
                    min: 0,
                    max: 236,
                    y: yArray
                }
            ]
        },
        clickFunc: function () {
            node._ripple.toggleActive(true);
            if (globalStore.get('windowWidth') < 1438) this.changeState('hidden');
        }.bind(this)
    });
    for (i = 0; i < this._configData.bottomLinks.length; ++i) {
        bottomHTML += this._templates.menuLink.format(
            this._configData.url + this._configData.bottomLinks[i], this._language[this._configData.bottomLinks[i]]);
    }
    bottomHTML += '<div class="spacer-48"></div>';
    new DOMElement(node, {
        classes: ['bg-lt-6-grey'],
        content: bottomHTML
    });
    topNode.addChild(node);
    this._paper._scrollContainer.initContent({
        node: this._paper.contentNode,
        size: {
            mode: 'render'
        }
    });
    this._paper.contentNode.sizeManager.forceEmit();
}

function _getMenuNode(layout, index, pos) {
    var node = new Node()
        .setSizeMode('relative', 'absolute')
        .setAbsoluteSize(0, layout.height)
        .setPosition(0, pos, 0);
    node.animate = new AnimatePosition(node);
    this._paper.contentNode.sizeManager.register(node);
    this._paper.links.push(node);
    ScrollContainer.registerChildNodeEvents(node);
    node.defaultHeight = layout.height;
    node.menuIndex = index;
    node.currentPos = pos;
    node.currentBottomPos = pos + layout.height;
    return node;
}

//function _getExpandToggleFunc(node, links) {
//    this._paper.subLinks[node.menuIndex] = null;
//    return function () {
//        var link,
//            menuHeight,
//            index = node.menuIndex,
//            parentLink,
//            zIndex = (Object.keys(this._links).length - index) * 2;
//        node._ripple.toggleActive(true);
//        if (!node._showingSubMenu) {
//            node._showingSubMenu = true;
//            if (!node._subMenuNode) {
//                node._subMenuNode = _getSubMenuNode.call(this, links, zIndex);
//                this._paper.subLinks[index] = node._subMenuNode;
//                node._subMenuNode.setPosition(0, node.currentBottomPos - node._subMenuNode._subMenuHeight, zIndex);
//                this._subMenuNode.addChild(node._subMenuNode);
//            }
//            menuHeight = this._paper.subLinks[index]._subMenuHeight;
//            for (var i = index + 1; i < this._paper.links.length; ++i) {
//                link = this._paper.links[i];
//                if (link) {
//                    link.currentPos += menuHeight;
//                    link.currentBottomPos += menuHeight;
//                    link.animate.start({
//                        y: link.currentPos
//                    });
//                }
//            }
//            for (i = index; i < this._paper.subLinks.length; ++i) {
//                link = this._paper.subLinks[i];
//                if (link) {
//                    parentLink = this._paper.links[i];
//                    if (i === index) {
//                        parentLink._sizeManagerID = this._paper.contentNode.sizeManager.register(link);
//                        link.animate.start({
//                            y: parentLink.currentBottomPos
//                        });
//                    } else {
//                        link.animate.start({
//                            y: parentLink.currentBottomPos
//                        });
//                    }
//                }
//            }
//        } else {
//            node._showingSubMenu = false;
//            if (node._subMenuNode) {
//                menuHeight = this._paper.subLinks[index]._subMenuHeight;
//                for (i = index + 1; i < this._paper.links.length; ++i) {
//                    link = this._paper.links[i];
//                    if (link) {
//                        link.currentPos -= menuHeight;
//                        link.currentBottomPos -= menuHeight;
//                        link.animate.start({
//                            y: link.currentPos
//                        });
//                    }
//                }
//                for (i = index; i < this._paper.subLinks.length; ++i) {
//                    link = this._paper.subLinks[i];
//                    if (link) {
//                        if (i === index) {
//                            link.animate.start({
//                                y: this._paper.links[i].currentPos - link._subMenuHeight
//                            }).then(function () {
//                                this._paper.contentNode.sizeManager.deRegister(node._sizeManagerID);
//                                node._subMenuNode.dismount();
//                                node._subMenuNode = null;
//                            }.bind(this));
//                        } else {
//                            link.animate.start({
//                                y: this._paper.links[i].currentBottomPos
//                            });
//                        }
//                    }
//                }
//            }
//        }
//    }.bind(this)
//}

//function _getSubMenuNode(links, zIndex) {
//    var height = links.length * 48,
//        html = '',
//        link,
//        node = new Node()
//            .setSizeMode('relative', 'absolute')
//            .setAbsoluteSize(0, height);
//    node._subMenuHeight = height;
//    node.animate = new AnimatePosition(node);
//    ScrollContainer.registerChildNodeEvents(node);
//    for (var i = 0; i < links.length; ++i) {
//        link = links[i];
//        if (link.href) {
//            if (link.id === 'webTrader') {
//                if (globalStore.get('isMobile')) {
//                    html += this._templates.subMenuLinkExternal.format(link.href + 'Mobile', this._language[link.id]);
//                } else html += this._templates.subMenuLink.format(link.href, this._language[link.id]);
//            } else html += this._templates.subMenuLink.format(link.href, this._language[link.id]);
//        } else {
//            html += this._templates.subMenu.format(this._language[link.id]);
//        }
//    }
//    new DOMElement(node, {
//        properties: {
//            'z-index': zIndex
//        },
//        classes: ['bg-white'],
//        content: html
//    });
//    EventRipple.syncEventsToRipple(node, {
//        globalClickSetter: true,
//        backgroundClassList: ['bg-black-21'],
//        ripple: {
//            classList: ['bg-black-21'],
//            radius: 140,
//            baseScale: 0.02,
//            z: 4
//        },
//        size: {
//            fixed: true,
//            y: 48
//        },
//        clickMap: {
//            fixed: true,
//            y: {
//                start: 0,
//                step: 48
//            }
//        },
//        clickFunc: _getSubMenuClickFunc.call(this, node, links)
//    });
//    return node;
//}

//function _getSubMenuClickFunc(node, links) {
//    return function (indices) {
//        var link = links[indices.y];
//        node._ripple.toggleActive(true);
//        if (link.func) {
//            this[link.func](link.id);
//        } else if (globalStore.get('windowWidth') < 1438) this.changeState('hidden');
//    }.bind(this)
//}

function _renderButton() {
    this._button.buttonNode = this._button.node.addChild()
        .setPosition(0, 0, 2);
    new DOMElement(this._button.buttonNode, {
        content: this._button.logo
    });
    this._button.opacityAnimation = new AnimateOpacity(this._button.node);
    //this._button.opacityAnimation.start({
    //    opacity: 1,
    //    duration: 2000
    //});
    EventRipple.syncEventsToRipple(this._button.buttonNode, {
        globalClickSetter: true,
        scrollOverride: true,
        backgroundClassList: [],
        clickFunc: function () {
            this._button.buttonNode._ripple.toggleActive(true);
            if (this._SMCurrent === 'hidden' && !this._paper.rootNode) {
                this._paper.rootNode = new Node();
                _createPaper.call(this, new ZDiv(this._paper.rootNode, {
                    z: 2
                }).contentNode);
                //this._paper.node.setPosition(-240, 0, 0);
                _renderLinks.call(this);
                //this._rootNode.show();
                this._rootNode.addChild(this._paper.rootNode);
                globalStore.deferAction(10)
                    .then(this.changeState.bind(this, 'main'));
            } else this.changeState(this._SMCurrent === 'hidden' ? 'main' : 'hidden');
        }.bind(this)
    });
    if (this._fbButton) {
        new DOMElement(this._fbButton.node, {
            content: this._templates.fbLogo
        });
    }
    //new DOMElement(this._supportButtons.node, {
    //    content: this._templates.supportLogos
    //});
    //this._supportButtons.node.registerEvent('click');
    //this._supportButtons.node.addManagedComponent(getEventReceiver({
    //    eventName: 'click',
    //    callback: function (event) {
    //        event.stopPropagation();
    //    }.bind(this)
    //}));
    //EventRipple.syncEventsToRipple(this._supportButtons.node, {
    //    globalClickSetter: true,
    //    backgroundClassList: [],
    //    noRipple: true,
    //    scrollOverride: true,
    //    size: {
    //        fixed: true,
    //        y: 48
    //    },
    //    clickMap: {
    //        fixed: false,
    //        x: [
    //            {
    //                min: 0,
    //                max: 48,
    //                y: [[0, 48]]
    //            }
    //        ]
    //    },
    //    clickFunc: _supportClickFunc.bind(this)
    //});
    //globalStore.watch('contactUs', function() {
    //    _supportClickFunc.call(this, {
    //        y: 0,
    //        screenX: 0,
    //        screenY: 0
    //    })
    //}.bind(this));
    //this._supportButtons.node.show();
    this._button.buttonNode.show();
}

function _supportClickFunc(indices) {
    if (indices.y === 0) {
        var node = _renderSupportPaper.call(this);
        globalStore.get('rippleToPaper')({
            posX: indices.screenX,
            posY: indices.screenY,
            node: node,
            formID: node.formID
        }).show(this._supportButtons.node._ripple.toggleActive.bind(this._supportButtons.node._ripple, true));
    } else {
        this._supportButtons.node._ripple.toggleActive(true);
    }
}

function _renderSupportPaper() {
    var layout = this._layout.supportPaper,
        rootNode = new Node(),
        formNode,
        form;
    formNode = rootNode.addChild();
    this._supportContentNode = rootNode.addChild();
    if (globalStore.get('windowWidth') > 600) {
        formNode.setSizeMode('absolute')
            .setAbsoluteSize(500);
        this._supportContentNode.setSizeMode('absolute', 'render')
            .setAbsoluteSize(500);
        rootNode.setSizeMode('absolute')
            .setAbsoluteSize(500)
            .setAlign(0.5, 0, 0.5)
            .setMountPoint(0.5, 0, 0.5);
    } else this._supportContentNode.setSizeMode('relative', 'render');
    new DOMElement(this._supportContentNode, {
        content: this._templates.supportPaper.format(this._language)
    });
    EventRipple.syncEventsToRipple(this._supportContentNode, {
        backgroundClassList: ['radius-3'],
        ripple: {
            classList: ['bg-black-54'],
            z: 4
        },
        size: {
            fixed: true,
            x: 128,
            y: 48
        },
        clickFunc: function (indices) {
            this._supportContentNode._ripple.toggleActive(true);
        }.bind(this)
    });
    this._supportClickMap = {
        fixed: false,
        x: []
    };
    this._supportContentNode.addManagedComponent({
        onSizeChange: _recalculateClickMap.bind(this, layout.chatY)
    });
    formNode.setPosition(0, layout.formY, 2);
    form = new Form(formNode, {
        formData: this._configData.forms.messageForm.config,
        model: {}
    });
    form.registerFunction('submit', Form.submit.bind(form, this._configData.forms.messageForm.request));
    rootNode.sizeManager = this._supportContentNode;
    rootNode.formID = form._formID;
    return rootNode;
}

function _recalculateClickMap(chatY, x) {
    this._supportClickMap.x[0] = {
        min: x - 128,
        max: x,
        y: [[chatY, chatY + 48]]
    };
    EventRipple.changeClickMap(this._supportContentNode, this._supportClickMap);
}

module.exports = AppMenu;