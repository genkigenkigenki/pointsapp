var gulp        = require('gulp'),
    del         = require('del'),
    getConfig   = require('../config').getConfig,
    config;

gulp.task('clean', function(cb) {
    config = getConfig().clean;
    del(config.dest, cb);
});