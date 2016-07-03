var devDest         = './build',
    productionDest  = './html',
    src             = './src',
    isDev           = true,
    config          = {},
    pngquant        = require('imagemin-pngquant');

function setDev(bool) {
    isDev = bool
}

config.dev = {
    clean: {
        dest: [devDest, productionDest]
    },
    browserSync: {
        defaultFile: 'index.html',
        config: {
            server: {
                baseDir: devDest
            }
        }
    },
    images: {
        src: src + '/images/**',
        dest: devDest + '/images',
        minify: {
            apply: false
        }
    },
    ico: {
        src: src + '/favicon.ico',
        dest: devDest
    },
    json: {
        src: src + '/**/*.json',
        dest: devDest + ''
    },
    markup: {
        src: src + '/**/*.html',
        dest: devDest + '',
        minify: {
            apply: false
        }
    },
    browserify: {
        src: src + '/bundles/*.js',
        rename: {
            dirname: '/',
            extname: '.bundle.js'
        },
        dest: devDest + '/scripts'
    },
    less: {
        import: src + '/less',
        src: src + '/less/bundles/**/*.less',
        dest: devDest + '/css'
    },
    watch: {
        less: src + '/**/*.less',
        css: devDest + '/**/*.css',
        browserify: src + '/**/*.js',
        builtJS: [devDest + '/**/*.js', devDest + '/index.html'] // Hack: does not watch with just JS
    }
};

config.production = {
    images: {
        src: src + '/images/**',
        dest: productionDest + '/images',
        minify: {
            apply: true,
            config: {
                progressive: true,
                multipass: true,
                optimizationLevel: 7,
                use: [pngquant()]
            }
        }
    },
    ico: {
        src: src + '/favicon.ico',
        dest: productionDest
    },
    markup: {
        src: src + '/**/*.html',
        dest: productionDest + '',
        minify: {
            apply: true,
            config: {
                conditionals: true,
                spare:true
            }
        }
    },
    json: {
        src: src + '/**/*.json',
        dest: productionDest + '',
        minify: true
    },
    less: {
        import: src + '/less',
        src: src + '/less/bundles/**/*.less',
        dest: productionDest + '/css'
    },
    browserify: {
        src: src + '/bundles/*.js',
        rename: {
            dirname: '/',
            extname: '.bundle.js'
        },
        dest: productionDest + '/scripts'
    },
    uglify: {
        src: productionDest + '/scripts/*.js',
        dest: productionDest + '/scripts'
    }
};

module.exports = {
    setDev: setDev,
    getConfig: function() {
        return isDev ? config.dev : config.production;
    }
};