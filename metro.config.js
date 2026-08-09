// Learn more: https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

/**
 * Zustand 5 ships ESM middleware that uses `import.meta.env`.
 * Expo web loads the bundle as a classic <script>, so any leftover
 * `import.meta` throws: "Cannot use 'import.meta' outside a module"
 * → blank web + Expo Go "Something went wrong".
 * Force the CJS build (uses process.env.NODE_ENV instead).
 */
const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'zustand' || moduleName.startsWith('zustand/')) {
    return context.resolveRequest(
      {
        ...context,
        unstable_conditionNames: ['react-native', 'require', 'default'],
      },
      moduleName,
      platform
    );
  }
  if (upstreamResolveRequest) {
    return upstreamResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
