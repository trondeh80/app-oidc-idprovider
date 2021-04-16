"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getToken = getToken;

var _httpClient = require("/lib/http-client");

var _config = require("../login-util/config");

function getToken() {
  var response = (0, _httpClient.request)(createAzureTokenRequest());
  var access_token = response.body.access_token;
  return access_token;
}

function createAzureTokenRequest() {
  var url = (0, _config.getConfigValue)('dynamics.token.url');
  var secret = (0, _config.getConfigValue)('dynamics.token.secret');
  var clientId = (0, _config.getConfigValue)('dynamics.token.client.id');
  var data = {
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: secret,
    resource: 'api://5dd16e09-f8ba-419d-952e-b2bb37e073c0'
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