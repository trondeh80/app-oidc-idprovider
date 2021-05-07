import cache from '../lib/login-util/cache';
import { createAccessMap, createUser, getDefaultGroups } from "../lib/login";
import { getDynamicsUser } from "../lib/dynamics/get-dynamics-user";

const configLib = require('/lib/config');
const contextLib = require('/lib/context');
const oidcLib = require('/lib/oidc');
const loginLib = require('/lib/login');
const requestLib = require('/lib/request');
const preconditions = require('/lib/preconditions');
const authLib = require('/lib/xp/auth');
const portalLib = require('/lib/xp/portal');

const ACTIONS = {
    AFTER_VERIFY: '1'
}

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
        scopes: 'openid' + (idProviderConfig.scopes ? ' ' + idProviderConfig.scopes : ''),
        state: state,
        nonce: nonce
    });
    log.debug('Generated authorization URL: ' + authorizationUrl);

    return {
        redirect: authorizationUrl
    };
}

function generateRedirectUri(params = {}) {
    return portalLib.idProviderUrl({
        idProviderKey: portalLib.getIdProviderKey(),
        type: 'absolute',
        params
    });
}

/**
 * Called when a user returns successfully from validation
 * @param params
 */
function userVerified({ params }) {
    log.info('User verified request received');
    log.info(JSON.stringify(params, null, 4));
    const { uuid } = params; // Todo: Find out how the dynamics ID is returned!!

    const userData = cache.get(uuid, () => null);
    if (!userData) {
        throw 'Session expired. Please try again';
    }

    const {
        claims,
        idToken,
        context
    } = userData;

    const { user, dynamicsUser, accessMap, isValidAdmin } = createUser(claims, uuid);
    completeLogin({
        claims,
        idToken,
        context,
        user,
        dynamicsUser,
        accessMap,
        isValidAdmin
    });
}


// GET function exported / entry point for user:
function handleAuthenticationResponse(req) {
    const { params: { action } } = req;
    if (action === ACTIONS.AFTER_VERIFY) {
        return userVerified(req);
    }

    const params = getRequestParams(req);
    const context = requestLib.removeContext(params.state);

    if (!context) {
        throw 'no context';
    }

    if (context.state !== params.state) {
        throw 'Invalid state parameter: ' + params.state;
    }

    if (params.error) {
        throw 'Authentication error [' + params.error + ']' + (params.error_description ? ': ' + params.error_description : '');
    }

    const idProviderConfig = configLib.getIdProviderConfig();
    const code = params.code;

    //https://tools.ietf.org/html/rfc6749#section-2.3.1
    const idToken = oidcLib.requestIDToken({
        issuer: idProviderConfig.issuer,
        tokenUrl: idProviderConfig.tokenUrl,
        clientId: idProviderConfig.clientId,
        clientSecret: idProviderConfig.clientSecret,
        redirectUri: context.redirectUri,
        nonce: context.nonce,
        code: code,
    });

    const claims = {
        userinfo: idToken.claims
    };

    if (idProviderConfig.userinfoUrl) {
        const userinfoClaims = oidcLib.requestOAuth2({
            url: idProviderConfig.userinfoUrl,
            accessToken: idToken.accessToken
        });
        log.debug('User info claims: ' + JSON.stringify(userinfoClaims));

        if (idToken.claims.sub !== userinfoClaims.sub) {
            throw 'Invalid sub in user info : ' + userinfoClaims.sub;
        }

        claims.userinfo = oidcLib.mergeClaims(claims.userinfo, userinfoClaims);
    }

    toArray(idProviderConfig.additionalEndpoints).forEach(additionalEndpoint => {
        const additionalClaims = oidcLib.requestOAuth2({
            url: additionalEndpoint.url,
            accessToken: idToken.accessToken
        });
        log.debug('OAuth2 endpoint [' + additionalEndpoint.name + '] claims: ' + JSON.stringify(additionalClaims));
        claims[additionalEndpoint.name] = oidcLib.mergeClaims(claims[additionalEndpoint.name] || {}, additionalClaims);
    });
    log.debug('All claims: ' + JSON.stringify(claims));

    const uuid = loginLib.getUserUuid(claims);
    const user = loginLib.findUserBySub(uuid);

    if (!user) {
        // no user found here. Lets validate :)
        cache.get(uuid, () => ({
            claims,
            idToken,
            context
        }));

        const returnUrl = generateRedirectUri({
            uuid,
            action: ACTIONS.AFTER_VERIFY
        });

        return {
            redirect: `https://minside.njff.no/account/findrelation?id=${uuid}&redirect=${encodeURIComponent(returnUrl)}`
        };
    }

    // User exists, we need to validate the account in dynamics.
    return completeLogin({ claims, idToken, context, user });
}

function completeLogin({
                           claims,
                           idToken,
                           context,
                           user,
                           dynamicsUser = null,
                           accessMap = null,
                           isValidAdmin = null
                       }) {
    const uuid = loginLib.getUserUuid(claims);
    dynamicsUser = dynamicsUser ?? getDynamicsUser(uuid);
    if (!dynamicsUser) {
        throw 'Not a valid user';
    }

    accessMap = accessMap ?? createAccessMap(uuid, dynamicsUser.titles);
    isValidAdmin = isValidAdmin ?? accessMap.length > 0;

    const idProviderConfig = configLib.getIdProviderConfig();
    loginLib.login(claims, user);

    if (idProviderConfig.endSession && idProviderConfig.endSession.idTokenHintKey) {
        requestLib.storeIdToken(idToken.idToken);
    }

    // Ensure the user is not subscribed to groups it should not be subscribed to.
    const currentGroupKeys = authLib.getMemberships(user.key).map(({ key }) => key);

    const groupsAreSetCorrect = accessMap.reduce((memo, { internalID }) => {
        const key = `group:${portalLib.getIdProviderKey()}:${internalID}`;
        if (memo) {
            return currentGroupKeys.some((groupKey) => groupKey === key);
        }
        return memo;
    }, true);

    if (!groupsAreSetCorrect) {
        log.info('Groups were not set correct. Resetting.');
        const groups = currentGroupKeys.filter((groupKey) => /^group/i.test(groupKey));
        contextLib.runAsSu(() => {
            groups.forEach((groupKey) => {
                authLib.removeMembers(groupKey, [user.key]);
            });

            const addGroups = getDefaultGroups(isValidAdmin, accessMap);
            addGroups.forEach((groupKey) => {
                authLib.addMembers(groupKey, [user.key]);
            });
        })
    }

    // Todo: Store the original url the user tried to access when a normal user is logging in.
    // 1. If user does not have publishing rights, redirect to sites front page.
    // 2. If user has publishing rights, forward to "context.originalUrl"
    return {
        redirect: isValidAdmin ? context.originalUrl : '/'
    };
}

//
// function handleIncomingVerifiedUser({ params: { oidcId, dynamicsId } }) {
//     const userData = cache.get(oidcId, () => null); // fetch our temporary stored data from cache.
//     if (!userData) {
//         throw 'Session expired. User must start process from start';
//     }
//
//     const { claims, idToken } = userData;
//
//     // Use dynamicsId to fetch user and its groups/rights
//
// }

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
    const idToken = requestLib.getIdToken();

    authLib.logout();

    const finalRedirectUrl = (req.validTicket && req.params.redirect);

    let redirectUrl;
    const config = configLib.getIdProviderConfig();
    if (config.endSession) {
        redirectUrl = config.endSession.url;
        if ((config.endSession.idTokenHintKey && idToken) || (finalRedirectUrl && config.endSession.postLogoutRedirectUriKey) ||
            (config.endSession.additionalParameters && Object.keys(config.endSession.additionalParameters).length > 0)) {
            redirectUrl += '?';

            if (config.endSession.idTokenHintKey && idToken) {
                redirectUrl += config.endSession.idTokenHintKey + '=' + idToken;
            }

            if (finalRedirectUrl && config.endSession.postLogoutRedirectUriKey) {
                if (!redirectUrl.endsWith("?")) {
                    redirectUrl += '&';
                }
                redirectUrl += config.endSession.postLogoutRedirectUriKey + '=' + encodeURIComponent(finalRedirectUrl)
            }

            toArray(config.endSession.additionalParameters).forEach(additionalParameter => {
                if (additionalParameter.key != null && additionalParameter.value != null) {
                    if (!redirectUrl.endsWith("?")) {
                        redirectUrl += '&';
                    }
                    redirectUrl += additionalParameter.key + '=' + additionalParameter.value;
                }
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

