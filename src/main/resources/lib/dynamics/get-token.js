"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getToken = getToken;

var _httpClient = require("/lib/http-client");

var _config = require("../login-util/config");

/**
 *  Returns a dynamics access token to be used in communication with the new dynamics API:
 *  https://servicetestv2.njff.no/swagger/ui/index#!
 *  If token was generated less than 5 minutes ago. Reuse it, else create new and update object.
 *  @returns a string containing the access token, or undefined if request fails.
 */
var token = {
  accessToken: null,
  time: 0 // time in milliseconds

};

function getToken() {
  if (token.accessToken && new Date().getTime() - 1000 * 60 * 5 < token.time) {
    log.info('Reusing token');
    return token.accessToken;
  }

  log.info('Creating new token');

  var _request = (0, _httpClient.request)(createAzureTokenRequest()),
      body = _request.body;

  var _JSON$parse = JSON.parse(body !== null && body !== void 0 ? body : '{}'),
      access_token = _JSON$parse.access_token;

  token.accessToken = access_token;
  token.time = new Date().getTime();
  return access_token;
}

function createAzureTokenRequest() {
  var url = (0, _config.getConfigValue)('dynamics.token.url');
  var secret = (0, _config.getConfigValue)('dynamics.token.secret');
  var clientId = (0, _config.getConfigValue)('dynamics.token.client.id');
  var resource = (0, _config.getConfigValue)('dynamics.token.resource');
  var data = {
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: secret,
    resource: resource
  };
  var body = Object.keys(data).map(function (key) {
    return "".concat(key, "=").concat(encodeURIComponent(data[key]));
  }).join('&');
  return {
    url: url,
    body: body,
    method: 'POST',
    headers: {
      'Content-type': 'application/x-www-form-urlencoded'
    }
  };
}