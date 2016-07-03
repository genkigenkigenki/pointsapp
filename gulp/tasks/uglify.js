var gulp        = require('gulp'),
    uglify      = require('gulp-uglify'),
    size        = require('gulp-filesize'),
    config      = require('../config');

gulp.task('uglify', function() {
    config.setDev(false);
    config = config.getConfig().uglify;
    return gulp.src(config.src)
        .pipe(uglify())
        .pipe(gulp.dest(config.dest))
        .pipe(size());
});