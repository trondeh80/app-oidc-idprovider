const authLib = require('/lib/xp/auth');
const contextLib = require('/lib/context');
const configLib = require('/lib/config');
const commonLib = require('/lib/xp/common');
const portalLib = require('/lib/xp/portal');
const preconditions = require('/lib/preconditions');

function login(claims) {

    //Retrieves the user
    const idProviderKey = portalLib.getIdProviderKey();
    const userName = commonLib.sanitize(preconditions.checkParameter(claims, 'sub'));
    const principalKey = 'user:' + idProviderKey + ':' + userName;
    const user = contextLib.runAsSu(() => authLib.getPrincipal(principalKey));

    //If the user does not exist
    if (!user) {

        //Creates the users
        const idProviderConfig = configLib.getIdProviderConfig();
        const email = idProviderConfig.scopes.email ? preconditions.checkParameter(claims, 'email') : null;
        if (idProviderConfig.rules && idProviderConfig.rules.forceEmailVerification) {
            preconditions.check(idProviderConfig.scopes.email === true, 'Cannot perform email verification without email scope');
            preconditions.check(claims.email_verified === true, 'Email must be verified');
        }
        const displayName = claims.preferred_username || claims.name || email || claims.sub;

        const user = contextLib.runAsSu(() => authLib.createUser({
            idProvider: idProviderKey,
            name: userName,
            displayName: displayName,
            email: email
        }));
        log.info('User [' + user.key + '] created');

        var defaultGroups = idProviderConfig.defaultGroups;
        contextLib.runAsSu(() => {
            toArray(defaultGroups).forEach(function (defaultGroup) {
                authLib.addMembers(defaultGroup, [user.key]);
                log.debug('User [' + user.key + '] added to group [' + defaultGroup + ']');
            });
        });
    }

    //Updates the profile
    const profile = contextLib.runAsSu(() => authLib.modifyProfile({
        key: principalKey,
        scope: 'com.enonic.app.oidcidprovider',
        editor: () => claims //TODO
    }));
    log.debug('Modified profile of [' + principalKey + ']: ' + JSON.stringify(profile));

    //Logs in the user
    const loginResult = authLib.login({
        user: userName,
        idProvider: idProviderKey,
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
};

exports.login = login;