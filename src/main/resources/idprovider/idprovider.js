"use strict";

var _cache = _interopRequireDefault(require("../lib/login-util/cache"));

var _login = require("../lib/login");

var _getDynamicsUser = require("../lib/dynamics/get-dynamics-user");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var configLib = require('/lib/config');

var contextLib = require('/lib/context');

var oidcLib = require('/lib/oidc');

var loginLib = require('/lib/login');

var requestLib = require('/lib/request');

var preconditions = require('/lib/preconditions');

var authLib = require('/lib/xp/auth');

var portalLib = require('/lib/xp/portal');

var ACTIONS = {
  AFTER_VERIFY: '1'
};

function redirectToAuthorizationEndpoint() {
  log.debug('Handling 401 error...');
  var idProviderConfig = configLib.getIdProviderConfig();
  var redirectUri = generateRedirectUri();
  var state = oidcLib.generateToken();
  var nonce = oidcLib.generateToken();
  var originalUrl = requestLib.getRequestUrl();
  var context = {
    state: state,
    nonce: nonce,
    originalUrl: originalUrl,
    redirectUri: redirectUri
  };
  log.debug('Storing context: ' + JSON.stringify(context));
  requestLib.storeContext(context);
  var authorizationUrl = oidcLib.generateAuthorizationUrl({
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

function generateRedirectUri() {
  var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return portalLib.idProviderUrl({
    idProviderKey: portalLib.getIdProviderKey(),
    type: 'absolute',
    params: params
  });
}
/**
 * Called when a user returns successfully from validation
 * @param params
 */


function userVerified(_ref) {
  var params = _ref.params;
  log.info('User verified request received');
  log.info(JSON.stringify(params, null, 4));
  var uuid = params.uuid; // Todo: Find out how the dynamics ID is returned!!

  var userData = _cache["default"].get(uuid, function () {
    return null;
  });

  if (!userData) {
    throw 'Session expired. Please try again';
  }

  var claims = userData.claims,
      idToken = userData.idToken,
      context = userData.context;

  var _createUser = (0, _login.createUser)(claims, uuid),
      user = _createUser.user,
      dynamicsUser = _createUser.dynamicsUser,
      accessMap = _createUser.accessMap,
      isValidAdmin = _createUser.isValidAdmin;

  completeLogin({
    claims: claims,
    idToken: idToken,
    context: context,
    user: user,
    dynamicsUser: dynamicsUser,
    accessMap: accessMap,
    isValidAdmin: isValidAdmin
  });
} // GET function exported / entry point for user:


function handleAuthenticationResponse(req) {
  var action = req.params.action;

  if (action === ACTIONS.AFTER_VERIFY) {
    return userVerified(req);
  }

  var params = getRequestParams(req);
  var context = requestLib.removeContext(params.state);

  if (!context) {
    throw 'no context';
  }

  if (context.state !== params.state) {
    throw 'Invalid state parameter: ' + params.state;
  }

  if (params.error) {
    throw 'Authentication error [' + params.error + ']' + (params.error_description ? ': ' + params.error_description : '');
  }

  var idProviderConfig = configLib.getIdProviderConfig();
  var code = params.code; //https://tools.ietf.org/html/rfc6749#section-2.3.1

  var idToken = oidcLib.requestIDToken({
    issuer: idProviderConfig.issuer,
    tokenUrl: idProviderConfig.tokenUrl,
    clientId: idProviderConfig.clientId,
    clientSecret: idProviderConfig.clientSecret,
    redirectUri: context.redirectUri,
    nonce: context.nonce,
    code: code
  });
  var claims = {
    userinfo: idToken.claims
  };

  if (idProviderConfig.userinfoUrl) {
    var userinfoClaims = oidcLib.requestOAuth2({
      url: idProviderConfig.userinfoUrl,
      accessToken: idToken.accessToken
    });
    log.debug('User info claims: ' + JSON.stringify(userinfoClaims));

    if (idToken.claims.sub !== userinfoClaims.sub) {
      throw 'Invalid sub in user info : ' + userinfoClaims.sub;
    }

    claims.userinfo = oidcLib.mergeClaims(claims.userinfo, userinfoClaims);
  }

  toArray(idProviderConfig.additionalEndpoints).forEach(function (additionalEndpoint) {
    var additionalClaims = oidcLib.requestOAuth2({
      url: additionalEndpoint.url,
      accessToken: idToken.accessToken
    });
    log.debug('OAuth2 endpoint [' + additionalEndpoint.name + '] claims: ' + JSON.stringify(additionalClaims));
    claims[additionalEndpoint.name] = oidcLib.mergeClaims(claims[additionalEndpoint.name] || {}, additionalClaims);
  });
  log.debug('All claims: ' + JSON.stringify(claims));
  var uuid = loginLib.getUserUuid(claims);
  var user = loginLib.findUserBySub(uuid);

  if (!user) {
    // no user found in database. Validate before creating the user
    _cache["default"].get(uuid, function () {
      return {
        claims: claims,
        idToken: idToken,
        context: context
      };
    });

    var returnUrl = generateRedirectUri({
      uuid: uuid,
      action: ACTIONS.AFTER_VERIFY
    });
    return {
      redirect: "https://minside.njff.no/account/findrelation?id=".concat(uuid, "&redirect=").concat(encodeURIComponent(returnUrl))
    };
  } // User exists, we need to validate the account in dynamics.


  return completeLogin({
    claims: claims,
    idToken: idToken,
    context: context,
    user: user
  });
}

function completeLogin(_ref2) {
  var _dynamicsUser, _accessMap, _isValidAdmin;

  var claims = _ref2.claims,
      idToken = _ref2.idToken,
      context = _ref2.context,
      user = _ref2.user,
      _ref2$dynamicsUser = _ref2.dynamicsUser,
      dynamicsUser = _ref2$dynamicsUser === void 0 ? null : _ref2$dynamicsUser,
      _ref2$accessMap = _ref2.accessMap,
      accessMap = _ref2$accessMap === void 0 ? null : _ref2$accessMap,
      _ref2$isValidAdmin = _ref2.isValidAdmin,
      isValidAdmin = _ref2$isValidAdmin === void 0 ? null : _ref2$isValidAdmin;
  var uuid = loginLib.getUserUuid(claims);
  dynamicsUser = (_dynamicsUser = dynamicsUser) !== null && _dynamicsUser !== void 0 ? _dynamicsUser : (0, _getDynamicsUser.getDynamicsUser)(uuid);

  if (!dynamicsUser) {
    throw 'Not a valid user';
  }

  accessMap = (_accessMap = accessMap) !== null && _accessMap !== void 0 ? _accessMap : (0, _login.createAccessMap)(uuid, dynamicsUser.titles);
  isValidAdmin = (_isValidAdmin = isValidAdmin) !== null && _isValidAdmin !== void 0 ? _isValidAdmin : accessMap.length > 0;
  var idProviderConfig = configLib.getIdProviderConfig();
  loginLib.login(claims, user);

  if (idProviderConfig.endSession && idProviderConfig.endSession.idTokenHintKey) {
    requestLib.storeIdToken(idToken.idToken);
  } // Ensure the user is not subscribed to groups it should not be subscribed to.


  var currentGroupKeys = authLib.getMemberships(user.key).map(function (_ref3) {
    var key = _ref3.key;
    return key;
  });
  var groupsAreSetCorrect = accessMap.reduce(function (memo, _ref4) {
    var internalID = _ref4.internalID;
    var key = "group:".concat(portalLib.getIdProviderKey(), ":").concat(internalID);

    if (memo) {
      return currentGroupKeys.some(function (groupKey) {
        return groupKey === key;
      });
    }

    return memo;
  }, true);

  if (!groupsAreSetCorrect) {
    log.info('Groups were not set correct for openid: ' + uuid + '. Resetting.');
    var groups = currentGroupKeys.filter(function (groupKey) {
      return /^group/i.test(groupKey);
    });
    contextLib.runAsSu(function () {
      groups.forEach(function (groupKey) {
        authLib.removeMembers(groupKey, [user.key]);
      });
      var addGroups = (0, _login.getDefaultGroups)(isValidAdmin, accessMap);
      addGroups.forEach(function (groupKey) {
        authLib.addMembers(groupKey, [user.key]);
      });
    });
  } // Todo: Store the original url the user tried to access when a normal user is logging in.
  // 1. If user does not have publishing rights, redirect to sites front page.
  // 2. If user has publishing rights, forward to "context.originalUrl"


  return {
    redirect: isValidAdmin ? context.originalUrl : '/'
  };
}

function getRequestParams(req) {
  var params = req.params;
  log.debug('Checking response params: ' + JSON.stringify(params));
  preconditions.checkParameter(params, 'state');

  if (!params.error) {
    preconditions.checkParameter(params, 'code');
  }

  return params;
}

function logout(req) {
  var idToken = requestLib.getIdToken();
  authLib.logout();
  var finalRedirectUrl = req.validTicket && req.params.redirect;
  var redirectUrl;
  var config = configLib.getIdProviderConfig();

  if (config.endSession) {
    redirectUrl = config.endSession.url;

    if (config.endSession.idTokenHintKey && idToken || finalRedirectUrl && config.endSession.postLogoutRedirectUriKey || config.endSession.additionalParameters && Object.keys(config.endSession.additionalParameters).length > 0) {
      redirectUrl += '?';

      if (config.endSession.idTokenHintKey && idToken) {
        redirectUrl += config.endSession.idTokenHintKey + '=' + idToken;
      }

      if (finalRedirectUrl && config.endSession.postLogoutRedirectUriKey) {
        if (!redirectUrl.endsWith("?")) {
          redirectUrl += '&';
        }

        redirectUrl += config.endSession.postLogoutRedirectUriKey + '=' + encodeURIComponent(finalRedirectUrl);
      }

      toArray(config.endSession.additionalParameters).forEach(function (additionalParameter) {
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
}

exports.handle401 = redirectToAuthorizationEndpoint;
exports.get = handleAuthenticationResponse;
exports.logout = logout;