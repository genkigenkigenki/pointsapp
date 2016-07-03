function returnBlob(data) {
    var blob;
    try {
        blob = new Blob([data], {type: 'application/javascript'});
    } catch (e) {
        try {
            window.BlobBuilder = window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder;
            blob = new BlobBuilder();
            blob.append(data);
            blob = blob.getBlob();
        } catch (e) {
            throw new Error('Blob not supported.');
        }
    }
    return blob;
}

module.exports = returnBlob;