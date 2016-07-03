var DOMElement          = require('jokismo_engine_fork/dom-renderables/DOMElement'),
    Node                = require('jokismo_engine_fork/core/Node'),
    clock               = require('jokismo_engine_fork/core/FamousEngine').getClock(),
    _                   = require('lodash'),
    Promise             = require('bluebird'),
    AnimateOpacity      = require('../../components/animation/AnimateOpacity'),
    AnimatePosition     = require('../../components/animation/AnimatePosition'),
    ZDiv                = require('../../components/ui/ZDiv'),
    EventRipple         = require('../../components/ui/EventRipple'),
    getEventReceiver    = require('../../utils/getEventReceiver'),
    globalStore         = require('../../utils/globalStore');

var _defaults = {
        html: {
            photo: '<div><img class="img-stretch" src="{0}" /></div>',
            navigation: '<div class="p-absolute pointer">' +
            '<svg width="48" height="48" viewBox="-8 -8 48 48">' +
            '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">' +
            '<path fill="#ffffff" d="M21.871,9.814 15.684,16.001 21.871,22.188 18.335,25.725 8.612,16.001 18.335,6.276z"></path>' +
            '</svg></svg>' +
            '</div>' +
            '<div class="p-absolute pointer" style="right: 72px;">' +
            '<svg width="48" height="48" viewBox="-8 -8 48 48">' +
            '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">' +
            '<path fill="#ffffff" d="M24.778,21.419 19.276,15.917 24.777,10.415 21.949,7.585 16.447,13.087 10.945,7.585 8.117,10.415 13.618,15.917 8.116,21.419 10.946,24.248 16.447,18.746 21.948,24.248z"></path>' +
            '</svg></svg>' +
            '</div>' +
            '<div class="p-absolute pointer" style="right: 0;">' +
            '<svg width="48" height="48" viewBox="-8 -8 48 48">' +
            '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">' +
            '<path fill="#ffffff" d="M10.129,22.186 16.316,15.999 10.129,9.812 13.665,6.276 23.389,15.999 13.665,25.725z"></path>' +
            '</svg></svg>' +
            '</div>',
            innerCircle: '<div class="inner-circle-container">' +
            '<div class="inner-circle"></div>' +
            '</div>',
            outerCircle: '<div class="outer-circle"></div>'
        },
        layout: {
            paddingX: 12,
            paddingY: 96
        }
    };

function Lightbox(node, options) {
    options = _.merge(_.cloneDeep(_defaults), options);
    this._rootNode = node
        .setOpacity(0);
    this._dismountFunc = options.dismountFunc || null;
    this._secondaryDismountFunc = options.secondaryDismountFunc || null;
    this._boxes = [];
    this._bgNode = new ZDiv(this._rootNode, {
        z: 0
    }).contentNode;
    this._bgNode.setOpacity(0);
    this._boxNode = new ZDiv(this._rootNode, {
        z: 10
    }).contentNode;
    this._photoData = options.photos;
    this._photoData.num = options.photos.length;
    this._html = options.html;
    this._layout = options.layout;
    this._index = options.index || 0;
    _createBgSurfaces.call(this);
    node.addManagedComponent({
        onShow: _show.bind(this)
    });
}

function _show() {
    this.bgAnimation.start({
        opacity: 1
    }).then(_createLightbox.bind(this))
        .then(_repositionBoxes.bind(this))
        .then(_toggleButtons.bind(this, true));
}

function _repositionBoxes(lightboxSize) {
    var promises = [];
    for (var i = 0; i < this._boxes.length; ++i) {
        promises.push(this._boxes[i].reposition(lightboxSize, i));
    }
    return Promise.all(promises);
}

function _toggleButtons(isIncoming) {
    var promises = [],
        opacity = isIncoming ? 1 : 0;
    promises.push(this._navNode.animation.start({
        opacity: opacity
    }));
    promises.push(this._circleNode.animation.start({
        opacity: opacity
    }));
    if (!isIncoming) {
        promises.push(this._outerCircleNode.animation.start({
            x: _getCirclePosition(this._index, this._photoData.num - 1),
            duration: 300
        }));
    }

    return Promise.all(promises);
}

function _createBgSurfaces() {
    this.bgAnimation = new AnimateOpacity(this._bgNode);
    _createBackground.call(this);
}

function _createBackground() {
    new DOMElement(this._bgNode, {
        classes: ['bg-black']
    });
}

function _createLightbox() {
    _createBoxes.call(this);
    _createNavigation.call(this);
    _createCircles.call(this);
    return _createPhotos.call(this);
}

function _createNavigation() {
    this._navNode = this._boxes[0]._rootNode.addChild()
        .setSizeMode('absolute', 'absolute')
        .setAbsoluteSize(192, 48)
        .setAlign(0.5, 1, 0)
        .setMountPoint(0.5, 1, 0)
        .setPosition(0, -24, 2)
        .setOpacity(0);
    this._navNode.animation = new AnimateOpacity(this._navNode);
    new DOMElement(this._navNode, {
        content: this._html.navigation
    });
    EventRipple.syncEventsToRipple(this._navNode, {
        backgroundClassList: ['radius-24'],
        ripple: {
            classList: ['bg-white-87'],
            radius: 150,
            baseScale: 0.12,
            z: 4
        },
        clickMap: {
            fixed: false,
            x: [{
                min: 0,
                max: 48,
                y: [[0, 48]]
            },{
                min: 72,
                max: 120,
                y: [[0, 48]]
            },{
                min: 144,
                max: 192,
                y: [[0, 48]]
            }]
        },
        size: {
            fixed: false,
            vals: [[[48, 48]], [[48, 48]], [[48, 48]]]
        },
        clickFunc: _clickFunc.bind(this)
    });
    this._navNode.show();
}

function _clickFunc(indices) {
    this._navNode._ripple.toggleActive(true);
    switch(indices.x) {
        case 0:
            _changeSlide.call(this, -1);
            break;
        case 1:
            _close.call(this);
            break;
        case 2:
            _changeSlide.call(this, 1);
            break;
        default:
            throw new Error('Unmapped click function in Lightbox view.')
    }
}

function _close() {
    _toggleButtons.call(this, false)
        .then(_repositionBoxes.bind(this, {
            x: 0,
            y: 0
        }))
        .then(function() {
            this._boxNode.hide();
            this._photos[this._index].toggle(false);
        }.bind(this))
        .then(this.bgAnimation.start.bind(this.bgAnimation, {
            opacity: 0
        }))
        .then(function() {
            if (this._dismountFunc) this._dismountFunc();
            if (this._secondaryDismountFunc) this._secondaryDismountFunc();
        }.bind(this));
}

function _changeSlide(change) {
    var oldIndex = this._index;
    this._index = _fixIndex(this._index + change, this._photoData.num);
    _toggleButtons.call(this, false)
        .then(_repositionBoxes.bind(this, {
            x: 0,
            y: 0
        }))
        .then(_changePhotos.bind(this, oldIndex))
        .then(_repositionBoxes.bind(this))
        .then(_toggleButtons.bind(this, true));
}

function _fixIndex(index, num) {
    if (index >= num) index = 0 + (index - num);
    else if (index < 0) index = num - Math.abs(index);
    return index;
}

function _changePhotos(oldIndex) {
    var num = this._photoData.num,
        oldPrevIndex = _fixIndex(oldIndex - 1, num),
        oldNextIndex = _fixIndex(oldIndex + 1, num),
        newPrevIndex = _fixIndex(this._index - 1, num),
        newNextIndex = _fixIndex(this._index + 1, num),
        currentPhoto,
        newIndex;
    this._photos[oldIndex].toggle(false);
    currentPhoto = this._photos[this._index];
    if (!currentPhoto) {
        _swapPhotoCache.call(this, oldIndex, this._index);
        currentPhoto = this._photos[this._index];
    }
    if (!currentPhoto.loaded) {
        currentPhoto.load(this._index, this._photoData, this._html.photo, this._layout);
    }
    if (num > 3) {
        if (oldPrevIndex !== this._index && oldPrevIndex !== newPrevIndex && oldPrevIndex !== newNextIndex) {
            newIndex = !this._photos[newPrevIndex] ? newPrevIndex : newNextIndex;
            _swapPhotoCache.call(this, oldPrevIndex, newIndex);
        }
        if (oldNextIndex !== this._index && oldNextIndex !== newPrevIndex && oldNextIndex !== newNextIndex) {
            newIndex = !this._photos[newPrevIndex] ? newPrevIndex : newNextIndex;
            _swapPhotoCache.call(this, oldNextIndex, newIndex);
        }
    }
    currentPhoto.toggle(true);
    return {
        x: currentPhoto.scaledX,
        y: currentPhoto.scaledY
    }
}

function _swapPhotoCache(oldIndex, newIndex) {
    this._photos[newIndex] = this._photos[oldIndex];
    this._photos[oldIndex] = null;
    this._photos[newIndex].loaded = false;
}

function _createCircles() {
    var width = this._photoData.num * 48,
        clickMap;
    this._circleNode = this._boxes[2]._rootNode.addChild()
        .setSizeMode('absolute', 'absolute')
        .setAbsoluteSize(width, 48)
        .setAlign(0.5, 0, 0)
        .setMountPoint(0.5, 0, 0)
        .setPosition(0, 24, 2)
        .setOpacity(0);
    this._circleNode.animation = new AnimateOpacity(this._circleNode);
    new DOMElement(this._circleNode, {
        content: this._html.innerCircle.repeat(this._photoData.num)
    });
    this._outerCircleNode = this._circleNode.addChild()
        .setSizeMode('render', 'render')
        .setAlign(0.5, 0.5, 0)
        .setMountPoint(0.5, 0.5, 0)
        .setPosition(_getCirclePosition(this._index, this._photoData.num - 1), 0, 2);
    new DOMElement(this._outerCircleNode, {
        classes: ['events-none'],
        content: this._html.outerCircle
    });
    this._outerCircleNode.animation = new AnimatePosition(this._outerCircleNode);
    clickMap = _getClickMap.call(this);
    EventRipple.syncEventsToRipple(this._circleNode, {
        backgroundClassList: ['radius-24'],
        ripple: {
            classList: ['bg-white-87'],
            radius: 150,
            baseScale: 0.12,
            z: 4
        },
        clickMap: {
            fixed: false,
            x: clickMap.map
        },
        size: {
            fixed: false,
            vals: clickMap.size
        },
        clickFunc: _circleClickFunc.bind(this)
    });
    this._circleNode.show();
}

function _circleClickFunc(indices) {
    this._circleNode._ripple.toggleActive(true);
    _changeSlide.call(this, indices.x - this._index);
}

function _getClickMap() {
    var clickMap = {
        map: [],
        size: []
    };
    for (var i = 0; i < this._photoData.num; ++i) {
        clickMap.map.push({
            min: 48 * i,
            max: 48 * (i + 1),
            y: [[0, 48]]
        });
        clickMap.size.push([[48, 48]]);
    }
    return clickMap;
}

function _getCirclePosition(index, max) {
    var center = max / 2,
        skew = index - center;
    return skew * 48;
}

function _createBoxes() {
    this._boxes.push(new Box({
        size: [1, 0.5],
        align: [0.5, 0, 0]
    }, this._boxNode));
    this._boxes.push(new Box({
        size: [0.5, 1],
        align: [1, 0.5, 0]
    }, this._boxNode));
    this._boxes.push(new Box({
        size: [1, 0.5],
        align: [0.5, 1, 0]
    }, this._boxNode));
    this._boxes.push(new Box({
        size: [0.5, 1],
        align: [0, 0.5, 0]
    }, this._boxNode));
}

function Box(options, node) {
    this._rootNode = node.addChild()
        .setProportionalSize(options.size[0], options.size[1])
        .setAlign(options.align[0], options.align[1], options.align[2])
        .setMountPoint(options.align[0], options.align[1], options.align[2]);
    new DOMElement(this._rootNode, {
        classes: ['bg-black']
    });
    this.animation = new AnimatePosition(this._rootNode);
}

Box.prototype.reposition = function _reposition(lightboxSize, index) {
    var pos;
    switch(index) {
        case 0:
            pos = lightboxSize.y === 0 ? 0 : -(lightboxSize.y / 2);
            return this.animation.start({
                y: pos
            });
        case 1:
            pos = lightboxSize.x === 0 ? 0 : lightboxSize.x / 2;
            return this.animation.start({
                x: pos
            });
        case 2:
            pos = lightboxSize.y === 0 ? 0 : lightboxSize.y / 2;
            return this.animation.start({
                y: pos
            });
        case 3:
            pos = lightboxSize.x === 0 ? 0 : -(lightboxSize.x / 2);
            return this.animation.start({
                x: pos
            });
    }
};

function _createPhotos() {
    var currentPhoto;
    this._photoNode = this._bgNode.addChild()
        .setPosition(0, 0, 2);
    this._photos = {};
    currentPhoto = this._photos[this._index] = new Photo(this._index, this._photoNode.addChild());
    if (this._photoData.num > 1) this._photos[this._index + 1] = new Photo(this._index + 1, this._photoNode.addChild());
    if (this._photoData.num > 2) this._photos[this._photoData.num - 1] = new Photo(this._photoData.num - 1, this._photoNode.addChild());
    currentPhoto.load(this._index, this._photoData, this._html.photo, this._layout);
    currentPhoto.toggle(true);
    return {
        x: currentPhoto.scaledX,
        y: currentPhoto.scaledY
    }
}

function Photo(index, node) {
    node.setOrigin(0.5, 0.5, 0)
        .setAlign(0.5, 0.5, 0)
        .setMountPoint(0.5, 0.5, 0)
        .setSizeMode('absolute', 'absolute');
    this.index = index;
    this.loaded = false;
    this._rootNode = node;
    this._el = new DOMElement(node);
    node.setOpacity(0);
}

Photo.prototype.load = function _loadPhoto(index, photoData, html, layout) {
    photoData = photoData[index];
    this.loaded = true;
    this._el.setContent(html.format(photoData.url));
    this._rootNode.setAbsoluteSize(photoData.x, photoData.y);
    this._sizeX = photoData.x;
    this._sizeY = photoData.y;
    this.index = index;
    _scalePhoto.call(this, layout);
};

function _scalePhoto(layout) {
    var scale = 1,
        height = this._sizeY;
    var maxWidth = globalStore.get('windowWidth') - (layout.paddingX * 2);
    var maxHeight = globalStore.get('windowHeight') - (layout.paddingY * 2);
    if (this._sizeX > maxWidth) {
        scale = _getScale(maxWidth, this._sizeX);
        height = height * scale;
    }
    if (height > maxHeight) {
        scale = _getScale(maxHeight, this._sizeY);
    }
    this._rootNode.setScale(scale, scale, 1);
    this.scaledX = Math.ceil(scale * this._sizeX);
    this.scaledY = Math.ceil(scale * this._sizeY);
}

function _getScale(max, size) {
    return max / size;
}

Photo.prototype.toggle = function _toggle(bool) {
    this._rootNode.setOpacity(bool ? 1 : 0);
};

module.exports = Lightbox;