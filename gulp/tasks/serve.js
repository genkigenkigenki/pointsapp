var gulp        = require('gulp'),
    runSequence = require('run-sequence'),
    browserSync = require('browser-sync'),
    config      = require('../config'),
    serveIndex  = require('connect-history-api-fallback');

gulp.task('serve', ['clean'], function() {
    var bsConfig;
    config.setDev(true);
    runSequence(
        ['images', 'ico', 'json', 'markup', 'less', 'browserify'],
        'watch',
        function() {
            bsConfig = config.getConfig().browserSync;
            if (bsConfig.defaultFile) {
                bsConfig.config.middleware = [serveIndex({
                    index: '/' + bsConfig.defaultFile
                })];
            }
            browserSync(bsConfig.config);
        }
    );
});