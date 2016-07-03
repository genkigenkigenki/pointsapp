var _   = require('lodash'),
    animation = require('./animation/load'),
    ui  = require('./ui/load'),
    utils = require('./utils/load'),
    views  = require('./views/cannect/load');

module.exports = _.merge(animation, _.merge(ui, _.merge(utils, views)));