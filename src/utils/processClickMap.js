var _vars = {
        xIndices: [],
        i: 0,
        j: 0
    },
    _returnObj = {
        valid: false,
        xIndex: -1,
        yIndex: -1,
        mapX: 0,
        mapY: 0
    };

function _getClickMapIndex(map, val) {
    if (map.num && val > (map.start + ( map.step * map.num ))) return -1;
    return Math.floor(( val - map.start ) / map.step);
}

module.exports = function(clickMap, x, y) {
    var xRange,
        yRange;
    _returnObj.xIndex = -1;
    _returnObj.yIndex = -1;
    _returnObj.mapX = 0;
    _returnObj.mapY = 0;
    _returnObj.data = '';
    _vars.xIndices = [];
    if (!clickMap.fixed) {
        for (_vars.i = 0; _vars.i < clickMap.x.length; ++_vars.i) {
            xRange = clickMap.x[_vars.i];
            if (x >= xRange.min && x <= xRange.max) {
                //_returnObj.xIndex = i;
                //_returnObj.mapX = xRange.min;
                //break;
                _vars.xIndices.push(_vars.i);
            }
        }
        if (_vars.xIndices.length > 0) {
            for (_vars.i = 0; _vars.i < _vars.xIndices.length; ++_vars.i) {
                for (_vars.j = 0; _vars.j < clickMap.x[_vars.xIndices[_vars.i]].y.length; ++_vars.j) {
                    yRange = clickMap.x[_vars.xIndices[_vars.i]].y[_vars.j];
                    if (y >= yRange[0] && y <= yRange[1]) {
                        _returnObj.yIndex = _vars.j;
                        _returnObj.mapY = yRange[0];
                        if (yRange[2]) _returnObj.data = yRange[2];
                        break;
                    }
                }
                if (_returnObj.yIndex !== -1) {
                    _returnObj.xIndex = _vars.xIndices[_vars.i];
                    _returnObj.mapX = clickMap.x[_returnObj.xIndex].min;
                    break;
                }
            }
        }
        //if (_returnObj.xIndex !== -1) {
        //    for (_vars.i = 0; _vars.i < clickMap.x[_returnObj.xIndex].y.length; ++_vars.i) {
        //        yRange = clickMap.x[_returnObj.xIndex].y[_vars.i];
        //        if (y >= yRange[0] && y <= yRange[1]) {
        //            _returnObj.yIndex = _vars.i;
        //            _returnObj.mapY = yRange[0];
        //            break;
        //        }
        //    }
        //}
    } else {
        if (clickMap.x) {
            _returnObj.xIndex = _getClickMapIndex(clickMap.x, x);
            _returnObj.mapX = clickMap.x.start + _returnObj.xIndex * clickMap.x.step;
        } else {
            _returnObj.mapX = 0;
            _returnObj.xIndex = 0;
        }
        if (clickMap.y) {
            _returnObj.yIndex = _getClickMapIndex(clickMap.y, y);
            _returnObj.mapY = clickMap.y.start + (_returnObj.yIndex * clickMap.y.step);
        } else {
            _returnObj.mapY = 0;
            _returnObj.yIndex = 0;
        }
    }
    _returnObj.valid = !( _returnObj.xIndex < 0 || _returnObj.yIndex < 0 );
    return _returnObj;
};