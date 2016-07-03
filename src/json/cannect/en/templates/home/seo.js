var json            = require('./narrow.json'),
    fs              = require('fs'),
    imagesToHtml    = require('../../../../../utils/imagesToHtml');
var path = require('path');
require('../../../../../utils/modifyStringPrototype');
require.extensions['.html'] = function (module, filename) {
    module.exports = fs.readFileSync(filename, 'utf8');
};
var html = require('../../../../../html/index_template.html'),
    nav = require('../../../../../html/en/nav.html'),
    news = require('../../../../../html/en/news.html'),
    footer = require('../../../../../html/en/footer.html'),
    home = json.nodes[0].components[1].options,
    innerHTML = '',
    outerHTML = '',
    payment,
    id;

home.sizeX = 300;
home.currentY = 0;
outerHTML = _addFirstPaper(outerHTML, home);
outerHTML = _addQuotePanels(outerHTML, home);

html = html.format({
    html: nav + news + outerHTML + footer,
    title: json.title,
    content: json.desc
});

html = html.split('id=').join('data-id='); html = html.split('data-id="famousRender"').join('id="famousRender"'); html = html.split('data-id="plainText"').join('id="plainText"');

fs.writeFileSync(path.join(__dirname, '../../../../../html/en/home/index.html'), html, {
    encoding: 'utf8'
});

function _addFirstPaper(html, options) {
    var layout = options.layout,
        templates = options.templates,
        language = options.language,
        itemContent,
        accountData,
        template,
        content = '',
        height,
        sizeX = options.sizeX - (layout.accountCard.padding * 2);
    options.currentY += layout.subPageBreak;
    html += templates.subDesc.format({
        sizeX: options.sizeX,
        subPageBreak: layout.subPageBreak
    }).format(language);
    for (var i = 0; i < language.accountTypes.length; ++i) {
        accountData = language.accountTypes[i];
        itemContent = '';
        for (var j = 0; j < accountData.items.length; ++j) {
            template = j % 2 === 0 ? templates.accountItem : templates.accountItemOdd;
            itemContent += template.format(accountData.items[j]);
        }
        height = 120 + 48 * accountData.items.length;
        options.currentY += height;
        content += templates.accountContainer.format({
            sizeX: sizeX,
            content: templates.accountType.format({
                svg: accountData.svg,
                accountType: accountData.accountType,
                sizeX: sizeX,
                headerY: height,
                svgLeft: Math.floor((sizeX - 96) / 2),
                titleMargin: 24,
                circleMarginTop: 24,
                cardMarginTop: 120,
                content: itemContent
            })
        });
        if (i !== language.accountTypes.length - 1) {
            content += '<div class="spacer-24"></div>';
            options.currentY += 24;
        }
    }
    html += content;
    html += '<div class="spacer-24"></div>' +
    '</div>';
    options.currentY += 24 + layout.subPageBreak;
    return html
}

function _addQuotePanels(html, options) {
    var layout = options.layout.quotePanel,
        templates = options.templates,
        language = options.language,
        quotes = options.data.defaultQuotes,
        isTwoCol = options.sizeX >= layout.twoCol,
        top = 0,
        paperTop = options.currentY,
        buttonHeight = isTwoCol ? layout.buttonMarginTopTwoCol : layout.buttonMarginTopOneCol,
        skew = layout.padding,
        buttonWidth = 144,
        buttonSize,
        instrumentSize,
        posY,
        minX,
        horiz,
        halfWidth,
        buttons;
    html += templates.quotePanelsContainer.format({
        sizeX: options.sizeX,
        subPageBreak: options.layout.subPageBreak
    });
    buttonSize = [buttonWidth, layout.buttonHeight];
    if (isTwoCol) {
        buttons = templates.quoteButtonsTwoCol;
        halfWidth = Math.floor(options.sizeX / 2);
        buttonHeight += layout.buttonHeight + layout.buttonMarginBottom;
    } else {
        buttons = templates.quoteButtonsOneCol;
        minX = Math.floor(options.sizeX / 2 - (buttonWidth / 2));
        buttonHeight += layout.buttonHeight * 2;
    }
    options.currentY += buttonHeight;
    html += buttons.format(language);
    instrumentSize = [layout.width, 48];
    if (isTwoCol) {
        if (options.sizeX > layout.width * 2 + layout.padding * 3) {
            skew = Math.floor(( options.sizeX - (layout.width * 2 + layout.padding * 2) ) / 2);
        }
        for (var i = 0; i < 2; ++i) {
            posY = options.currentY + ((layout.height + layout.marginBottom) * i);
        }
        for (i = 0; i < 2; ++i) {
            posY = options.currentY + ((layout.height + layout.marginBottom) * i);
        }
        for (i = 0; i < quotes.length; ++i) {
            top = i < 2 ? buttonHeight : buttonHeight + layout.height + layout.marginBottom;
            horiz = '{0}: {1}px'.format(i % 2 === 0 ? 'left' : 'right', skew);
            html += templates.quotePanel.format({
                index: i,
                horiz: horiz,
                top: top,
                instrument: quotes[i]
            });
        }
        options.currentY += layout.height * 2 + layout.marginBottom * 2;
    } else {
        html += '<div class="spacer-24"></div>';
        minX = Math.floor((options.sizeX - layout.width) / 2);
        for (i = 0; i < 4; ++i) {
            posY = options.currentY + ((layout.height + layout.marginBottom) * i);
        }
        for (i = 0; i < quotes.length; ++i) {
            html += templates.quotePanel.format({
                index: i,
                horiz: 'left: {0}px'.format(minX),
                top: buttonHeight,
                instrument: quotes[i]
            });
            buttonHeight += layout.height + layout.marginBottom;
        }
        options.currentY += (layout.height + layout.marginBottom) * quotes.length;
    }
    html += '</div>';
    return html.format({
        height: options.currentY - paperTop + 24
    });
}