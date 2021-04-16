"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = getConfiguration;
exports.getConfigValue = getConfigValue;
var xpHome = Java.type('java.lang.System').getenv('XP_HOME');
var Properties = Java.type('java.util.Properties');
var FileInputStream = Java.type('java.io.FileInputStream');
var fileName = 'no.bouvet.dynamics.properties';
var config = null;

function getConfiguration() {
  if (config === null) {
    var fis = new FileInputStream("".concat(xpHome, "/config/").concat(fileName));
    var prop = new Properties();
    prop.load(fis);
    fis.close();
    config = prop;
  }

  return config;
}

function getConfigValue(key) {
  return getConfiguration()[key];
}