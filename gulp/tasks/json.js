var changed     = require('gulp-changed'),
    gulp        = require('gulp'),
    browserSync = require('browser-sync'),
    jsonminify  = require('gulp-jsonminify'),
    getConfig   = require('../config').getConfig,
    config;

gulp.task('json', function() {
    config = getConfig().json;
    if (config.minify) {
        return gulp.src(config.src)
            .pipe(changed(config.dest)) // Ignore unchanged files
            .pipe(jsonminify())
            .pipe(gulp.dest(config.dest));
    } else {
        return gulp.src(config.src)
            .pipe(changed(config.dest)) // Ignore unchanged files
            .pipe(gulp.dest(config.dest))
            .pipe(browserSync.reload({ stream: true }));
    }

});