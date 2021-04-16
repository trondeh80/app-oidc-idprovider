"use strict";

var _cache = _interopRequireDefault(require("../lib/login-util/cache"));

var _getToken = require("../lib/dynamics/get-token");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var configLib = require('/lib/config');

var oidcLib = require('/lib/oidc');

var loginLib = require('/lib/login');

var requestLib = require('/lib/request');

var preconditions = require('/lib/preconditions');

var authLib = require('/lib/xp/auth');

var portalLib = require('/lib/xp/portal');

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
  return portalLib.idProviderUrl({
    idProviderKey: portalLib.getIdProviderKey(),
    type: 'absolute'
  });
} // GET function exported / entry point for user:


function handleAuthenticationResponse(req) {
  var params = getRequestParams(req);
  var context = requestLib.removeContext(params.state);

  if (!context || context.state !== params.state) {
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
  log.debug('All claims: ' + JSON.stringify(claims)); // If user gets here, we need to intercept the call and redirect user.
  // if (userExists(claims)) -- continue
  // else -- Save claims in cache for 10 minutes and redirect user to validationpage.
  // endif;

  if (!loginLib.getUser(claims)) {
    // no user found here. Lets validate :)
    _cache["default"].get(loginLib.getOidcUserId(claims), function () {
      return {
        claims: claims,
        idToken: idToken
      };
    });
  }

  loginLib.login(claims);

  if (idProviderConfig.endSession && idProviderConfig.endSession.idTokenHintKey) {
    requestLib.storeIdToken(idToken.idToken);
  }

  return {
    redirect: context.originalUrl
  };
}

function handleIncomingVerifiedUser(_ref) {
  var _ref$params = _ref.params,
      oidcId = _ref$params.oidcId,
      dynamicsId = _ref$params.dynamicsId;

  var userData = _cache["default"].get(oidcId, function () {
    return null;
  }); // fetch our temporary stored data from cache.


  if (!userData) {
    throw 'Session expired. User must start process from start';
  }

  var claims = userData.claims,
      idToken = userData.idToken; // Use dynamicsId to fetch user and its groups/rights
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

;
exports.handle401 = redirectToAuthorizationEndpoint;
exports.get = handleAuthenticationResponse;
exports.logout = logout;