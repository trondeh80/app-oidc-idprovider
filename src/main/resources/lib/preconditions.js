function check(predicate, message) {
    if (!predicate) {
        throw message;
    }
}

function checkNotNull(value, message) {
    if (value == null) {
        throw message;
    }
    return value;
}

function checkParameter(params, name) {
    const value = params[name];
    if (value == null) {
        throw 'Missing parameter [' + name + ']';
    }
    return value;
}

function checkConfig(params, name) {
    const value = params[name];
    if (value == null) {
        throw 'Missing config [' + name + ']';
    }
    return value;
}

exports.check = check;
exports.checkNotNull = checkNotNull;
exports.checkParameter = checkParameter;
exports.checkConfig = checkConfig;