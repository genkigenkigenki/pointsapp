/* karmaTask
 ------------
 Setup Later and install in workflow, ['karma'] prior to production build
 */
var gulp =  require('gulp'),
    karma = require('karma');

gulp.task('karma', function(done) {
    karma.server.start({
        configFile: process.cwd() + '/karma.conf.js',
        singleRun: true
    }, done);
});