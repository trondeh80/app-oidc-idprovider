"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getDynamicsUser = getDynamicsUser;
exports.getHasPublishForUnion = getHasPublishForUnion;

var _httpClient = require("/lib/http-client");

var _getToken = require("./get-token");

var _config = require("../login-util/config");

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var NO_MEMBER_RESPONSE = 'Medlem ikke funnet';

function getDynamicsUser(uuid) {
  var _JSON$parse;

  var url = createUrl("/accounts/".concat(uuid, "?fullMemberDetail=true&memberDetail=true&membership=true&validMembership=true&title=true")); // eslint-disable-line

  var dynamicsRequest = createDynamicsRequest(url);

  var _request = (0, _httpClient.request)(dynamicsRequest),
      body = _request.body,
      status = _request.status;

  if (status !== 200 || body === NO_MEMBER_RESPONSE) {
    // Adding the string comparison because of unstable API
    return null;
  }

  var _ref = (_JSON$parse = JSON.parse(body)) !== null && _JSON$parse !== void 0 ? _JSON$parse : {},
      _ref$response = _ref.response,
      response = _ref$response === void 0 ? null : _ref$response;

  return response;
}

function getHasPublishForUnion(uuid, number) {
  var _JSON$parse2;

  var url = createUrl("/accounts/".concat(uuid, "?union=").concat(number, "&validPublish=true")); // eslint-disable-line

  var dynamicsRequest = createDynamicsRequest(url);

  var _request2 = (0, _httpClient.request)(dynamicsRequest),
      body = _request2.body;

  var _ref2 = (_JSON$parse2 = JSON.parse(body)) !== null && _JSON$parse2 !== void 0 ? _JSON$parse2 : {},
      _ref2$response$hasPub = _ref2.response.hasPublish,
      hasPublish = _ref2$response$hasPub === void 0 ? false : _ref2$response$hasPub;

  return hasPublish;
}

function createDynamicsRequest(url) {
  var requestObject = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var accessToken = (0, _getToken.getToken)();
  return _objectSpread(_objectSpread({
    method: 'GET'
  }, requestObject), {}, {
    url: url,
    headers: {
      Authorization: "Bearer ".concat(accessToken)
    }
  });
}

function createUrl(endpoint) {
  var url = (0, _config.getConfigValue)('dynamics.v2.url');
  return "".concat(url).concat(endpoint);
}