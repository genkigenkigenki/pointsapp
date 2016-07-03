var changed     = require('gulp-changed'),
    gulp        = require('gulp'),
    imagemin    = require('gulp-imagemin'),
    browserSync = require('browser-sync'),
    size        = require('gulp-filesize'),
    getConfig   = require('../config').getConfig,
    config;


gulp.task('images', function() {
    config = getConfig().images;
    if (config.minify.apply) {
        return gulp.src(config.src)
            .pipe(imagemin(config.minify.config))
            .pipe(gulp.dest(config.dest))
            .pipe(size())
            .pipe(browserSync.reload({ stream: true }));
    } else {
        return gulp.src(config.src)
            .pipe(changed(config.dest))
            .pipe(gulp.dest(config.dest))
            .pipe(browserSync.reload({ stream: true }));
    }
});