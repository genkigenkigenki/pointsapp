var DOMNodeTypes = {
        ELEMENT_NODE 	   : 1,
        TEXT_NODE    	   : 3,
        CDATA_SECTION_NODE : 4,
        COMMENT_NODE	   : 8,
        DOCUMENT_NODE 	   : 9
    },
    config = {},
    _ = require('lodash');

function initConfigDefaults() {
    if(config.escapeMode === undefined) {
        config.escapeMode = true;
    }
    config.attributePrefix = config.attributePrefix || "_";
    config.arrayAccessForm = config.arrayAccessForm || "none";
    config.emptyNodeForm = config.emptyNodeForm || "text";
    if(config.enableToStringFunc === undefined) {
        config.enableToStringFunc = true;
    }
    config.arrayAccessFormPaths = config.arrayAccessFormPaths || [];
    if(config.skipEmptyTextNodesForObj === undefined) {
        config.skipEmptyTextNodesForObj = true;
    }
    if(config.stripWhitespaces === undefined) {
        config.stripWhitespaces = true;
    }
    config.datetimeAccessFormPaths = config.datetimeAccessFormPaths || [];
}

initConfigDefaults();

function toArrayAccessForm(obj, childName, path) {
    switch(config.arrayAccessForm) {
        case "property":
            if(!(obj[childName] instanceof Array))
                obj[childName+"_asArray"] = [obj[childName]];
            else
                obj[childName+"_asArray"] = obj[childName];
            break;
        /*case "none":
         break;*/
    }

    if(!(obj[childName] instanceof Array) && config.arrayAccessFormPaths.length > 0) {
        var idx = 0;
        for(; idx < config.arrayAccessFormPaths.length; idx++) {
            var arrayPath = config.arrayAccessFormPaths[idx];
            if( typeof arrayPath === "string" ) {
                if(arrayPath == path)
                    break;
            }
            else
            if( arrayPath instanceof RegExp) {
                if(arrayPath.test(path))
                    break;
            }
            else
            if( typeof arrayPath === "function") {
                if(arrayPath(obj, childName, path))
                    break;
            }
        }
        if(idx!=config.arrayAccessFormPaths.length) {
            obj[childName] = [obj[childName]];
        }
    }
}

function getNodeLocalName( node ) {
    var nodeLocalName = node.localName;
    if(nodeLocalName == null) // Yeah, this is IE!!
        nodeLocalName = node.baseName;
    if(nodeLocalName == null || nodeLocalName=="") // =="" is IE too
        nodeLocalName = node.nodeName;
    return nodeLocalName;
}

function getNodePrefix(node) {
    return node.prefix;
}

function unescapeXmlChars(str) {
    return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#x2F;/g, '\/');
}

function checkFromXmlDateTimePaths(value, childName, fullPath) {
    if(config.datetimeAccessFormPaths.length > 0) {
        var path = fullPath.split("\.#")[0];
        var idx = 0;
        for(; idx < config.datetimeAccessFormPaths.length; idx++) {
            var dtPath = config.datetimeAccessFormPaths[idx];
            if( typeof dtPath === "string" ) {
                if(dtPath == path)
                    break;
            }
            else
            if( dtPath instanceof RegExp) {
                if(dtPath.test(path))
                    break;
            }
            else
            if( typeof dtPath === "function") {
                if(dtPath(obj, childName, path))
                    break;
            }
        }
        if(idx!=config.datetimeAccessFormPaths.length) {
            return fromXmlDateTime(value);
        }
        else
            return value;
    }
    else
        return value;
}

function parseDOMChildren( node, path ) {
    if(node.nodeType == DOMNodeTypes.DOCUMENT_NODE) {
        var result = new Object;
        var nodeChildren = node.childNodes;
        // Alternative for firstElementChild which is not supported in some environments
        for(var cidx=0; cidx <nodeChildren.length; cidx++) {
            var child = nodeChildren.item(cidx);
            if(child.nodeType == DOMNodeTypes.ELEMENT_NODE) {
                var childName = getNodeLocalName(child);
                result[childName] = parseDOMChildren(child, childName);
            }
        }
        return result;
    }
    else
    if(node.nodeType == DOMNodeTypes.ELEMENT_NODE) {
        var result = new Object;
        result.__cnt=0;

        var nodeChildren = node.childNodes;

        // Children nodes
        for(var cidx=0; cidx <nodeChildren.length; cidx++) {
            var child = nodeChildren.item(cidx); // nodeChildren[cidx];
            var childName = getNodeLocalName(child);

            if(child.nodeType!= DOMNodeTypes.COMMENT_NODE) {
                result.__cnt++;
                if(result[childName] == null) {
                    result[childName] = parseDOMChildren(child, path+"."+childName);
                    toArrayAccessForm(result, childName, path+"."+childName);
                }
                else {
                    if(result[childName] != null) {
                        if( !(result[childName] instanceof Array)) {
                            result[childName] = [result[childName]];
                            toArrayAccessForm(result, childName, path+"."+childName);
                        }
                    }
                    (result[childName])[result[childName].length] = parseDOMChildren(child, path+"."+childName);
                }
            }
        }

        // Attributes
        for(var aidx=0; aidx <node.attributes.length; aidx++) {
            var attr = node.attributes.item(aidx); // [aidx];
            result.__cnt++;
            result[config.attributePrefix+attr.name]=attr.value;
        }

        // Node namespace prefix
        var nodePrefix = getNodePrefix(node);
        if(nodePrefix!=null && nodePrefix!="") {
            result.__cnt++;
            result.__prefix=nodePrefix;
        }

        if(result["#text"]!=null) {
            result.__text = result["#text"];
            if(result.__text instanceof Array) {
                result.__text = result.__text.join("\n");
            }
            if(config.escapeMode)
                result.__text = unescapeXmlChars(result.__text);
            if(config.stripWhitespaces)
                result.__text = result.__text.trim();
            delete result["#text"];
            if(config.arrayAccessForm=="property")
                delete result["#text_asArray"];
            result.__text = checkFromXmlDateTimePaths(result.__text, childName, path+"."+childName);
        }
        if(result["#cdata-section"]!=null) {
            result.__cdata = result["#cdata-section"];
            delete result["#cdata-section"];
            if(config.arrayAccessForm=="property")
                delete result["#cdata-section_asArray"];
        }

        if( result.__cnt == 1 && result.__text!=null  ) {
            result = result.__text;
        }
        else
        if( result.__cnt == 0 && config.emptyNodeForm=="text" ) {
            result = '';
        }
        else
        if ( result.__cnt > 1 && result.__text!=null && config.skipEmptyTextNodesForObj) {
            if( (config.stripWhitespaces && result.__text=="") || (result.__text.trim()=="")) {
                delete result.__text;
            }
        }
        delete result.__cnt;

        if( config.enableToStringFunc && (result.__text!=null || result.__cdata!=null )) {
            result.toString = function() {
                return (this.__text!=null? this.__text:'')+( this.__cdata!=null ? this.__cdata:'');
            };
        }

        return result;
    }
    else
    if(node.nodeType == DOMNodeTypes.TEXT_NODE || node.nodeType == DOMNodeTypes.CDATA_SECTION_NODE) {
        return node.nodeValue;
    }
}

function parseXmlString(xmlDocStr) {
    var isIEParser = window.ActiveXObject || "ActiveXObject" in window;
    if (xmlDocStr === undefined) {
        return null;
    }
    var xmlDoc;
    if (window.DOMParser) {
        var parser=new window.DOMParser();
        var parsererrorNS = null;
        // IE9+ now is here
        if(!isIEParser) {
            try {
                parsererrorNS = parser.parseFromString("INVALID", "text/xml").childNodes[0].namespaceURI;
            }
            catch(err) {
                parsererrorNS = null;
            }
        }
        try {
            xmlDoc = parser.parseFromString( xmlDocStr, "text/xml" );
            if( parsererrorNS!= null && xmlDoc.getElementsByTagNameNS(parsererrorNS, "parsererror").length > 0) {
                //throw new Error('Error parsing XML: '+xmlDocStr);
                xmlDoc = null;
            }
        }
        catch(err) {
            xmlDoc = null;
        }
    }
    else {
        // IE :(
        if(xmlDocStr.indexOf("<?")==0) {
            xmlDocStr = xmlDocStr.substr( xmlDocStr.indexOf("?>") + 2 );
        }
        xmlDoc=new ActiveXObject("Microsoft.XMLDOM");
        xmlDoc.async="false";
        xmlDoc.loadXML(xmlDocStr);
    }
    return xmlDoc;
}

function parseBucket(obj) {
    var split,
        ref,
        img;
    return _.reduce(obj.Contents, function(result, val, key) {
        split = val.Key.split('/');
        ref = getRef(result, split, split.length - 1);
        if (split[split.length - 1] !== '') {
            img = split[split.length - 1].split('_');
            ref[img[0]] = {
                url: val.Key,
                size: [img[1], img[2].split('.')[0]]
            };
        }
        return result;
    }, {});
}

function getRef(obj, pathArray, num) {
    var ref = obj;
    for (var i = 0; i < num; ++i) {
        if (!ref[pathArray[i]]) {
            ref[pathArray[i]] = {};
        }
        ref = ref[pathArray[i]];
    }
    return ref;
}

module.exports = function(xml) {
    var obj = parseDOMChildren(parseXmlString(xml));
    if (obj.ListBucketResult) return parseBucket(obj.ListBucketResult);
    return obj;
};