var gulp        = require('gulp'),
    less        = require('gulp-less'),
    cssnano     = require('gulp-cssnano'),
    getConfig   = require('../config').getConfig,
    config;

gulp.task('less', function() {
    config = getConfig().less;
    return gulp.src(config.src)
        .pipe(less({
            paths: [config.import]
        }))
        .pipe(cssnano())
        .pipe(gulp.dest(config.dest));
});