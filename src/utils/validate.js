var _                   = require('lodash'),
    Validation          = {},
    _functions          = {
        testRegex: {
            exec: testRegex,
            pass: 'type'
        },
        required: {
            exec: required
        },
        noSpace: {
            exec: noSpace
        },
        maxLength: {
            exec: maxLength,
            pass: 'subType'
        },
        maxValueByRef: {
            exec: maxValueByRef,
            pass: 'subType'
        },
        password: {
            exec: password
        },
        equality: {
            exec: equality,
            pass: 'equalityValue'
        },
        validCreditCard: {
            exec: validCreditCard
        }
    },
    _regex              = {
        //email: /^(([^<>()\[\]\\.,;:\s@\"]+(\.[^<>()\[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        email: /^[_a-z0-9-]+(\.[_a-z0-9-]+)*(\+[a-z0-9-]+)?@[a-z0-9-]+(\.[a-z0-9-]+)$/,
        alphabet: /^[a-zA-Z\s]+$/,
        alphanumeric: /^[a-zA-Z0-9\s]+$/,
        numeric: /^[0-9]*$/,
        phone: /(?:\(?\+\d{2}\)?\s*)?\d+(?:[ -]*\d+)*$/
    },
    lunValidationAlgo   = function(a){return function(c){for(var l=c.length,b=1,s=0,v;l;)v=parseInt(c.charAt(--l),10),s+=(b^=1)?a[v]:v;return s&&0===s%10}}([0,2,4,6,8,1,3,5,7,9]);

Validation._defaultError = 'Entry is invalid.';
Validation.email = {
    method: 'testRegex',
    error: Validation._defaultError
};
Validation.required = {
    method: 'required',
    error: Validation._defaultError
};
Validation.noSpace = {
    method: 'noSpace',
    error: Validation._defaultError
};
Validation.maxLength = {
    method: 'maxLength',
    error: Validation._defaultError
};
Validation.maxValueByRef = {
    method: 'maxValueByRef',
    error: Validation._defaultError
};
Validation.alphabet = {
    method: 'testRegex',
    error: Validation._defaultError
};
Validation.alphanumeric = {
    method: 'testRegex',
    error: Validation._defaultError
};
Validation.numeric = {
    method: 'testRegex',
    error: Validation._defaultError
};
Validation.phone = {
    method: 'testRegex',
    error: Validation._defaultError
};
Validation.password = {
    method: 'password',
    error: {
        length: Validation._defaultError,
        noNumber: Validation._defaultError
    }
};
Validation.equality = {
    method: 'equality',
    error: Validation._defaultError
};
Validation.validCreditCard = {
    method: 'validCreditCard',
    error: Validation._defaultError
};

function initialize(errorTextObject) {
    _.forEach(errorTextObject, function(val, key) {
        if (!Validation[key]) throw new Error('Validation entry not found for key: {0}'.format(key));
        if (_.isObject(Validation[key].error)) {
            _.forEach(Validation[key].error, function(innerVal, innerKey) {
                Validation[key].error[innerKey] = val[innerKey];
            });
        } else {
            Validation[key].error = val;
        }
    });
}

function getErrorText(type) {
    var error = Validation[type].error;
    if (_.isObject(error)) return error[_.keys(error)[0]];
    return error;
}

function isValid(data, type, equalityValue) {
    var subType,
        validationEntry,
        func,
        passValue;
    if (!type) return {
        result: true
    };
    if (_.isPlainObject(type)) {
        subType = type.subType;
        type = type.type;
    }
    var i,
        result;
    if (_.isArray(type)) {
        for (i = 0; i < type.length; ++i) {
            result = isValid(data, type[i], equalityValue);
            if (!result.result) return result;
        }
        return result;
    } else {
        validationEntry = Validation[type];
        func = _functions[validationEntry.method];
        passValue = func.pass || 'none';
        switch (passValue) {
            case 'none':
                return func.exec(data);
            case 'type':
                return func.exec(data, type);
            case 'subType':
                return func.exec(data, subType);
            case 'equalityValue':
                return func.exec(data, equalityValue);
            default:
                throw new Error('Validation not found for type: {0}'.format(type));
        }
    }
}

function testRegex(data, type) {
    return {
        result: _regex[type].test(data),
        error: Validation[type].error
    };
}

function required(data) {
    data = data.replace(/ /g, '');
    data = data.replace(/　/g, '');
    return {
        result: data.toString().length > 0,
        error: Validation.required.error
    };
}

function noSpace(data) {
    return {
        result: !(_.includes(data, ' ')) && !(_.includes(data, '　')),
        error: Validation.noSpace.error
    };
}

function validCreditCard(data) {
    return {
        result: data.toString().length >= 12 && !!lunValidationAlgo(data),
        error: Validation.validCreditCard.error
    };
}

function maxLength(data, length) {
    return {
        result: data.toString().length <= length,
        error: Validation.maxLength.error.format(length)
    };
}

function maxValueByRef(data, maxValueRef) {
    return {
        result: parseFloat(data) <= parseFloat(maxValueRef.ref[maxValueRef.prop]),
        error: Validation.maxValue.error.format(maxValueRef.ref[maxValueRef.prop])
    };
}

function password(data) {
    var error = false;
    if (data.length < 8) error = Validation.password.error.length;
    else if (!(/\d/.test(data))) error =Validation.password.error.noNumber;
    return {
        result: !error,
        error: error
    };
}

function equality(data, equalityValue) {
    return {
        result: data === equalityValue,
        error: Validation.equality.error
    };
}

module.exports.isValid = isValid;
module.exports.initialize = initialize;
module.exports.getErrorText = getErrorText;