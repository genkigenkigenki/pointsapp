var DOMExecute = {
    eventManager: null,
    execute: execute,
    init: init
};

function init(eventManager, backend, grecaptchaSitekey) {
    DOMExecute.eventManager = eventManager;
    DOMExecute.backend = backend;
    if (grecaptchaSitekey) DOMExecute.grecaptchaSitekey = grecaptchaSitekey;
    eventManager.register({
        type: 'message',
        func: execute,
        signature: 'DOMRequest'
    });
    DOMExecute.eventManager = eventManager;
}

function reportClick(e) {
    e.preventDefault();
    if (DOMExecute.eventManager) {
        DOMExecute.eventManager.sendMessage('gotClick', {
            id: e.target.id,
            x: e.clientX,
            y: e.clientY
        });
    }
}

function execute(data) {
    var el;
    if (data.id) {
        el = document.getElementById(data.id);
        if (!data.count) data.count = 0;
        else if (data.count === 50) throw new Error('DOMExecute taking too long 10 loops reached.');
        if (!el) {
            data.count++;
            setTimeout(execute.bind(null, data), data.count < 3 ? 150 : 300);
            return;
        }
    }
    switch (data.type) {
        case 'title':
            document.title = data.value;
            break;
        case 'grecaptcha':
            var id = grecaptcha.render(data.id, {
                sitekey : DOMExecute.grecaptchaSitekey,
                theme : 'light',
                callback: function(captcha) {
                    DOMExecute.backend.grecaptchaCallback(captcha);
                    DOMExecute.eventManager.sendMessage('gotCaptcha', captcha);
                },
                size: window.innerWidth < 500 ? 'compact' : 'normal'
            });
            DOMExecute.backend.registerCaptcha(id);
            break;
        case 'getClick':
            el.addEventListener('click', reportClick);
            break;
        case 'removeClick':
            el.removeEventListener('click', reportClick);
            break;
        case 'value':
            el = el.getElementsByTagName('input');
            el[0].value = data.value;
            if (DOMExecute.eventManager) {
                DOMExecute.eventManager.sendMessage('DomRequestComplete', {
                    id: data.id
                });
            }
            break;
        case 'div':
            el.innerHTML = data.value;
            if (DOMExecute.eventManager) {
                DOMExecute.eventManager.sendMessage('DomRequestComplete', {
                    id: data.id
                });
            }
            break;
        default:
            throw new Error('No DOMExecute type found.')
    }
}

module.exports = DOMExecute;