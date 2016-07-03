var gulp        = require('gulp'),
    runSequence = require('run-sequence'),
    config      = require('../config');

gulp.task('build', ['clean'], function() {
    config.setDev(false);
    runSequence(
        ['images', 'ico', 'markup', 'less', 'browserify', 'json']
    );
});