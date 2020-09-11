"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getUserInformation = getUserInformation;

var _httpClient = require("/lib/http-client");

var _textEncoding = require("/lib/text-encoding");

var _momentWithLocalesMin = _interopRequireDefault(require("/assets/momentjs/2.12.0/min/moment-with-locales.min.js"));

var _config = require("./config");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var AID_ENPOINT = 'https://www.aid.no/api/vespasian/v1/';

function getUserInformation(_ref) {
  var accessToken = _ref.accessToken;
  var url = createUrl();
  var userData = runRequest(createRequest({
    url: url,
    request: {
      method: 'GET',
      headers: {
        Authorization: "Bearer ".concat(accessToken)
      }
    }
  }));
}
/***
 * Method to sign a request by AID standards.
 * @param url - endpoint in AID for request
 * @param fields - Data in the POST body
 * @param params - GET parameters
 *
 * returns a hashed signature string to be included in request to aid
 */


function createSignature(_ref2) {
  var url = _ref2.url,
      _ref2$fields = _ref2.fields,
      fields = _ref2$fields === void 0 ? {} : _ref2$fields,
      _ref2$params = _ref2.params,
      params = _ref2$params === void 0 ? {} : _ref2$params;
  var time = (0, _momentWithLocalesMin["default"])().format(); // Uses default format: YYYY-MM-DDTHH:mm:ssZ (ISO-8601

  var token = url;

  var requestParams = _objectSpread(_objectSpread(_objectSpread({}, params), fields), {}, {
    timestamp: time
  });

  Object.keys(requestParams).sort().forEach(function (key) {
    token += "|".concat(key, "=").concat(requestParams[key]);
  });

  var _getIdProviderConfig = (0, _config.getIdProviderConfig)(),
      clientSecret = _getIdProviderConfig.clientSecret;

  return (0, _textEncoding.hmacSha256AsHex)(clientSecret, token);
}

function createUrl(endpoint) {
  return "".concat(AID_ENPOINT).concat(endpoint);
}

function createRequest(_ref3) {
  var url = _ref3.url,
      request = _ref3.request;
  return _objectSpread({
    url: url,
    method: 'GET'
  }, request);
}

function runRequest(httpRequest) {
  return (0, _httpClient.request)(httpRequest);
}