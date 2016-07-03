var DOMElement          = require('jokismo_engine_fork/dom-renderables/DOMElement'),
    Node                = require('jokismo_engine_fork/core/Node'),
    clock               = require('jokismo_engine_fork/core/FamousEngine').getClock(),
    _                   = require('lodash'),
    Promise             = require('bluebird'),
    AnimateOpacity      = require('../../components/animation/AnimateOpacity'),
    AnimatePosition     = require('../../components/animation/AnimatePosition'),
    ZDiv                = require('../../components/ui/ZDiv'),
    ScrollContainer     = require('../../components/ui/ScrollContainer'),
    SizeManager         = require('../../components/utils/SizeManager'),
    EventRipple         = require('../../components/ui/EventRipple'),
    DOMRequest          = require('../../utils/DOMAccess/request'),
    getEventReceiver    = require('../../utils/getEventReceiver'),
    globalStore         = require('../../utils/globalStore');

var _defaults = {
    button: {
        classes: ['shadow-one', 'bg-white', 'radius-24', 'pointer']
    },
    svg: {
        close: '<div class="p-absolute" style="top:10px; left: 10px;"><svg fill="#000000" height="28" viewBox="0 0 24 24" width="28" xmlns="http://www.w3.org/2000/svg"> <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/> <path d="M0 0h24v24H0z" fill="none"/> </svg></div>',
        back: '<div class="p-absolute" style="top:10px; left: 10px;"><svg fill="#000000" height="28" viewBox="0 0 24 24" width="28" xmlns="http://www.w3.org/2000/svg"> <path d="M0 0h24v24H0z" fill="none"/> <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/> </svg></div>'
    }
};

function BottomDrawer(node, options) {
    node.setPosition(0, 48, 0);
    this._rootNode = new ZDiv(node.addChild(), {
        z: 0
    }).contentNode;
    this._buttonNode = new ZDiv(node.addChild(), {
        z: 20
    }).contentNode;
    globalStore.set('bottomDrawer', this);
    this._animatePosition = new AnimatePosition(node);
    this._toggleNode = options.toggleNode || null;
    this._dismountFunc = options.dismountFunc || null;
    this._secondaryDismountFunc = options.secondaryDismountFunc || null;
    this._size = globalStore.get('windowHeight') - options.marginTop;
    this._content = options.content || '';
    _renderPaper.call(this, options);
    if (!options.renderFull) {
        globalStore.deferAction(3)
            .then(_slideIn.bind(this));
    }
    if (options.subPages) {
        this.processClick = _transitionToSub.bind(this, options.templates.full);
        this._clickIDs = options.clickIDs;
        this._clickID = globalStore.get('workerEventManager').register({
            type: 'message',
            func: this.processClick,
            signature: 'gotClick'
        });
    }
}

BottomDrawer.prototype.remove = function() {
    globalStore.set('bottomDrawer', null);
    this._animateButton.start({
        opacity: 0
    }).then(function() {
        return this._animatePosition.start({
            y: 24
        });
    }.bind(this)).then(function() {
        this._contentEl.setContent('');
        if (this._dismountFunc) this._dismountFunc();
        if (this._secondaryDismountFunc) this._secondaryDismountFunc();

        if (this._clickID) {
            globalStore.get('workerEventManager').deRegister({
                type: 'message',
                id: this._clickID,
                signature: 'gotClick'
            });
        }
    }.bind(this));
};

function _bindClicks(clicks) {
    for (var i = 0; i < clicks.length; ++i) {
        DOMRequest.send({
            id: clicks[i],
            type: 'getClick'
        });
    }
}

function _renderPaper(options) {
    this._rootNode = this._rootNode.addChild().setSizeMode('relative', 'absolute')
        .setAbsoluteSize(0, globalStore.get('windowHeight'));
    new DOMElement(this._rootNode, {
        classes: ['bg-white', 'shadow-one']
    });
    if (options.fixedWidth) {
        this._contentNode = this._rootNode.addChild()
            .setSizeMode('absolute', 'render')
            .setAbsoluteSize(options.fixedWidth)
            .setAlign(0.5, 0, 0)
            .setMountPoint(0.5, 0, 0)
            .setPosition(0, 0, 2);
    } else {
        this._contentNode = this._rootNode.addChild()
            .setSizeMode('relative', 'render')
            .setAlign(0.5, 0, 0)
            .setMountPoint(0.5, 0, 0)
            .setPosition(0, 0, 2);
    }
    this._contentEl = new DOMElement(this._contentNode, {
        classes: ['pointer'],
        content: options.templates.min
    });
    this._buttonNode = this._buttonNode.addChild().setSizeMode('absolute', 'absolute')
        .setPosition(-24, -24, 10)
        .setAbsoluteSize(48, 48)
        .setAlign(1, 0, 0)
        .setMountPoint(1, 0, 0);
    new DOMElement(this._buttonNode, _defaults.button);
    this._buttonInnerNode = this._buttonNode.addChild();
    this._buttonEl = new DOMElement(this._buttonInnerNode, {
        content: _defaults.svg.close
    });
    this._animateButtonInner = new AnimateOpacity(this._buttonInnerNode);
    this._animateContent = new AnimateOpacity(this._contentNode);
    this._animateButton = new AnimateOpacity(this._buttonNode);
    this._buttonNode.registerEvent('click');
    this._buttonNode.addManagedComponent(getEventReceiver({
        eventName: 'click',
        callback: function(event) {
            event.stopPropagation();
        }
    }));
    EventRipple.syncEventsToRipple(this._buttonNode, {
        globalClickSetter: true,
        scrollOverride: true,
        backgroundClassList: ['radius-24'],
        ripple: {
            z: 4
        },
        clickFunc: function() {
            if (!this._subShowing) this.remove();
            else {
                _transitionToMain.call(this, options.templates.mid)
            }
            this._buttonNode._ripple.toggleActive(true);
        }.bind(this)
    });
    if (options.renderFull) {
        this._expanded = true;
        globalStore.deferAction(3)
            .then(this._animateContent.start.bind(this._animateContent, {
                opacity: 0
            })).then(function() {
                return this._animatePosition.start({
                    y: -this._size
                }).then(function() {
                    this._rootNode.setAbsoluteSize(0, this._size);
                }.bind(this));
            }.bind(this)).then(_renderFullPaper.bind(this, options));
    } else {
        this._rootNode.registerEvent('click');
        this._rootNode.addManagedComponent(getEventReceiver({
            eventName: 'click',
            callback: function() {
                if (!this._expanded) {
                    this._expanded = true;
                    this._animateContent.start({
                        opacity: 0
                    }).then(function() {
                        return this._animatePosition.start({
                            y: -this._size
                        }).then(function() {
                            this._rootNode.setAbsoluteSize(0, this._size);
                        }.bind(this));
                    }.bind(this)).then(_renderFullPaper.bind(this, options));
                }
            }.bind(this)
        }));
    }
}

function _renderFullPaper(options) {
    var scrollNode;
    this._contentNode.dismount();
    if (options.fixedWidth) {
        scrollNode = this._rootNode.addChild()
            .setSizeMode('absolute', 'relative')
            .setAbsoluteSize(options.fixedWidth)
            .setAlign(0.5, 0, 0)
            .setMountPoint(0.5, 0, 0)
            .setPosition(0, 0, 2);
    } else {
        scrollNode = this._rootNode.addChild()
            .setAlign(0.5, 0, 0)
            .setMountPoint(0.5, 0, 0)
            .setPosition(0, 0, 2);
    }
    this._scrollContainer = new ScrollContainer(scrollNode, {
        bar: options.bar || false,
        shiftX: 24,
        shiftY: 24,
        shortenBar: 24
    });
    this._contentNode = new Node()
        .setSizeMode('relative', 'render');
    this._animateContent = new AnimateOpacity(this._contentNode);
    this._contentEl = new DOMElement(this._contentNode, {
        content: options.templates.mid
    });
    this._contentNode.sizeManager = new SizeManager({
        direction: 'y'
    });
    this._scrollContainer.initContent({
        overflowHidden: true,
        node: this._contentNode,
        size: {
            mode: 'render'
        }
    });
    this._contentNode.sizeManager.register(this._contentNode);
    ScrollContainer.registerChildNodeEvents(this._contentNode);
    this._rootNode.show();
    if (this._clickIDs) {
        globalStore.deferAction(2)
            .then(function() {
                _bindClicks(this._clickIDs);
            }.bind(this));
    }
}

function _transitionToSub(templates, data) {
    if (templates[data.id]) {
        if (!this._subShowing) {
            this._subShowing = true;
            this._animateButtonInner.start({
                opacity: 0
            }).then(function() {
                this._buttonEl.setContent(_defaults.svg.back);
                this._animateButtonInner.start({
                    opacity: 1
                });
            }.bind(this));
            this._animateContent.start({
                opacity: 0
            }).then(function() {
                this._scrollContainer.resetPosition();
                this._contentEl.setContent(templates[data.id]);
                this._animateContent.start({
                    opacity: 1
                });
            }.bind(this));
        }
    }
}

function _transitionToMain(template) {
    if (this._subShowing) {
        this._subShowing = false;
        this._animateButtonInner.start({
            opacity: 0
        }).then(function() {
            this._buttonEl.setContent(_defaults.svg.close);
            this._animateButtonInner.start({
                opacity: 1
            });
        }.bind(this));
        this._animateContent.start({
            opacity: 0
        }).then(function() {
            this._scrollContainer.resetPosition();
            this._contentEl.setContent(template);
            this._animateContent.start({
                opacity: 1
            });
        }.bind(this));
        globalStore.deferAction(2)
            .then(function() {
                _bindClicks(this._clickIDs);
            }.bind(this));
    }
}

function _slideIn() {
    var size = this._contentNode.getSize();
    if (size && size[1]) {
        this._animatePosition.start({
            y: -size[1]
        });
    } else {
        globalStore.deferAction(1)
            .then(_slideIn.bind(this));
    }
}

module.exports = BottomDrawer;