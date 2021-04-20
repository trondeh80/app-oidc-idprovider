const authLib = require('/lib/xp/auth');
const contextLib = require('/lib/context');
const configLib = require('/lib/config');
const commonLib = require('/lib/xp/common');
const portalLib = require('/lib/xp/portal');
const preconditions = require('/lib/preconditions');

const regExp = /\$\{([^\}]+)\}/g;

export function getUser({ userinfo }) {
    const principalKey = getPrincipalKey({ userinfo });
    return contextLib.runAsSu(() =>
        authLib.getPrincipal(principalKey));
}

export function getOidcUserId({ userinfo }) {
    return userinfo?.sub ?? null;
}

function getUserName({ userinfo }) {
    return commonLib.sanitize(preconditions.checkParameter(userinfo, 'sub'));
}

function getPrincipalKey({ userinfo }) {
    const idProviderKey = portalLib.getIdProviderKey();
    return 'user:' + idProviderKey + ':' + getUserName({ userinfo });
}

export function createUser(claims, dynamicsId) {
    const { userinfo } = claims;
    // const oidcUserId = getOidcUserId(claims);

    //Creates the users
    const idProviderConfig = configLib.getIdProviderConfig();
    if (idProviderConfig.rules && idProviderConfig.rules.forceEmailVerification) {
        preconditions.check(userinfo.email_verified === true, 'Email must be verified');
    }

    const email = idProviderConfig.mappings.email.replace(regExp, (match, claimKey) => getClaim(claims, claimKey)) || null;
    const displayName = idProviderConfig.mappings.displayName.replace(regExp, (match, claimKey) => getClaim(claims, claimKey)) ||
        userinfo.preferred_username || userinfo.name || email || userinfo.sub;

    const userName = getUserName({ userInfo });

    const user = contextLib.runAsSu(() => authLib.createUser({
        idProvider: portalLib.getIdProviderKey(),
        name: userName,
        displayName: displayName,
        email: email
    }));
    log.info('User [' + user.key + '] created');

    // Todo: Save dynamicsId => userId in separate repository

    const defaultGroups = idProviderConfig.defaultGroups;
    contextLib.runAsSu(() => {
        toArray(defaultGroups).forEach(function (defaultGroup) {
            authLib.addMembers(defaultGroup, [user.key]);
            log.debug('User [' + user.key + '] added to group [' + defaultGroup + ']');
        });
    });

    return user;
}

export function login(claims) {
    // const user = getUser(claims);
    const principalKey = getPrincipalKey(claims);
    const userinfoClaims = claims.userinfo;

    log.info('User info received:');
    log.info(JSON.stringify(userinfoClaims, null, 4));

    // If the user does not exist
    // if (!user) {
    //     createUser(claims)
    // }

    // Todo: Verify that the user belongs to the publishing groups in dynamics. If not, deny login.


    //  Updates the profile
    const profile = contextLib.runAsSu(() => authLib.modifyProfile({
        key: principalKey,
        scope: 'oidc',
        editor: () => claims
    }));
    log.debug('Modified profile of [' + principalKey + ']: ' + JSON.stringify(profile));

    // Logs in the user
    const loginResult = authLib.login({
        user: getUserName(claims),
        idProvider: portalLib.getIdProviderKey(),
        skipAuth: true
    });

    if (loginResult.authenticated) {
        log.debug('Logged in user [' + principalKey + ']');
    } else {
        throw 'Error while logging user [' + principalKey + ']';
    }
}

function toArray(object) {
    if (!object) {
        return [];
    }
    if (object.constructor === Array) {
        return object;
    }
    return [object];
}

function getClaim(claims, claimKey) {
    const claimKeys = claimKey.split('.');

    let currentClaimObject = claims;
    let claim;
    for (const claimKey of claimKeys) {
        currentClaimObject = currentClaimObject[claimKey];
        if (currentClaimObject == null) {
            log.warning('Claim [' + claimKey + '] missing');
            return '';
        }
        claim = currentClaimObject;
    }
    return claim || '';
}
