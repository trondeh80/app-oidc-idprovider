const oidcLib = require('/lib/oidc');
const requestLib = require('/lib/request');
const authLib = require('/lib/xp/auth');
const portalLib = require('/lib/xp/portal');

function redirectToAuthorizationEndpoint() {
    log.debug('Handling 401 error...');

    const idProviderConfig = getIdProviderConfig();
    const redirectUri = generateRedirectUri();

    const state = oidcLib.generateToken();
    const nonce = oidcLib.generateToken();
    const originalUrl = requestLib.getRequestUrl();
    requestLib.storeContext({
        state: state,
        nonce: nonce,
        originalUrl: originalUrl
    });
    log.debug('Storing context. State: ' + state + ', Nonce: ' + nonce + ', Original URL: ' + originalUrl);

    const authorizationUrl = oidcLib.generateAuthorizationUrl({
        authorizationUrl: idProviderConfig.authorizationUrl,
        clientId: idProviderConfig.clientId,
        redirectUri: redirectUri,
        state: state,
        nonce: nonce
    });
    log.debug('Generated authorization URL: ' + authorizationUrl);

    return {
        redirect: authorizationUrl
    };
}

function getIdProviderConfig() {
    const idProviderConfig = authLib.getIdProviderConfig();
    if (idProviderConfig.authorizationUrl == null) {
        throw 'Missing Authorization URL in the ID Provider configuration';
    }
    if (idProviderConfig.clientId == null) {
        throw 'Missing Client ID in the ID Provider configuration';
    }
    return idProviderConfig;
}

function generateRedirectUri() {
    var idProviderKey = portalLib.getIdProviderKey();
    return portalLib.idProviderUrl({
        idProviderKey: idProviderKey,
        type: 'absolute'
    });
}


exports.handle401 = redirectToAuthorizationEndpoint;

