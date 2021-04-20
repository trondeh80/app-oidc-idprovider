"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getUser = getUser;
exports.getOidcUserId = getOidcUserId;
exports.createUser = createUser;
exports.login = login;

function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var authLib = require('/lib/xp/auth');

var contextLib = require('/lib/context');

var configLib = require('/lib/config');

var commonLib = require('/lib/xp/common');

var portalLib = require('/lib/xp/portal');

var preconditions = require('/lib/preconditions');

var regExp = /\$\{([^\}]+)\}/g;

function getUser(_ref) {
  var userinfo = _ref.userinfo;
  var principalKey = getPrincipalKey({
    userinfo: userinfo
  });
  return contextLib.runAsSu(function () {
    return authLib.getPrincipal(principalKey);
  });
}

function getOidcUserId(_ref2) {
  var _userinfo$sub;

  var userinfo = _ref2.userinfo;
  return (_userinfo$sub = userinfo === null || userinfo === void 0 ? void 0 : userinfo.sub) !== null && _userinfo$sub !== void 0 ? _userinfo$sub : null;
}

function getUserName(_ref3) {
  var userinfo = _ref3.userinfo;
  return commonLib.sanitize(preconditions.checkParameter(userinfo, 'sub'));
}

function getPrincipalKey(_ref4) {
  var userinfo = _ref4.userinfo;
  var idProviderKey = portalLib.getIdProviderKey();
  return 'user:' + idProviderKey + ':' + getUserName({
    userinfo: userinfo
  });
}

function createUser(claims, dynamicsId) {
  var userinfo = claims.userinfo; // const oidcUserId = getOidcUserId(claims);
  //Creates the users

  var idProviderConfig = configLib.getIdProviderConfig();

  if (idProviderConfig.rules && idProviderConfig.rules.forceEmailVerification) {
    preconditions.check(userinfo.email_verified === true, 'Email must be verified');
  }

  var email = idProviderConfig.mappings.email.replace(regExp, function (match, claimKey) {
    return getClaim(claims, claimKey);
  }) || null;
  var displayName = idProviderConfig.mappings.displayName.replace(regExp, function (match, claimKey) {
    return getClaim(claims, claimKey);
  }) || userinfo.preferred_username || userinfo.name || email || userinfo.sub;
  var userName = getUserName({
    userInfo: userInfo
  });
  var user = contextLib.runAsSu(function () {
    return authLib.createUser({
      idProvider: portalLib.getIdProviderKey(),
      name: userName,
      displayName: displayName,
      email: email
    });
  });
  log.info('User [' + user.key + '] created'); // Todo: Save dynamicsId => userId in separate repository

  var defaultGroups = idProviderConfig.defaultGroups;
  contextLib.runAsSu(function () {
    toArray(defaultGroups).forEach(function (defaultGroup) {
      authLib.addMembers(defaultGroup, [user.key]);
      log.debug('User [' + user.key + '] added to group [' + defaultGroup + ']');
    });
  });
  return user;
}

function login(claims) {
  // const user = getUser(claims);
  var principalKey = getPrincipalKey(claims);
  var userinfoClaims = claims.userinfo;
  log.info('User info received:');
  log.info(JSON.stringify(userinfoClaims, null, 4)); // If the user does not exist
  // if (!user) {
  //     createUser(claims)
  // }
  // Todo: Verify that the user belongs to the publishing groups in dynamics. If not, deny login.
  //  Updates the profile

  var profile = contextLib.runAsSu(function () {
    return authLib.modifyProfile({
      key: principalKey,
      scope: 'oidc',
      editor: function editor() {
        return claims;
      }
    });
  });
  log.debug('Modified profile of [' + principalKey + ']: ' + JSON.stringify(profile)); // Logs in the user

  var loginResult = authLib.login({
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
  var claimKeys = claimKey.split('.');
  var currentClaimObject = claims;
  var claim;

  var _iterator = _createForOfIteratorHelper(claimKeys),
      _step;

  try {
    for (_iterator.s(); !(_step = _iterator.n()).done;) {
      var _claimKey = _step.value;
      currentClaimObject = currentClaimObject[_claimKey];

      if (currentClaimObject == null) {
        log.warning('Claim [' + _claimKey + '] missing');
        return '';
      }

      claim = currentClaimObject;
    }
  } catch (err) {
    _iterator.e(err);
  } finally {
    _iterator.f();
  }

  return claim || '';
}