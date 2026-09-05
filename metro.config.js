const { getDefaultConfig: getExpoDefaultConfig } = require('expo/metro-config');
const {
  getDefaultConfig: getRNDefaultConfig,
  mergeConfig,
} = require('@react-native/metro-config');

const expoConfig = getExpoDefaultConfig(__dirname);
const rnConfig = getRNDefaultConfig(__dirname);

module.exports = mergeConfig(rnConfig, expoConfig);