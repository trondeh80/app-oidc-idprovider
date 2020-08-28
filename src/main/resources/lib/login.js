"use strict";

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

function login(claims) {
  log.info('Login data');
  log.info(JSON.stringify(claims, null, 4));
  var userinfoClaims = claims.userinfo; //Retrieves the user

  var idProviderKey = portalLib.getIdProviderKey();
  var userName = commonLib.sanitize(preconditions.checkParameter(userinfoClaims, 'sub'));
  var principalKey = 'user:' + idProviderKey + ':' + userName;
  var user = contextLib.runAsSu(function () {
    return authLib.getPrincipal(principalKey);
  }); //If the user does not exist

  if (!user) {
    //Creates the users
    var idProviderConfig = configLib.getIdProviderConfig();

    if (idProviderConfig.rules && idProviderConfig.rules.forceEmailVerification) {
      preconditions.check(userinfoClaims.email_verified === true, 'Email must be verified');
    }

    var email = idProviderConfig.mappings.email.replace(regExp, function (match, claimKey) {
      return getClaim(claims, claimKey);
    }) || null;
    var displayName = idProviderConfig.mappings.displayName.replace(regExp, function (match, claimKey) {
      return getClaim(claims, claimKey);
    }) || userinfoClaims.preferred_username || userinfoClaims.name || email || userinfoClaims.sub;

    var _user = contextLib.runAsSu(function () {
      return authLib.createUser({
        idProvider: idProviderKey,
        name: userName,
        displayName: displayName,
        email: email
      });
    });

    log.info('User [' + _user.key + '] created');
    var defaultGroups = idProviderConfig.defaultGroups;
    contextLib.runAsSu(function () {
      toArray(defaultGroups).forEach(function (defaultGroup) {
        authLib.addMembers(defaultGroup, [_user.key]);
        log.debug('User [' + _user.key + '] added to group [' + defaultGroup + ']');
      });
    });
  } //Updates the profile


  var profile = contextLib.runAsSu(function () {
    return authLib.modifyProfile({
      key: principalKey,
      scope: 'oidc',
      editor: function editor() {
        return claims;
      }
    });
  });
  log.debug('Modified profile of [' + principalKey + ']: ' + JSON.stringify(profile)); //Logs in the user

  var loginResult = authLib.login({
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

exports.login = login;