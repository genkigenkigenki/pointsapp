var changed     = require('gulp-changed'),
    gulp        = require('gulp'),
    browserSync = require('browser-sync'),
    getConfig   = require('../config').getConfig,
    config;

gulp.task('ico', function() {
    config = getConfig().ico;
    return gulp.src(config.src)
        .pipe(changed(config.dest)) // Ignore unchanged files
        .pipe(gulp.dest(config.dest))
        .pipe(browserSync.reload({ stream: true }));
});