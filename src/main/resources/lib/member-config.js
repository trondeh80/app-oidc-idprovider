"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getDefaultUserGroup = getDefaultUserGroup;

var _portal = require("/lib/xp/portal");

/**
 * Returns the group name for normal members without write access to admin
 * @returns {string}
 */
function getDefaultUserGroup() {
  return "group:".concat((0, _portal.getIdProviderKey)(), ":member");
}