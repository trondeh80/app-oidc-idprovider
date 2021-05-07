"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _cache = require("/lib/cache");

var cache = (0, _cache.newCache)({
  size: 100,
  expire: 60 * 55 // 50 minutes (10 minutes less than dynamics token lifetime.)

});
var _default = cache;
exports["default"] = _default;