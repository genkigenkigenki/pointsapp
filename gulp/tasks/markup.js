var gulp        = require('gulp'),
    browserSync = require('browser-sync'),
    htmlmin  = require('gulp-htmlmin'),
    size        = require('gulp-filesize'),
    getConfig   = require('../config').getConfig,
    config;

gulp.task('markup', function() {
    config = getConfig().markup;
    if (config.minify.apply) {
        return gulp.src(config.src)
            .pipe(htmlmin({collapseWhitespace: true}))
            .pipe(gulp.dest(config.dest))
            .pipe(size())
            .pipe(browserSync.reload({ stream: true }));
    } else {
        return gulp.src(config.src)
            .pipe(gulp.dest(config.dest))
            .pipe(browserSync.reload({ stream: true }));
    }
});