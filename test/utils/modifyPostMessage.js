var modifyPostMessage = require('../../src/utils/modifyPostMessage.js');

describe("ModifyPostMessage on webkitPostMessage enabled browser", function() {

    it("should pass the data as worker", function() {
        var worker = new Worker('/base/test/utils/worker.js');
        var arrayBuffer = new ArrayBuffer(1000);
        modifyPostMessage(worker);
        worker.postMessage(arrayBuffer, [arrayBuffer]);
        expect(arrayBuffer.byteLength).toEqual(0);
        var object = 'a';

        worker.postMessage(object);
        console.log(object);
    });
});