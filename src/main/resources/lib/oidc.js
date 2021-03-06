"use strict";

var preconditions = require('/lib/preconditions');

var httpClient = require('/lib/http-client');

function generateToken() {
  return Java.type('com.enonic.app.oidcidprovider.OIDCUtils').generateToken();
}

function parseClaims(jwt, issuer, clientId, nonce) {
  var parsedJwt = Java.type('com.enonic.app.oidcidprovider.OIDCUtils').parseClaims(jwt, issuer, clientId, nonce);
  return __.toNativeObject(parsedJwt);
}

function generateAuthorizationUrl(params) {
  var authorizationUrl = preconditions.checkParameter(params, 'authorizationUrl');
  var clientId = preconditions.checkParameter(params, 'clientId');
  var redirectUri = preconditions.checkParameter(params, 'redirectUri');
  var scope = preconditions.checkParameter(params, 'scopes');
  var state = preconditions.checkParameter(params, 'state');
  var nonce = preconditions.checkParameter(params, 'nonce'); //https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest

  return authorizationUrl + '?scope=' + encodeURIComponent(scope) + '&response_type=code' + '&client_id=' + encodeURIComponent(clientId) + '&redirect_uri=' + encodeURIComponent(redirectUri) + '&state=' + state + '&nonce=' + nonce;
}

function getAuthentication(clientId, clientSecret) {
  var authString = "".concat(clientId, ":").concat(clientSecret);
  return Java.type('com.enonic.app.oidcidprovider.OIDCUtils').base64EncodeString(authString);
}

function requestIDToken(params) {
  var issuer = preconditions.checkParameter(params, 'issuer');
  var tokenUrl = preconditions.checkParameter(params, 'tokenUrl');
  var clientId = preconditions.checkParameter(params, 'clientId');
  var clientSecret = preconditions.checkParameter(params, 'clientSecret');
  var redirectUri = preconditions.checkParameter(params, 'redirectUri');
  var nonce = preconditions.checkParameter(params, 'nonce');
  var code = preconditions.checkParameter(params, 'code'); //TODO Handle different authentication methods

  var isBasicAuth = true; // Todo add config option for switching auth method.
  //https://openid.net/specs/openid-connect-core-1_0.html#TokenRequest

  var body = 'grant_type=authorization_code' + '&code=' + code + '&redirect_uri=' + redirectUri;

  if (isBasicAuth === false) {
    body = body + '&client_id=' + clientId + '&client_secret=' + clientSecret;
  }

  var headers = isBasicAuth ? {
    Authorization: "Basic ".concat(getAuthentication(clientId, clientSecret))
  } : {};
  var request = {
    url: tokenUrl,
    method: 'POST',
    headers: headers,
    body: body,
    contentType: 'application/x-www-form-urlencoded'
  };
  var response = httpClient.request(request);

  if (response.status !== 200) {
    throw 'Error ' + response.status + ' while retrieving the ID Token';
  }

  var responseBody = JSON.parse(response.body);

  if (responseBody.error) {
    throw 'Token error [' + params.error + ']' + (params.error_description ? ': ' + params.error_description : '');
  }

  var claims = parseClaims(responseBody.id_token, issuer, clientId, nonce);
  log.debug('Parsed claims: ' + JSON.stringify(claims));
  return {
    idToken: responseBody.id_token,
    accessToken: responseBody.access_token,
    claims: claims
  };
}

function requestOAuth2(params) {
  var url = preconditions.checkParameter(params, 'url');
  var accessToken = preconditions.checkParameter(params, 'accessToken');
  var request = {
    url: url,
    headers: {
      'Authorization': 'Bearer ' + accessToken
    },
    contentType: 'application/json'
  };
  log.debug('Sending user info request: ' + JSON.stringify(request));
  var response = httpClient.request(request);
  log.debug('Received user info response: ' + JSON.stringify(response));
  return JSON.parse(response.body);
}

function mergeClaims(priorityClaims, additionalClaims) {
  var claims = {};
  Object.keys(additionalClaims).forEach(function (claimKey) {
    return claims[claimKey] = additionalClaims[claimKey];
  });
  Object.keys(priorityClaims).forEach(function (claimKey) {
    return claims[claimKey] = priorityClaims[claimKey];
  });
  return claims;
}

exports.generateToken = generateToken;
exports.generateAuthorizationUrl = generateAuthorizationUrl;
exports.requestIDToken = requestIDToken;
exports.requestOAuth2 = requestOAuth2;
exports.mergeClaims = mergeClaims;