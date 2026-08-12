const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Appwrite still imports the pre-SDK 54 FileSystem surface. Keep a single
  // native module in the build and route only Appwrite to Expo's legacy shim.
  if (
    moduleName === 'expo-file-system' &&
    context.originModulePath.includes('react-native-appwrite')
  ) {
    return context.resolveRequest(context, 'expo-file-system/legacy', platform);
  }

  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
