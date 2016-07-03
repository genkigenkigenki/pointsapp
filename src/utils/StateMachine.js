var Promise = require('bluebird');

function StateMachine (states) {
    this._SMDirty = false;
    this._SMStates = states;
    this._SMCurrent = this._SMStates[0];
    this._SMFuncs = {};
    for (var i = 0; i < this._SMStates.length; ++i) {
        this._SMFuncs[this._SMStates[i]] = {
            in: [],
            out: []
        }
    }
}

StateMachine.prototype.changeState = function changeState (newState) {
    var currentFuncs,
        newFuncs,
        funcs = [];
    if (!this._SMFuncs[newState]) throw new Error('State not registered.');
    return new Promise(function(resolve, reject) {
        if (this._SMCurrent !== newState) {
            this._SMDirty = true;
            currentFuncs = this._SMFuncs[this._SMCurrent].out;
            newFuncs = this._SMFuncs[newState].in;
            this._SMCurrent = newState;
            for (var i = 0; i < currentFuncs.length; ++i) {
                funcs.push(currentFuncs[i]());
            }
            Promise.all(funcs).then(function() {
                funcs = [];
                for (i = 0; i < newFuncs.length; ++i) {
                    funcs.push(newFuncs[i]());
                }
                return Promise.all(funcs);
            }).then(resolve);
        } else {
            resolve();
        }
    }.bind(this));
};

StateMachine.prototype.registerChangeFunc = function registerChangeFunc (state, inOut, func) {
    if (!this._SMFuncs[state]) throw new Error('State not registered.');
    this._SMFuncs[state][inOut].push(func);
};

module.exports = StateMachine;