var gulp        = require('gulp'),
    source      = require('vinyl-source-stream'),
    rename      = require('gulp-rename'),
    browserify  = require('browserify'),
    glob        = require('glob'),
    es          = require('event-stream'),
    getConfig   = require('../config').getConfig,
    config;

gulp.task('browserify', function() {
    config = getConfig().browserify;
    return glob(config.src, function(err, files) {
        var tasks = files.map(function(entry) {
            return browserify({ entries: [entry] })
                .bundle()
                .pipe(source(entry))
                .pipe(rename(config.rename))
                .pipe(gulp.dest(config.dest));
        });
        return es.merge.apply(null, tasks);
    });
});