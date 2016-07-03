'use strict';

var _                   = require('lodash'),
    globalStore         = require('../utils/globalStore'),
    components          = require('../components/load'),
    DOMElement          = require('jokismo_engine_fork/dom-renderables/DOMElement'),
    WorkerEventManager  = require('../services/WorkerEventManager'),
    UIEventManager      = require('../services/UIEventManager'),
    RenderManager       = require('../services/RenderManager'),
    FamousEngine        = require('jokismo_engine_fork/core/FamousEngine'),
    DOMRequest          = require('../utils/DOMAccess/request'),
    Node                = require('jokismo_engine_fork/core/Node'),
    getEventReceiver    = require('../utils/getEventReceiver'),
    scene               = FamousEngine.createScene('#famousRender'),
    eventRoot           = scene.addChild();

require('../utils/modifyStringPrototype');
require('../utils/modifyNode');
require('observe-js');

var zDivs = [];

self.workerEventManager = new WorkerEventManager(self);
self.renderer = new RenderManager(eventRoot);
self.UIManager = new UIEventManager(eventRoot, self.renderer);
self.workerEventManager.register({
    type: 'message',
    func: function(data) {
        globalStore.init(data.globalStoreDefaults);
        globalStore.set('browserType', data.browserType);
        globalStore.set('isMobile', data.isMobile);
        globalStore.set('isAndroid', data.isAndroid);
        globalStore.set('hasVisited', data.hasVisited);
        self.UIManager.init();
    },
    signature: 'initialData'
});
self.workerEventManager.register({
    type: 'message',
    func: self.UIManager.newRoute.bind(self.UIManager),
    signature: 'newRoute'
});
self.workerEventManager.register({
    type: 'message',
    func: self.UIManager.routeData.bind(self.UIManager),
    signature: 'routeData'
});
self.workerEventManager.register({
    type: 'message',
    func: self.UIManager.routeCancelled.bind(self.UIManager),
    signature: 'routeCancelled'
});
self.workerEventManager.register({
    type: 'message',
    func: handleFormData,
    signature: 'formData'
});
self.workerEventManager.register({
    type: 'message',
    func: function() {
        globalStore.set('authComplete', true);
    },
    signature: 'authComplete'
});
DOMRequest.init(self.workerEventManager);
globalStore.set('workerEventManager', self.workerEventManager);
globalStore.set('eventRoot', eventRoot);

initRootInteractionEventHandling();
listenToWindowSize();
initRenderSizeManager();
globalStore.set('registerRootZDiv', handleRootZDiv);

function handleFormData(data) {
    globalStore.set(data.formID, data.data);
}

function handleRootZDiv(zDiv) {
    zDivs.push({
        obj: zDiv,
        key: 'contentNode'
    });
    zDiv.contentNode.setAbsoluteSize(globalStore.get('windowWidth'), globalStore.get('windowHeight'));
}

new ZRenderer({
    createNode: function() {
        return new Node();
    },
    renderFuncID: 'showLockScreen',
    component: components.LockScreen,
    z: 800
});

new ZRenderer({
    createNode: function() {
        return new Node()
            .setAlign(0, 1, 0)
            .setMountPoint(0, 0, 0);
    },
    renderFuncID: 'showBottomDrawer',
    component: components.BottomDrawer,
    z: 320
});

new ZRenderer({
    createNode: function() {
        return new Node()
            .setAlign(0, 1, 0)
            .setMountPoint(0, 1, 0);
    },
    renderFuncID: 'showSnackBar',
    component: components.SnackBar,
    z: 275
});

new ZRenderer({
    createNode: function() {
        return new Node();
    },
    renderFuncID: 'showLightbox',
    component: components.Lightbox,
    z: 260
});

new ZRenderer({
    createNode: function() {
        return new Node()
            .setAlign(0, 0, 0)
            .setMountPoint(0, 0, 0)
    },
    renderFuncID: 'rippleToPaper',
    component: components.RippleToPaper,
    z: 250
});

new ZRenderer({
    createNode: function(options) {
        var position = options.position,
            node = new Node();
        if (position) node.setPosition(position[0], position[1], position[2]);
        return node;
    },
    renderFuncID: 'showMenu',
    component: components.Menu,
    z: 150
});

function ZRenderer(options) {
    this._zNode = null;
    this._z = options.z || 500;
    zDivs.push({
        obj: this,
        key: '_zNode'
    });
    this._createNode = options.createNode;
    this._componentObj = options.component;
    globalStore.set(options.renderFuncID, zRender.bind(this));
}

function zRender(options) {
    var node = this._createNode(options);
    options.dismountFunc = this.remove.bind(this);
    if (this._zNode && this._component && this._component.dismount) {
        this._component.dismount();
    }
    this._component = new this._componentObj(node, options);
    this._zNode = new components.ZDiv(eventRoot.addChild(), {
        z: options.z || this._z,
        noResize: true
    }).contentNode;
    this._zNode.setAbsoluteSize(globalStore.get('windowWidth'), globalStore.get('windowHeight'));
    this._zNode.addChild(node);
    return this._component;
}

ZRenderer.prototype.remove = function zRemove() {
    if (this._zNode.isMounted()) this._zNode.dismount();
    this._component = null;
    this._zNode = null;
};

function listenToWindowSize() {
    var events = globalStore.get('uiEvents').resize,
        i,
        zDiv;
    eventRoot.addComponent({
        onSizeChange: function(x, y){
            _.forEach(events, function(val) {
                val(x, y);
            });
        }
    });
    globalStore.registerGlobalEventCallback('ui', 'resize', function(x, y) {
        for (i = 0; i < zDivs.length; ++i) {
            zDiv = zDivs[i];
            if (zDiv.obj[zDiv.key]) {
                zDiv.obj[zDiv.key].setAbsoluteSize(x, y);
            }
        }
        globalStore.set('windowWidth', x);
        globalStore.set('windowHeight', y);
    });
}

function initRenderSizeManager() {
    globalStore.set('renderSizeManager', new components.RenderSizeManager({
        node: eventRoot
    }));
}

function initRootInteractionEventHandling() {
    var events = globalStore.get('interactionEvents'),
        registeredEvents = Object.keys(events),
        type;
    new DOMElement(eventRoot);
    for (var i = 0; i < registeredEvents.length; ++i) {
        type = registeredEvents[i];
        eventRoot.addUIEvent(type);
        eventRoot.addComponent(getEventReceiver({
            eventName: type,
            callback: (function(theType) {
                return function(data) {
                    _.forEach(events[theType], function(val) {
                        val(data);
                    });
                }
            })(type)
        }));
    }
    globalStore.registerGlobalEventCallback('interaction', 'click', function(e) {
        //console.log('clicked');
    });
    globalStore.registerGlobalEventCallback('interaction', 'touchstart', function() {
        globalStore.set('hasTouch', true);
    }, true);
    globalStore.registerGlobalEventCallback('interaction', 'mousemove', function() {
        if (!( globalStore.get('isMobile') && globalStore.get('hasTouch') )) globalStore.set('hasMouse', true);
    }, true);
}

self.workerEventManager.sendMessage('complete', true);

//var zDivMen = new components.ZDiv(eventRoot.addChild(), {
//    z: 10,
//    noResize: true
//});
//var zDivFormConten = new components.ZDiv(eventRoot.addChild(), {
//    z: 1,
//    noResize: true
//});
//
//
//var zDivFormContent = zDivFormConten.contentNode;
//var zDivMenu = zDivMen.contentNode;
//zDivs.push({
//    obj: zDivFormConten,
//    key: 'contentNode'
//});
//zDivs.push({
//    obj: zDivMen,
//    key: 'contentNode'
//});

//init();

//function _testScrollContainer(rootNode) {
//    var childParent = new Node(),
//        child;
//    childParent.sizeManager = new components.SizeManager(childParent, {
//        direction: 'y'
//    });
//    for (var j = 0; j < 30; ++j) {
//        child = childParent.addChild()
//            .setSizeMode('absolute', 'absolute')
//            .setAbsoluteSize(300, 72)
//            .setPosition(0, 72 * j, 0);
//        new DOMElement(child, {
//            content: '<div class="events-none pad-24">' + globalStore.getUniqueId() + '</div>',
//            classes: ['bg-accent']
//        });
//        components.EventRipple.syncEventsToRipple(child);
//        childParent.sizeManager.register(child);
//        components.ScrollContainer.registerChildNodeEvents(child);
//    }
//    zDivMenu.addChild(rootNode);
//    rootNode.scrollContainer.initContent({
//        node: childParent,
//        overflowHidden: true,
//        size: {
//            mode: 'render'
//        }
//    });
//}

//function init() {
//    //var menu = new Node();
//    //var menuComp = new components.Menu(menu, {
//    //    values: ['Afghanistan','Albania','Algeria','American Samoa','Andorra','Angola','Anguilla','Antarctica','Antigua and Barbuda','Argentina','Armenia','Aruba','Australia','Austria','Azerbaijan','Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Benin','Bermuda','Bhutan','Bolivia','Bosnia and Herzegowina','Botswana','Bouvet Island','Brazil','British Indian Ocean Territory','Brunei Darussalam','Bulgaria','Burkina Faso','Burundi','Cambodia','Cameroon','Canada','Cape Verde','Cayman Islands','Central African Republic','Chad','Chile','China','Christmas Island','Cocos (Keeling) Islands','Colombia','Comoros','Congo','Congo, the Democratic Republic of the','Cook Islands','Costa Rica','Cote d\'Ivoire','Croatia (Hrvatska)','Cuba','Cyprus','Czech Republic','Denmark','Djibouti','Dominica','Dominican Republic','East Timor','Ecuador','Egypt','El Salvador','Equatorial Guinea','Eritrea','Estonia','Ethiopia','Falkland Islands (Malvinas)','Faroe Islands','Fiji','Finland','France','France, Metropolitan','French Guiana','French Polynesia','French Southern Territories','Gabon','Gambia','Georgia','Germany','Ghana','Gibraltar','Greece','Greenland','Grenada','Guadeloupe','Guam','Guatemala','Guinea','Guinea-Bissau','Guyana','Haiti','Heard and Mc Donald Islands','Holy See (Vatican City State)','Honduras','Hong Kong','Hungary','Iceland','India','Indonesia','Iran (Islamic Republic of)','Iraq','Ireland','Israel','Italy','Jamaica','Japan','Jordan','Kazakhstan','Kenya','Kiribati','Korea, Democratic People\'s Republic of','Korea, Republic of','Kuwait','Kyrgyzstan','Lao People\'s Democratic Republic','Latvia','Lebanon','Lesotho','Liberia','Libyan Arab Jamahiriya','Liechtenstein','Lithuania','Luxembourg','Macau','Macedonia, The Former Yugoslav Republic of','Madagascar','Malawi','Malaysia','Maldives','Mali','Malta','Marshall Islands','Martinique','Mauritania','Mauritius','Mayotte','Mexico','Micronesia, Federated States of','Moldova, Republic of','Monaco','Mongolia','Montserrat','Morocco','Mozambique','Myanmar','Namibia','Nauru','Nepal','Netherlands','Netherlands Antilles','New Caledonia','New Zealand','Nicaragua','Niger','Nigeria','Niue','Norfolk Island','Northern Mariana Islands','Norway','Oman','Pakistan','Palau','Panama','Papua New Guinea','Paraguay','Peru','Philippines','Pitcairn','Poland','Portugal','Puerto Rico','Qatar','Reunion','Romania','Russian Federation','Rwanda','Saint Kitts and Nevis','Saint LUCIA','Saint Vincent and the Grenadines','Samoa','San Marino','Sao Tome and Principe','Saudi Arabia','Senegal','Seychelles','Sierra Leone','Singapore','Slovakia (Slovak Republic)','Slovenia','Solomon Islands','Somalia','South Africa','South Georgia and the South Sandwich Islands','Spain','Sri Lanka','St. Helena','St. Pierre and Miquelon','Sudan','Suriname','Svalbard and Jan Mayen Islands','Swaziland','Sweden','Switzerland','Syrian Arab Republic','Taiwan, Province of China','Tajikistan','Tanzania, United Republic of','Thailand','Togo','Tokelau','Tonga','Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Turks and Caicos Islands','Tuvalu','Uganda','Ukraine','United Arab Emirates','United Kingdom','United States','United States Minor Outlying Islands','Uruguay','Uzbekistan','Vanuatu','Venezuela','Viet Nam','Virgin Islands (British)','Virgin Islands (U.S.)','Wallis and Futuna Islands','Western Sahara','Yemen','Yugoslavia','Zambia','Zimbabwe'],
//    //    reportChangeFunc: function(data) {
//    //        console.log(data);
//    //    }
//    //});
//    //zDivMenu.addChild(menu);
//    //menuComp.show();
//    //var menuId = menuComp.getId();
//    //var inputTest = new Node();
//    //new components.Input(inputTest, {
//    //    title: 'This is a title',
//    //    validation: 'alphabet',
//    //    defaultValue: 'Hi there'
//    //});
//    //zDivFormContent.addChild(inputTest);
//    //var dropdownTest = new Node();
//    //new components.TextDropdown(dropdownTest, {
//    //    title: 'This is a title',
//    //    values: ['AAAAAAAAAAAA', 'BBBBBBBBBBBBBBB', 'Hi there'],
//    //    defaultIndex: 2
//    //});
//    //zDivFormContent.addChild()
//    //    .setPosition(0, 64, 0)
//    //    .addChild(dropdownTest);
//    //dropdownTest = new Node();
//    //new components.TextDropdown(dropdownTest, {
//    //    title: 'This is a title',
//    //    values: ['AAAAAAAAAAAA', 'BBBBBBBBBBBBBBB', 'Hi there'],
//    //    defaultIndex: 2
//    //});
//    //zDivFormContent.addChild()
//    //    .setPosition(0, 164, 0)
//    //    .addChild(dropdownTest);
//    //dropdownTest = new Node();
//    //new components.TextDropdown(dropdownTest, {
//    //    title: 'This is a title',
//    //    values: ['AAAAAAAAAAAA', 'BBBBBBBBBBBBBBB', 'Hi there'],
//    //    defaultIndex: 2
//    //});
//    //zDivFormContent.addChild()
//    //    .setPosition(0, 264, 0)
//    //    .addChild(dropdownTest);
//
//    var menuTest = new Node()
//        .setPosition(12, 12, 0);
//    var appMenu = new components.AppMenu(menuTest);
//    zDivMenu.addChild(menuTest);
//    appMenu.initView();
//
//    var homeNode = new Node();
//    var home = new components.Checkout(homeNode, {});
//    //new DOMElement(homeNode, {
//    //    classes: ['events-none', 'shadow-one', 'bg-white']
//    //});
//    zDivFormContent.addChild(homeNode);
//
//    //var sizeTest = new Node()
//    //    .setSizeMode('absolute', 'absolute')
//    //    .setPosition(25, 120, 0)
//    //    .setAbsoluteSize(300, 400);
//    //new DOMElement(sizeTest, {
//    //    classes: ['events-none', 'shadow-one']
//    //});
//    //sizeTest.scrollContainer = new components.ScrollContainer(sizeTest, {
//    //    bar: true
//    //});
//    //_testScrollContainer(sizeTest);
//    //var pppp;
//    //for (var i = 0; i < 5; ++i) {
//    //    pppp = new Node()
//    //        .setSizeMode('absolute', 'absolute')
//    //        .setPosition(25, 800, 0)
//    //        .setAbsoluteSize(300, 400);
//    //    new DOMElement(pppp, {
//    //        classes: ['events-none', 'shadow-one']
//    //    });
//    //    pppp.scrollContainer = new components.ScrollContainer(pppp, {
//    //        bar: true
//    //    });
//    //    _testScrollContainer(pppp);
//    //    clock.setTimeout((function(asdf) {
//    //        return function() {
//    //            asdf.dismount();
//    //        }
//    //    })(pppp), 40)
//    //}
//
//    var ccc = new Node();
//    zDivMenu.addChild(ccc);
//    var pp = new components.AnimateScale(ccc);
//    pp.start({
//        x: 0,
//        y: 0,
//        duration: 2000,
//        callback: function() {
//            //console.log('p');
//        }
//    }).then(function() {
//        //console.log('q');
//    });
//
//    console.log(clock.setTimeout(function() {}), 100);
//
//    clock.setTimeout(function() {
//        //sizeTest.hide();
//        menuTest.hide();
//        pp.cancel();
//        //dropdownTest.emit('setValue', {
//        //    change: true,
//        //    value: 'I have been changed.'
//        //});
//        globalStore.get('showSnackBar')({
//            text: 'lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem lorem',
//            buttonText: 'contact support'
//        });
//        globalStore.set('formFilled', true);
//        globalStore.set('cartModel', {
//            subtotal: 1,
//            tax: 0,
//            shipping: 0,
//            total: 0
//        });
//        clock.setTimeout(function() {
//            menuTest.show();
//            clock.setTimeout(function() {
//
//            }, 50);
//        }, 50);
//    }, 5000);
//
//}