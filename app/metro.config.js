const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Limit worker threads to prevent V8 heap exhaustion and DataCloneError in Node 22
config.maxWorkers = 2;

module.exports = config;
