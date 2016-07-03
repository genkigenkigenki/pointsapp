var DOMElement          = require('jokismo_engine_fork/dom-renderables/DOMElement'),
    PhysicsEngine       = require('jokismo_engine_fork/physics/PhysicsEngine'),
    Spring              = require('jokismo_engine_fork/physics/forces/Spring'),
    Particle            = require('jokismo_engine_fork/physics/bodies/Particle'),
    Transitionable      = require('jokismo_engine_fork/transitions/Transitionable'),
    Vec3                = require('jokismo_engine_fork/math/Vec3'),
    _                   = require('lodash'),
    ScrollBar           = require('./ScrollBar'),
    ZDiv                = require('./ZDiv'),
    EventEmitter        = require('../../utils/EventEmitter'),
    globalStore         = require('../../utils/globalStore');

var _defaults = {
    edgeVelocityLimit: 30,
    edgeDeltaLimit: 100,
    _resetPositionOnHide: true
};

function ScrollContainer(node, options) {
    var direction = options && options.direction || 'y';
    this._rootNode = options && options.rootNode || node;
    this._contentRootNode = new ZDiv(this._rootNode.addChild(), {
        z: 2
    }).contentNode;
    this._resetPositionOnHide = options && options._resetPositionOnHide || _defaults._resetPositionOnHide;
    this._isX = direction === 'x';
    this._beginEdge = 0;
    this._endEdge = 0;
    this._nearEdge = 'begin';
    this._containerSize = 0;
    this._contentSize = 0;
    this._position = 0;
    this._lastDelta = 0;
    this._addedY = 0;
    this._barActive = false;
    this._earlyExit = false;
    this._contentNode = null;
    this._id = node.addComponent(this);
    this._onEdge = {
        status: true,
        edge: 'begin'
    };
    this._simulation = {
        status: 'idle',
        time: 1,
        engine: new PhysicsEngine(),
        elements: [],
        isNegativeMovement: true,
        idleCount: 0,
        moveCount: 0,
        lastDelta: 0,
        edgeVelocityLimit: options && options.edgeVelocityLimit || _defaults.edgeVelocityLimit,
        edgeDeltaLimit: options && options.edgeDeltaLimit || _defaults.edgeDeltaLimit,
        velocity: {
            status: 'idle',
            transitionable: new Transitionable(0)
        }
    };
    this.events = new EventEmitter();
    if (options && options.bar) {
        this._barNode = new ZDiv(this._rootNode.addChild(), {
            z: 20
        }).contentNode;
        _createBar.call(this, options);
    }
    _registerScrollHandler.call(this, this._rootNode);
    if (options && options.syncScroll) {
        this._syncScrollID = globalStore.registerPipe(options.syncScroll, this._rootNode);
    }
    _registerDragHandler.call(this, this._rootNode);
    _watchContainerSize.call(this);
}

ScrollContainer.prototype.simulationSyncStart = function() {
    this._rootNode.requestUpdate(this._id);
};

ScrollContainer.prototype.setContainerSize = function(x, y) {
    this._containerSize = this._isX ? x : y;
    if (this._bar) this._bar.events.emit('containerResize', this._containerSize);
    _setEndEdge.call(this);
};

ScrollContainer.prototype.onUpdate = function onUpdate (time) {
    var sim = this._simulation,
        vel = sim.velocity,
        posArray,
        velocity,
        direc,
        pos;
    if (sim.status !== 'idle') {
        if (sim.particle) {
            if (vel.status === 'active') {
                if (sim.status === 'edge') {
                    vel.count++;
                    if (vel.count > 2) {
                        vel.count = 0;
                        vel.status = 'idle';
                    }
                }
                velocity = vel.transitionable.get();
                if (this._nearEdge && Math.abs(velocity) > sim.edgeVelocityLimit) {
                    direc = velocity >= 0 ? 1 : -1;
                    if ( (this._nearEdge === 'begin' && direc === 1) || (this._nearEdge === 'end' && direc === -1)) {
                        velocity = sim.edgeVelocityLimit * direc;
                    }
                }
                sim.particle.setVelocity(this._isX ? velocity : 0, this._isX ? 0 : velocity, 0);
            }
            sim.engine.update(time);
            posArray = sim.engine.getTransform(sim.particle).position;
            pos = this._isX ? posArray[0] : posArray[1];
            if (_.isNumber(pos) && !isNaN(pos)) {
                if (_isIdle.call(this, sim, pos)) {
                    if (this._bar) this._bar.events.emit('scrollEnd');
                    _resetSimulation(sim);
                    return;
                }
                this._setPosition(pos);
                _setEdgeStatus.call(this, sim, pos);
                if (this._bar) _reportPosition.call(this);
            }
        }
        this._rootNode.requestUpdateOnNextTick(this._id);
    }
};

function _setEdgeStatus(sim, newPosition) {
    if (sim.status === 'scroll') {
        if (newPosition > this._beginEdge) {
            this._onEdge.status = true;
            this._onEdge.edge = 'begin';
            _initSimulation.call(this, 'edge');
        }
        if (newPosition < this._endEdge) {
            this._onEdge.status = true;
            this._onEdge.edge = 'end';
            _initSimulation.call(this, 'edge');
        }
    }
}

function _reportPosition(requestedFromBar) {
    var event = requestedFromBar ? 'setPosition' : 'scrollUpdate';
    if (this._onEdge.status) {
        this._bar.events.emit(event, this._onEdge.edge === 'end' ? this._endEdge : this._beginEdge);
    } else this._bar.events.emit(event, this._position);
}

function _isIdle(sim, pos) {
    if (Math.abs(this._position - pos) < 0.001) {
        sim.idleCount++;
    } else sim.idleCount = 0;
    return sim.idleCount > 20;
}

ScrollContainer.prototype.initContent = function(options) {
    this._contentNode = options.node;
    if (options.overflowHidden) {
        new DOMElement(this._contentRootNode, {
            classes: ['oflow-hidden']
        });
        //ScrollContainer.registerChildNodeEvents(this._contentRootNode);
    }
    this._contentRootNode.addChild(options.node);
    _watchContentSize.call(this, options);
};

ScrollContainer.prototype._setPosition = function(pos) {
    this._position = pos;
    if (this._contentNode) {
        this._contentNode.setPosition(this._isX ? pos : 0, this._isX ? 0 : pos, 2);
    }
};

ScrollContainer.prototype.getPosition = function() {
    return {
        pos: this._position,
        isX: this._isX
    }
};


ScrollContainer.registerChildNodeEvents = function(node) {
    node.registerEvent('wheel');
    node.registerEvent('touchstart');
    node.registerEvent('touchmove');
    node.registerEvent('touchend');
    node.registerEvent('touchcancel');
};

ScrollContainer.prototype.onShow = function() {
    if (this._bar) this._bar.onShow();
    _registerBarEvents.call(this);
    if (this._bar) this._bar.events.emit('contentResize', this._contentSize);
    if (this._bar) this._bar.events.emit('containerResize', this._containerSize);
};

ScrollContainer.prototype.watchForm = function(formID) {
    var id = 'inputWatch' + formID,
        tabId = 'inputTabWatch' + formID;
    globalStore.watch(id, _shiftForInput.bind(this));
    globalStore.watch(tabId, _shiftForTab.bind(this));
    if (!this._watching) this._watching = [];
    this._watching.push(id);
    this._watching.push(tabId);
};

ScrollContainer.prototype.onHide = function() {
    globalStore.killHrefs(false);
    this._barActive = false;
    if (this._resetPositionOnHide) this.resetPosition();
    else this.freeze();
    if (this._bar) this._bar.events.emit('setPosition', this._position);
    if (this._bar) this._bar.onHide();
};

//TODO is this running
ScrollContainer.prototype.onDismount = function() {
    if (this._watching) {
        for (var i = 0; i < this._watching.length; ++i) {
            globalStore.unWatch(this._watching[i], 'all');
        }
    }
    if (this._globalWatchingIDs) {
        for (i = 0; i < this._globalWatchingIDs.length; ++i) {
            globalStore.deRegisterGlobalEvent('ui', 'resize', this._globalWatchingIDs[i]);
        }
    }
};

ScrollContainer.prototype.freeze = function() {
    _resetSimulation(this._simulation);
    if (this._position > this._beginEdge) this._setPosition(this._beginEdge);
    else if (this._position < this._endEdge) this._setPosition(this._endEdge);
};

ScrollContainer.prototype.resetPosition = function() {
    _resetSimulation(this._simulation);
    this._setPosition(this._beginEdge);
    if (this._bar) _reportPosition.call(this);
};

function _shiftForTab(posY) {
    var newPos,
        diff;
    if (this._lastShiftY) {
        diff = posY - this._lastShiftY;
        if (diff > 0) {
            newPos = this.getPosition().pos - diff;
            if (newPos < this._endEdge) newPos = this._endEdge;
            this._setPosition(newPos);
            _setEdgeStatus.call(this, this._simulation, newPos);
            if (this._bar) _reportPosition.call(this);
        }
    }
    this._lastShiftY = posY;

}

function _shiftForInput(extraY) {
    var contentPosition = this._containerSize - this._position,
        distToEnd = this._contentSize - contentPosition,
        addY = 0;
    if (globalStore.get('isAndroid') && !this._keyboardShowing) {
        this._keyboardShowing = true;
        if (distToEnd < extraY) {
            addY = extraY - distToEnd;
            this._contentSize = this._contentSize += addY;
            this._addedY = addY;
            if (this._bar) this._bar.events.emit('contentResize', this._contentSize);
            _setEndEdge.call(this);
        }
        this._setPosition(this.getPosition().pos - extraY);
        if (!this._globalWatchingIDs) this._globalWatchingIDs = [];
        this._globalWatchingIDs.push(globalStore.registerGlobalEventCallback('ui', 'resize', function() {
            if (_.isNumber(this._addedY)) {
                this._contentSize -= this._addedY;
                this._addedY = 0;
                if (this._bar) this._bar.events.emit('contentResize', this._contentSize);
                _setEndEdge.call(this);
            }
            this._keyboardShowing = false;
        }.bind(this), true));
    }
}

function _moveStart() {
    var sim = this._simulation;
    this._lastDelta = 0;
    this._earlyExit = false;
    if (!this._barActive) {
        _checkIfNearEdge.call(this);
        if (sim.status === 'idle') {
            sim.status = 'init';
            this.simulationSyncStart();
        }
        sim.idleCount = 0;
        sim.moveCount = 0;
    }
}

function _checkIfNearEdge() {
    var pos = this._position;
    if (pos > this._beginEdge - 25) this._nearEdge = 'begin';
    else if (pos < this._endEdge + 25) this._nearEdge = 'end';
    else this._nearEdge = '';
}

function _initSimulation(type) {
    var sim = this._simulation,
        anchor;
    if (type === sim.status) return;
    _clearSimulation(sim);
    sim.status = type;
    sim.particle = new Particle({
        mass: 1,
        position: new Vec3(this._isX ? this._position : 0, this._isX ? 0 : this._position, 0)
    });
    sim.elements.push(sim.particle);
    if (type === 'edge') {
        anchor = this._onEdge.edge === 'begin' ? this._beginEdge : this._endEdge;
        sim.spring = new Spring(null, sim.particle, {
            period: 1,
            dampingRatio: 0.5,
            length: 0,
            anchor: new Vec3(this._isX ? anchor : 0, this._isX ? 0 : anchor, 0)
        });
        sim.elements.push(sim.spring);
    }
    sim.engine.add(sim.elements);
}

function _resetSimulation(sim) {
    globalStore.deferAction(10).then(function() {
        globalStore.killHrefs(false);
    });
    _clearSimulation(sim);
    sim.status = 'idle';
    sim.velocity.status = 'idle';
}

function _clearSimulation(sim) {
    if (sim.particle) {
        sim.engine.removeBody(sim.particle);
        delete sim.particle;
    }
    if (sim.spring) {
        sim.engine.removeForce(sim.spring);
        delete sim.spring;
    }
    sim.elements = [];
}

function _move(e) {
    var sim = this._simulation,
        velocity = e.velocity,
        delta = e.delta,
        direc = delta >= 0 ? 1 : -1,
        absDelta = Math.abs(delta),
        newPosition;
    if (!this._barActive) {
        if (this._earlyExit) return;
        sim.moveCount++;
        sim.isPositiveMovement = velocity > 0;
        _handleEdgeStatus.call(this, sim);
        if (e.scroll) {
            if (sim.status === 'edge') {
                if (absDelta < this._lastDelta) {
                    this._earlyExit = true;
                    return;
                }
                if (absDelta > sim.edgeDeltaLimit) {
                    delta = sim.edgeDeltaLimit * direc;
                }
            }
            this._lastDelta = absDelta;
            if (absDelta > 150) delta = 150 * direc;
        }
        newPosition = this._position + (delta * 1.5);
        if (sim.status === 'scroll') {
            if (sim.moveCount > 1 || e.scroll) {
                sim.particle.setPosition(this._isX ? newPosition : 0, this._isX ? 0 : newPosition, 0);
            }
        }
        else {
            sim.particle.setPosition(this._isX ? newPosition : 0, this._isX ? 0 : newPosition, 0);
        }
    }
}

function _handleEdgeStatus(sim) {
    if (this._onEdge.status) {
        if ( (sim.isPositiveMovement && this._onEdge.edge === 'begin') ||
            (!sim.isPositiveMovement && this._onEdge.edge === 'end') ) {
            _initSimulation.call(this, 'edge');
        } else {
            this._onEdge.status = false;
            _initSimulation.call(this, 'scroll');
        }
    } else {
        _initSimulation.call(this, 'scroll');
    }
}

function _moveEnd(e) {
    var sim = this._simulation,
        delta = e.delta;
    if (!this._barActive) {
        if (Math.abs(delta) < 3 && sim.status === 'scroll') {
            _resetSimulation(sim);
            if (this._bar) this._bar.events.emit('scrollEnd');
        }
        else if (sim.status === 'scroll' && !e.scroll) _startVelocitySim.call(this, sim, delta);
    }
}

// TODO if existing vel greater than threshold then increase vel by more, if scrolling again then want more speed unless 0

function _startVelocitySim(sim, delta) {
    var vel = sim.velocity,
        currentVelocity = vel.transitionable.get(),
        currentDirec,
        velocity,
        maxVelocity,
        direc;
    globalStore.killHrefs(true);
    vel.status = 'active';
    vel.count = 0;
    direc = delta > 0 ? 1 : -1;
    currentDirec = currentVelocity > 0 ? 1 : -1;
    delta = Math.abs(delta) * 2;
    if (delta < 10) {
        velocity = 40;
        maxVelocity = 80;
    }
    else if (delta < 20) {
        velocity = 100;
        maxVelocity = 150;
    }
    else if (delta < 30) {
        velocity = 200;
        maxVelocity = 300;
    }
    else if (delta < 60) {
        velocity = 400;
        maxVelocity = 500;
    }
    else if (delta < 200) {
        velocity = 800;
        maxVelocity = 1500;
    } else {
        velocity = 1500;
        maxVelocity = 2000;
    }
    if (Math.abs(currentVelocity) > 50 && currentDirec === direc) {
        if (velocity < currentVelocity) {
            velocity = currentVelocity + 100;
            maxVelocity = velocity * 1.2;
        }
    }
    velocity *= direc;
    maxVelocity *= direc;
    vel.transitionable.from(velocity).to(maxVelocity, vel.curve || 'outQuad', vel.duration || 300, function() {
        vel.transitionable.from(maxVelocity).to(velocity, vel.curve || 'outQuad', vel.duration || 1200, function() {
            vel.transitionable.from(velocity).to(0, vel.curve || 'outQuad', vel.duration || 500, function() {
                vel.status = 'idle';
            }.bind(this));
        }.bind(this));
    }.bind(this));
}

function _createBar(options) {
    var barNode,
        positionX = options && _.isNumber(options.shiftX) ? options.shiftX : 0,
        positionY = options && options.shortenBar && -(Math.floor(options.shortenBar / 2)) || 0;
    if (options && _.isNumber(options.shiftY)) positionY += options.shiftY;
    barNode = this._barNode.addChild()
        .setSizeMode('absolute', 'relative')
        .setAbsoluteSize(48, 0)
        .setDifferentialSize(0, -24 - (options && options.shortenBar || 0)) //TODO allow position reconfig here
        .setAlign(1, 0.5)
        .setMountPoint(1, 0.5)
        .setPosition(positionX, positionY, 1);
    this._bar = new ScrollBar(barNode, {
        direction: this._isX ? 'x' : 'y'
    });
}

function _registerBarEvents() {
    if (this._bar) {
        this._bar.events.on('start', function() {
            _resetSimulation(this._simulation);
            this._barActive = true;
        }.bind(this));
        this._bar.events.on('update', function(position) {
            _resetSimulation(this._simulation);
            this._setPosition(position);
            _setEdgeStatusFromBar.call(this, this._position);
        }.bind(this));
        this._bar.events.on('end', function() {
            this._barActive = false;
        }.bind(this));
        this._bar.events.on('getPosition', function() {
            _reportPosition.call(this, true);
        }.bind(this));
    }
}

function _setEdgeStatusFromBar(newPosition) {
    if (newPosition >= this._beginEdge) {
        this._onEdge.status = true;
        this._onEdge.edge = 'begin';
    }
    else if (newPosition <= this._endEdge) {
        this._onEdge.status = true;
        this._onEdge.edge = 'end';
    } else this._onEdge.status = false;
}

function _registerDragHandler(rootNode) {
    rootNode.touchSyncStart({
        direc: this._isX ? 'x' : 'y'
    });
    rootNode._touchSync._eventOutput.on('start', _moveStart.bind(this));
    rootNode._touchSync._eventOutput.on('update', _move.bind(this));
    rootNode._touchSync._eventOutput.on('end', _moveEnd.bind(this));
}

function _registerScrollHandler(rootNode) {
    rootNode.scrollSyncStart({
        direc: this._isX ? 'x' : 'y'
    });
    rootNode._scrollSync._eventOutput.on('start', _moveStart.bind(this));
    rootNode._scrollSync._eventOutput.on('update', _move.bind(this));
    rootNode._scrollSync._eventOutput.on('end', _moveEnd.bind(this));
}

function _watchContentSize(options) {
    var sizeOptions = options.size,
        node,
        size;
    if (sizeOptions.mode === 'absolute') {
        size = sizeOptions.node ? sizeOptions.node.getAbsoluteSize() : options.node.getAbsoluteSize();
        this._contentSize = this._isX ? size[0] : size[1];
        if (this._bar) this._bar.events.emit('contentResize', this._contentSize);
        _handleMaxPositionOverflow.call(this);
        _setEndEdge.call(this);
    } else {
        node = sizeOptions.node || options.node;
        if (!node.sizeManager) throw new Error('ScrollContainer requires node with sizeManager.');
        node.sizeManager.events.on('resize', function(val) {
            this._contentSize = val;
            if (this._bar) this._bar.events.emit('contentResize', this._contentSize);
            _handleMaxPositionOverflow.call(this);
            _setEndEdge.call(this);
        }.bind(this));
    }
}

function _watchContainerSize() {
    this._rootNode.addManagedComponent({
        onSizeChange: function(x, y) {
            this._containerSize = this._isX ? x : y;
            if (this._bar) this._bar.events.emit('containerResize', this._containerSize);
            _handleMaxPositionOverflow.call(this);
            _setEndEdge.call(this);
        }.bind(this)
    });
}

function _handleMaxPositionOverflow() {
    var contentPosition;
    if (this._position < 0) {
        contentPosition = this._containerSize - this._position;
        if (contentPosition > this._contentSize) {
            this._setPosition(-(this._contentSize - this._containerSize));
        }
    }
}

function _setEndEdge() {
    if (this._containerSize >= this._contentSize) this._endEdge = 0;
    else this._endEdge = -(this._contentSize - this._containerSize);
    this._onEdge.status = false;
}

module.exports = ScrollContainer;