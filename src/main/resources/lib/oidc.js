const preconditions = require('/lib/preconditions');
const httpClient = require('/lib/http-client');

function generateToken() {
    return Java.type('com.enonic.app.oidcidprovider.OIDCUtils').generateToken();
}

function parseClaims(jwt) {
    const parsedJwt = Java.type('com.enonic.app.oidcidprovider.OIDCUtils').parseClaims(jwt);
    return __.toNativeObject(parsedJwt);
}

function generateAuthorizationUrl(params) {
    const authorizationUrl = preconditions.checkParameter(params, 'authorizationUrl');
    const clientId = preconditions.checkParameter(params, 'clientId');
    const redirectUri = preconditions.checkParameter(params, 'redirectUri');
    const state = preconditions.checkParameter(params, 'state');
    const nonce = preconditions.checkParameter(params, 'nonce');

    //https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest
    return authorizationUrl
           + '?scope=' + encodeURIComponent('openid email profile')
           + '&response_type=code'
           + '&client_id=' + encodeURIComponent(clientId)
           + '&redirect_uri=' + encodeURIComponent(redirectUri)
           + '&state=' + state
           + '&nonce=' + nonce;
}

function requestIDToken(params) {
    const tokenUrl = preconditions.checkParameter(params, 'tokenUrl');
    const code = preconditions.checkParameter(params, 'code');
    const redirectUri = preconditions.checkParameter(params, 'redirectUri');
    const clientId = preconditions.checkParameter(params, 'clientId');
    const clientSecret = preconditions.checkParameter(params, 'clientSecret');
    //TODO Handle different authentication methods

    //https://openid.net/specs/openid-connect-core-1_0.html#TokenRequest
    const body = 'grant_type=authorization_code'
                 + '&code=' + code
                 + '&redirect_uri=' + redirectUri
                 + '&client_id=' + clientId
                 + '&client_secret=' + clientSecret;

    const request = {
        url: tokenUrl,
        method: 'POST',
        // headers: {
        //     //https://tools.ietf.org/html/rfc6749#section-2.3.1
        // },
        body: body,
        contentType: 'application/x-www-form-urlencoded'
    };
    log.debug('Sending token request: ' + JSON.stringify(request));

    const response = httpClient.request(request);
    log.debug('Received token response: ' + JSON.stringify(response));

    if (response.status !== 200) {
        throw 'Error ' + response.status + ' while retrieving the ID Token';
    }

    const responseBody = JSON.parse(response.body);

    if (responseBody.error) {
        throw 'Token error [' + params.error + ']' + (params.error_description ? ': ' + params.error_description : '');
    }

    //TODO Validate token
    const claims = parseClaims(responseBody.id_token);

    return claims;
}

exports.generateToken = generateToken;
exports.generateAuthorizationUrl = generateAuthorizationUrl;
exports.requestIDToken = requestIDToken;
