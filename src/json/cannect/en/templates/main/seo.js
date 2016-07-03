var json = require('./narrow.json');
var fs = require('fs');
var _ = require('lodash');
var path = require('path');
require('../../../../../utils/modifyStringPrototype');

var templates = {
    'linkBox': ''
};

var appMenu = json.nodes[3].components[0].options;

var data,
    full = {},
    inner = '',
    innerMid = '',
    news = '';

for (var i = 0; i < appMenu.data.news.length; ++i) {
    data = appMenu.data.news[i];
    inner += appMenu.templates.newsInner.format(data.title);
    innerMid += appMenu.templates.midInner.format(data.title, data.mid, data.date);
    news += appMenu.templates.news.format(appMenu.language.news, inner);
    news += appMenu.templates.mid.format(innerMid);
    if (data.fullID) {
        innerMid += appMenu.templates.newsLink.format(data.fullID);
        news += appMenu.templates.mid.format(appMenu.templates.midInner.format(data.title, data.full, data.date));
    }
}

news = news.split('id=').join('data-id=');

fs.writeFileSync(path.join(__dirname, '../../../../../html/en/news.html'), news, {
    encoding: 'utf8'
});

var linkTemplates = {
    container: '<header>' +
    '<nav><div style="width: 100%; overflow: auto;">{0}</div></nav>' +
    '</header>',
    link: '<div class="pad-24 float-l"><a class="f-button color-black-87" href="{0}">{1}</a></div>'
};

var nav = '';
data = appMenu.data;

for (i = 0; i < data.midLinks.length; ++i) {
    nav += linkTemplates.link.format(data.url + data.midLinks[i], appMenu.language[data.midLinks[i]]);
}

for (i = 0; i < data.bottomLinks.length; ++i) {
    nav += linkTemplates.link.format(data.url + data.bottomLinks[i], appMenu.language[data.bottomLinks[i]]);
}

_.forEach(appMenu.links, function(val) {
    for (i = 0; i < val.length; ++i) {
        if (val[i].func) {
            nav += linkTemplates.link.format('/{0}/home'.format(val[i].id), appMenu.language[val[i].id]);
        }
        else nav += linkTemplates.link.format(val[i].href, appMenu.language[val[i].id]);
    }
});

fs.writeFileSync(path.join(__dirname, '../../../../../html/en/nav.html'), linkTemplates.container.format(nav), {
    encoding: 'utf8'
});

var footer = '<footer>{0}</footer>';
footer = footer.format(appMenu.templates.supportPaper.format(appMenu.language));

fs.writeFileSync(path.join(__dirname, '../../../../../html/en/footer.html'), footer, {
    encoding: 'utf8'
});