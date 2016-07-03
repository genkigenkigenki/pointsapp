module.exports = {
    id: 'milton',
    homePath: '/home',
    captcha: {
        sitekey: '6LfHnBoTAAAAAOssIlc2oxoBMDe0VgYS4YrhKg6J',
        reset: true
    },
    queryStringModule: 'queryString',
    backendUrls: {
        server: '/',
        api: 'http://thecannect.com/api/v1/'
    },
    mainTemplateUrl: 'mainTemplate',
    routesPath: {
        key: 'server',
        url: 'json/cannect/routes/{0}.json'
    },
    locatePath: {
        key: 'server',
        url: 'api/locate'
    },
    spreadsPath: {
        key: 'server',
        url: 'api/rates/all'
    },
    requestEndpoints: {
        live: {
            key: 'server',
            url: 'json/cannect/routes/en.json',
            captcha: true
        },
        demo: {
            key: 'server',
            url: 'api/demo',
            captcha: true
        },
        vps: {
            key: 'server',
            url: 'api/vps',
            captcha: true
        },
        register: {
            key: 'server',
            url: 'api/register',
            captcha: true,
            cookies: ['ib_code']
        },
        message: {
            key: 'server',
            url: 'api/message',
            captcha: true
        }
    },
    workerPath: '/scripts/worker.bundle.js',
    globalStoreDefaults: {
        fullWidthShowing: false,
        authComplete: false
    },
    viewportChecks: {
        param: 'width',
        operator: '<',
        value: 300, // less than 300 width is always mobile
        valid: 'narrow',
        invalid: {
            param: 'height',
            operator: '<',
            value: 400, // less than 400 height with > 300 width is always mobileLandscape
            valid: 'narrow',
            invalid: {
                param: 'width',
                operator: '<',
                value: 948, // less than 720 width is narrow
                valid: 'narrow',
                invalid: {
                    param: 'width',
                    operator: '<',
                    value: 1184, // less than 1040 width is default, wider is wide
                    valid: 'fixedWide',
                    invalid: 'fixedWide'
                }
            }
        }
    },
    auth: {
        cookieExpiryDays: 1,
        login: {
            url: {
                key: 'api',
                url: 'login'
            },
            username: 'username',
            password: 'password',
            error: 'Authentication Failed.'
        },
        params: [
            {
                header: 'Authorization',
                name: 'access_token',
                string: 'JWT {0}'
            }
        ]
    },
    styling: {
        bodyBackground: '#E0E0E0'
    }
};