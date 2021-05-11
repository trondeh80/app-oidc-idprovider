"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.findUserBySub = findUserBySub;
exports.getUserUuid = getUserUuid;
exports.createUser = createUser;
exports.getDefaultGroups = getDefaultGroups;
exports.createAccessMap = createAccessMap;
exports.login = login;

var _getDynamicsUser = require("./dynamics/get-dynamics-user");

var _memberConfig = require("./member-config");

var authLib = require('/lib/xp/auth');

var contextLib = require('/lib/context');

var configLib = require('/lib/config');

var commonLib = require('/lib/xp/common');

var portalLib = require('/lib/xp/portal');

var preconditions = require('/lib/preconditions');

function findUserBySub(uuid) {
  return contextLib.runAsSu(function () {
    var userKey = "user:".concat(portalLib.getIdProviderKey(), ":").concat(uuid);
    return authLib.getPrincipal(userKey);
  });
}

function getUserUuid(_ref) {
  var userinfo = _ref.userinfo;
  return commonLib.sanitize(preconditions.checkParameter(userinfo, 'sub'));
}
/***
 * Method to create new users that are validated.
 * Admin users will be mapped to their corresponding group and get added to those.
 * Normal member users will be mapped to a hardocded member group.
 * @param claims
 * @param uuid
 * @returns {{isValidAdmin: boolean, defaultGroups: *[], dynamicsUser: *, user: *}}
 */


function createUser(claims, uuid) {
  var userinfo = claims.userinfo;
  var dynamicsUser = (0, _getDynamicsUser.getDynamicsUser)(uuid);

  if (!dynamicsUser) {
    throw 'Not a user';
  }

  var titles = dynamicsUser.titles,
      member = dynamicsUser.member;
  var accessMap = createAccessMap(uuid, titles);
  var isValidAdmin = accessMap.length > 0; //Creates the users

  var idProviderConfig = configLib.getIdProviderConfig();

  if (idProviderConfig.rules && idProviderConfig.rules.forceEmailVerification) {
    preconditions.check(userinfo.email_verified === true, 'Email must be verified');
  }
  /*
  const email = idProviderConfig.mappings.email.replace(regExp, (match, claimKey) => getClaim(claims, claimKey)) || null;
  const displayName = idProviderConfig.mappings.displayName.replace(regExp, (match, claimKey) => getClaim(claims, claimKey)) ||
      userinfo.preferred_username || userinfo.name || email || userinfo.sub;
  */


  var userName = getUserUuid({
    userinfo: userinfo
  });
  var firstname = member.firstname,
      lastname = member.lastname,
      emailAddress = member.emailAddress;
  var user = contextLib.runAsSu(function () {
    return authLib.createUser({
      idProvider: portalLib.getIdProviderKey(),
      name: userName,
      displayName: firstname + ' ' + lastname,
      email: emailAddress
    });
  });
  log.info('User [' + user.key + '] created');
  var defaultGroups = getDefaultGroups(isValidAdmin, accessMap);
  contextLib.runAsSu(function () {
    defaultGroups.forEach(function (defaultGroup) {
      log.info('Adding User [' + user.key + '] to group [' + defaultGroup + ']');
      authLib.addMembers(defaultGroup, [user.key]);
    });
  });
  return {
    user: user,
    isValidAdmin: isValidAdmin,
    accessMap: accessMap,
    dynamicsUser: dynamicsUser
  };
}
/***
 * Returns the groups this specific user should belong to.
 * @param isValidAdmin - has the user publishing rights in any of the orgs?
 * @param accessMap - Map over orgID and publishing rights.
 * @returns {*[]}
 */


function getDefaultGroups(isValidAdmin, accessMap) {
  var _configLib$getIdProvi = configLib.getIdProviderConfig(),
      defaultGroups = _configLib$getIdProvi.defaultGroups;

  var groups = isValidAdmin ? [].concat(defaultGroups) : [(0, _memberConfig.getDefaultUserGroup)()];

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


function createAccessMap(uuid) {
  var titles = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
  return titles.map(function (_ref2) {
    var _ref2$union = _ref2.union,
        _ref2$union$number = _ref2$union.number,
        number = _ref2$union$number === void 0 ? null : _ref2$union$number,
        internalID = _ref2$union.internalID;
    var hasPublish = (0, _getDynamicsUser.getHasPublishForUnion)(uuid, number);
    return {
      internalID: internalID,
      hasPublish: hasPublish
    };
  }).filter(function (_ref3) {
    var hasPublish = _ref3.hasPublish;
    return hasPublish;
  });
}
/***
 * Map dynamics internalID of orgs to groupdIds present in our system
 * @param memberShips
 * @returns {*[]}
 */


function findUserGroups(memberShips) {
  var providerKey = portalLib.getIdProviderKey();
  return contextLib.runAsSu(function () {
    return [].concat(memberShips).map(function (_ref4) {
      var internalID = _ref4.internalID;
      var principalKey = "group:".concat(providerKey, ":").concat(internalID);
      var group = authLib.getPrincipal(principalKey);

      if (!group) {
        log.info('Principal with key ' + principalKey + ' not found');
        return null;
      }

      var key = group.key;
      return key;
    }).filter(function (group) {
      return !!group;
    });
  });
}

function login(claims, user) {
  //  Updates the profile
  contextLib.runAsSu(function () {
    return authLib.modifyProfile({
      key: user.key,
      scope: 'oidc',
      editor: function editor() {
        return claims;
      }
    });
  }); // Logs in the user

  var loginResult = authLib.login({
    user: user.login,
    idProvider: portalLib.getIdProviderKey(),
    skipAuth: true
  });

  if (loginResult.authenticated) {
    log.debug('Logged in user [' + user.key + ']');
  } else {
    throw 'Error while logging user [' + user.key + ']';
  }
}