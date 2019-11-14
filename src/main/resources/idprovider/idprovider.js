const configLib = require('/lib/config');
const oidcLib = require('/lib/oidc');
const loginLib = require('/lib/login');
const requestLib = require('/lib/request');
const preconditions = require('/lib/preconditions');
const authLib = require('/lib/xp/auth');
const portalLib = require('/lib/xp/portal');

function redirectToAuthorizationEndpoint() {
    log.debug('Handling 401 error...');

    const idProviderConfig = configLib.getIdProviderConfig();
    const redirectUri = generateRedirectUri();

    const state = oidcLib.generateToken();
    const nonce = oidcLib.generateToken();
    const originalUrl = requestLib.getRequestUrl();
    const context = {
        state: state,
        nonce: nonce,
        originalUrl: originalUrl,
        redirectUri: redirectUri
    };
    log.debug('Storing context: ' + JSON.stringify(context));
    requestLib.storeContext(context);

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

function generateRedirectUri() {
    var idProviderKey = portalLib.getIdProviderKey();
    return portalLib.idProviderUrl({
        idProviderKey: idProviderKey,
        type: 'absolute'
    });
}

function handleAuthenticationResponse(req) {
    const params = getRequestParams(req);

    const context = requestLib.removeContext(params.state);
    if (!context || context.state !== params.state) {
        throw 'Invalid state parameter: ' + params.state;
    }

    if (params.error) {
        throw 'Authentication error [' + params.error + ']' + (params.error_description ? ': ' + params.error_description : '');
    }

    const idProviderConfig = configLib.getIdProviderConfig();
    const code = params.code;

    //https://tools.ietf.org/html/rfc6749#section-2.3.1
    const claims = oidcLib.requestIDToken({
        issuer: idProviderConfig.issuer,
        tokenUrl: idProviderConfig.tokenUrl,
        clientId: idProviderConfig.clientId,
        clientSecret: idProviderConfig.clientSecret,
        redirectUri: context.redirectUri,
        nonce: context.nonce,
        code: code,
    });
    log.debug('ID Token claims: ' + JSON.stringify(claims));


    loginLib.login(claims);

    return {
        redirect: context.originalUrl
    };
}

function getRequestParams(req) {
    const params = req.params;
    log.debug('Checking response params: ' + JSON.stringify(params));

    preconditions.checkParameter(params, 'state');

    if (!params.error) {
        preconditions.checkParameter(params, 'code');
    }

    return params;
}

function logout(req) {
    authLib.logout();

    const finalRedirectUrl = (req.validTicket && req.params.redirect);

    let redirectUrl;
    const config = configLib.getIdProviderConfig();
    if (config.endSession) {
        redirectUrl = config.endSession.url;
        if (finalRedirectUrl || (config.endSession.additionalParameters && config.endSession.additionalParameters.length > 0)) {
            redirectUrl += '?';

            if (finalRedirectUrl) {
                redirectUrl += config.endSession.postLogoutRedirectUriKey + '=' + encodeURIComponent(finalRedirectUrl)
            }

            toArray(config.endSession.additionalParameters).forEach(additionalParameter => {
                if (!redirectUrl.endsWith("?")) {
                    redirectUrl += '&';
                }
                redirectUrl += additionalParameter.key + '=' + additionalParameter.value;
            });
        }
    } else {
        redirectUrl = finalRedirectUrl || generateRedirectUrl();
    }

    return {
        redirect: redirectUrl
    };
}


function generateRedirectUrl() {
    var site = portalLib.getSite();
    if (site) {
        return portalLib.pageUrl({
            id: site._id
        });
    }
    return '/';
}

function toArray(object) {
    if (!object) {
        return [];
    }
    if (object.constructor === Array) {
        return object;
    }
    return [object];
};


exports.handle401 = redirectToAuthorizationEndpoint;
exports.get = handleAuthenticationResponse;
exports.logout = logout;

