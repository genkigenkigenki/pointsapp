var gulp        = require('gulp'),
    reload      = require('browser-sync').reload,
    getConfig   = require('../config').getConfig,
    config;

gulp.task('watch', function() {
    config = getConfig();
    gulp.watch(config.images.src, ['images']);
    gulp.watch(config.ico.src, ['ico']);
    gulp.watch(config.less.src, ['less']);
    gulp.watch(config.json.src, ['json']);
    gulp.watch(config.markup.src, ['markup']);
    gulp.watch(config.watch.less, ['less']);
    gulp.watch(config.watch.browserify, ['browserify']);
    gulp.watch(config.watch.builtJS, reload);
    gulp.watch(config.watch.css, reload);
});