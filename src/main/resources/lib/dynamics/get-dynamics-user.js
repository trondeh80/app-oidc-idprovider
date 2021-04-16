"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = getDynamicsUser;

var _httpClient = require("/lib/http-client");

var _getToken = require("./get-token");

var _config = require("../login-util/config");

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function getDynamicsUser(dynamicsId) {
  var url = createUrl("/api/accounts/".concat(dynamicsId, "?fullMemberDetail=true"));

  var _request = (0, _httpClient.request)(url),
      body = _request.body;

  return JSON.parse(body);
}

function createDynamicsRequest(url) {
  var requestObject = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var accessToken = (0, _getToken.getToken)();
  return _objectSpread(_objectSpread({
    method: 'GET'
  }, requestObject), {}, {
    headers: {
      Authorization: "Bearer ".concat(accessToken)
    }
  });
}

function createUrl(endpoint) {
  var url = (0, _config.getConfigValue)('dynamics.v2.url');
  return "".concat(url).concat(endpoint);
}