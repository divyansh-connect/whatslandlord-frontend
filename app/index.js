import React from 'react';
import { AppRegistry, LogBox } from 'react-native';
import { registerRootComponent } from 'expo';
import App from './src/App';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// Prevent LogBox lag and stack trace generation from HMR polling
LogBox.ignoreLogs([
  'Cannot connect to Expo CLI',
  'Setting a timer for a long period',
  'AsyncStorage has been extracted',
]);

if (typeof __DEV__ !== 'undefined' && __DEV__) {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Cannot connect to Expo CLI') || args[0].includes('expo/src/async-require/hmr'))
    ) {
      return; // Drop warning without creating expensive stack trace
    }
    originalWarn(...args);
  };
}

const RootApp = () => (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

registerRootComponent(RootApp);

