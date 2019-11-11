const oidcLib = require('/lib/oidc');
const loginLib = require('/lib/login');
const requestLib = require('/lib/request');
const preconditions = require('/lib/preconditions');
const authLib = require('/lib/xp/auth');
const portalLib = require('/lib/xp/portal');

function redirectToAuthorizationEndpoint() {
    log.debug('Handling 401 error...');

    const idProviderConfig = getIdProviderConfig();
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

function getIdProviderConfig() {
    const idProviderConfig = authLib.getIdProviderConfig();
    preconditions.checkConfig(idProviderConfig, 'authorizationUrl');
    preconditions.checkConfig(idProviderConfig, 'tokenUrl');
    preconditions.checkConfig(idProviderConfig, 'clientId');
    return idProviderConfig;
}

function generateRedirectUri() {
    var idProviderKey = portalLib.getIdProviderKey();
    return portalLib.idProviderUrl({
        idProviderKey: idProviderKey,
        type: 'absolute'
    });
}

function handleAuthenticationResponse(req) {
    const context = requestLib.removeContext();
    const params = getRequestParams(req, context);

    if (params.error) {
        throw 'Authentication error [' + params.error + ']' + (params.error_description ? ': ' + params.error_description : '');
    }

    const idProviderConfig = getIdProviderConfig();
    const code = params.code;

    //https://tools.ietf.org/html/rfc6749#section-2.3.1
    const claims = oidcLib.requestIDToken({
        tokenUrl: idProviderConfig.tokenUrl,
        code: code,
        redirectUri: context.redirectUri,
        clientId: idProviderConfig.clientId,
        clientSecret: idProviderConfig.clientSecret,
    });
    log.debug('ID Token claims: ' + JSON.stringify(claims));


    loginLib.login(claims);

    return {
        redirect: context.originalUrl
    };
}

function getRequestParams(req, context) {
    const params = req.params;
    log.debug('Checking response params: ' + JSON.stringify(params));

    const state = preconditions.checkParameter(params, 'state');
    log.debug('Removed context: ' + JSON.stringify(context));

    if (state !== context.state) {
        throw 'Invalid state parameter: ' + state;
    }

    if (!params.error) {
        preconditions.checkParameter(params, 'code');
    }

    return params;
}

function logout() {
    authLib.logout();

    var finalRedirectUrl = (req.validTicket && req.params.redirect) || generateRedirectUrl();

    const config = getIdProviderConfig();
    if (config.endSessionUrl) {
        return {
            //TODO
            redirect: config.endSessionUrl
        };
    } else {
        return {
            redirect: finalRedirectUrl
        };
    }
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


exports.handle401 = redirectToAuthorizationEndpoint;
exports.get = handleAuthenticationResponse;
exports.logout = logout;

