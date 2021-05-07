import { getDynamicsUser, getHasPublishForUnion } from './dynamics/get-dynamics-user';
import { getDefaultUserGroup } from './member-config';

const authLib = require('/lib/xp/auth');
const contextLib = require('/lib/context');
const configLib = require('/lib/config');
const commonLib = require('/lib/xp/common');
const portalLib = require('/lib/xp/portal');
const preconditions = require('/lib/preconditions');

// const regExp = /\$\{([^\}]+)\}/g;

/*
export function getUser({ userinfo }) {
    const principalKey = getPrincipalKey({ userinfo });
    return contextLib.runAsSu(() =>
        authLib.getPrincipal(principalKey));
}
*/

export function findUserBySub(uuid) {
    return contextLib.runAsSu(() => {
        const userKey = `user:${portalLib.getIdProviderKey()}:${uuid}`;
        return authLib.getPrincipal(userKey);
    });
}

export function getUserUuid({ userinfo }) {
    return commonLib.sanitize(preconditions.checkParameter(userinfo, 'sub'));
}

/*
function getPrincipalKey({ userinfo }) {
    const idProviderKey = portalLib.getIdProviderKey();
    return 'user:' + idProviderKey + ':' + getUserUuid({ userinfo });
}
*/

/***
 * Method to create new users that are validated.
 * Admin users will be mapped to their corresponding group and get added to those.
 * Normal member users will be mapped to a hardocded member group.
 * @param claims
 * @param uuid
 * @returns {{isValidAdmin: boolean, defaultGroups: *[], dynamicsUser: *, user: *}}
 */
export function createUser(claims, uuid) {
    const { userinfo } = claims;
    const dynamicsUser = getDynamicsUser(uuid);

    if (!dynamicsUser) {
        throw 'Not a user';
    }

    const {
        titles,
        member
    } = dynamicsUser;

    const accessMap = createAccessMap(uuid, titles);
    const isValidAdmin = accessMap.length > 0;

    //Creates the users
    const idProviderConfig = configLib.getIdProviderConfig();
    if (idProviderConfig.rules && idProviderConfig.rules.forceEmailVerification) {
        preconditions.check(userinfo.email_verified === true, 'Email must be verified');
    }

    /*
    const email = idProviderConfig.mappings.email.replace(regExp, (match, claimKey) => getClaim(claims, claimKey)) || null;
    const displayName = idProviderConfig.mappings.displayName.replace(regExp, (match, claimKey) => getClaim(claims, claimKey)) ||
        userinfo.preferred_username || userinfo.name || email || userinfo.sub;
    */

    const userName = getUserUuid({ userinfo });
    const {
        firstname,
        lastname,
        emailAddress
    } = member;

    const user = contextLib.runAsSu(() => authLib.createUser({
        idProvider: portalLib.getIdProviderKey(),
        name: userName,
        displayName: firstname + ' ' + lastname,
        email: emailAddress
    }));
    log.info('User [' + user.key + '] created');

    const defaultGroups = getDefaultGroups(isValidAdmin, accessMap);
    log.info('User groups to be created');
    log.info(JSON.stringify(defaultGroups, null, 4));

    contextLib.runAsSu(() => {
        defaultGroups.forEach((defaultGroup) => {
            authLib.addMembers(defaultGroup, [user.key]);
            log.debug('User [' + user.key + '] added to group [' + defaultGroup + ']');
        });
    });

    return {
        user,
        isValidAdmin,
        accessMap,
        dynamicsUser
    };
}

/***
 * Returns the groups this specific user should belong to.
 * @param isValidAdmin - has the user publishing rights in any of the orgs?
 * @param accessMap - Map over orgID and publishing rights.
 * @returns {*[]}
 */
export function getDefaultGroups(isValidAdmin, accessMap) {
    const { defaultGroups } = configLib.getIdProviderConfig();
    let groups = isValidAdmin ? [].concat(defaultGroups) : [getDefaultUserGroup()];
    if (!isValidAdmin) {
        return groups;
    }
    return groups.concat(findUserGroups(accessMap));
}

/**
 * Fetches publishing access for each element in the titles array received from dynamics
 * @param uuid
 * @param titles - list of organizations the user is related to
 * @returns {{internalID: *, hasPublish: boolean}[]}
 */
export function createAccessMap(uuid, titles = []) {
    return titles
        .map(({ union: { number = null, internalID } }) => {
            const hasPublish = getHasPublishForUnion(uuid, number);
            return {
                internalID,
                hasPublish
            };
        })
        .filter(({ hasPublish }) => hasPublish);
}

/***
 * Map dynamics internalID of orgs to groupdIds present in our system
 * @param memberShips
 * @returns {*[]}
 */
function findUserGroups(memberShips) {
    const providerKey = portalLib.getIdProviderKey();
    return []
        .concat(memberShips)
        .map(({ internalID }) => {
            const group = authLib.getPrincipal(`group:${providerKey}:${internalID}`);
            if (!group) {
                return null;
            }
            const { key } = group;
            return key;
        })
        .filter((group) => !!group);
}

export function login(claims, user) {
    const userinfoClaims = claims.userinfo;
    log.info('User info received:');
    log.info(JSON.stringify(userinfoClaims, null, 4));

    //  Updates the profile
    const profile = contextLib.runAsSu(() => authLib.modifyProfile({
        key: user.key,// getPrincipalKey(claims),
        scope: 'oidc',
        editor: () => claims
    }));
    log.info('Modified profile of [' + user.key + ']: ' + JSON.stringify(profile));

    // Logs in the user
    const loginResult = authLib.login({
        user: user.login,
        idProvider: portalLib.getIdProviderKey(),
        skipAuth: true
    });

    log.info('Login result');
    log.info(JSON.stringify(loginResult, null, 4));

    if (loginResult.authenticated) {
        log.debug('Logged in user [' + user.key + ']');
    } else {
        throw 'Error while logging user [' + user.key + ']';
    }
}

// function toArray(object) {
//     if (!object) {
//         return [];
//     }
//     if (object.constructor === Array) {
//         return object;
//     }
//     return [object];
// }
//
// function getClaim(claims, claimKey) {
//     const claimKeys = claimKey.split('.');
//
//     let currentClaimObject = claims;
//     let claim;
//     for (const claimKey of claimKeys) {
//         currentClaimObject = currentClaimObject[claimKey];
//         if (currentClaimObject == null) {
//             log.warning('Claim [' + claimKey + '] missing');
//             return '';
//         }
//         claim = currentClaimObject;
//     }
//     return claim || '';
// }
