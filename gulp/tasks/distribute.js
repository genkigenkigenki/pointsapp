var gulp        = require('gulp'),
    runSequence = require('run-sequence'),
    config      = require('../config');

gulp.task('dist', function() {
    config.setDev(false);
    runSequence(
        'clean',
        'build'
    );
});