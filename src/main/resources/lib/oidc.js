function generateToken() {
    return Java.type('com.enonic.app.oidcidprovider.OIDCUtils').generateToken();
}

function generateAuthorizationUrl(params) {
    const authorizationUrl = required(params, 'authorizationUrl');
    const clientId = required(params, 'clientId');
    const redirectUri = required(params, 'redirectUri');
    const state = required(params, 'state');
    const nonce = required(params, 'nonce');

    //https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest
    return authorizationUrl
           + '?scope=openid email profile'
           + '&response_type=code'
           + '&client_id=' + clientId
           + '&redirect_uri=' + redirectUri
           + '&state=' + state
           + '&nonce=' + nonce;
}

exports.generateToken = generateToken;
exports.generateAuthorizationUrl = generateAuthorizationUrl;


function required(params, name) {
    var value = params[name];
    if (value === undefined) {
        throw 'Missing parameter [' + name + ']';
    }

    return value;
}