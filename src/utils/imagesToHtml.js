module.exports = function _imagesToHtml(maxWidth, imageData, model) {
    var width,
        height,
        image,
        template = '<div class="{3}" style="height: {0}px; width: {1}px;"><img src="{2}"></div>';
    for (var i = 0; i < imageData.length; ++i) {
        image = imageData[i];
        if (image.width <= maxWidth) {
            width = image.width;
            height = image.height;
        } else {
            width = maxWidth;
            height = Math.floor(image.height * (maxWidth / image.width));
        }
        model[image.id] = template.format(height, width, image.src, image.shadow ? 'shadow-one' : '');
    }
}