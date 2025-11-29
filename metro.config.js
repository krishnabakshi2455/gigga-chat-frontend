const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Redirect worklets plugin requests to reanimated (since we're using Reanimated v3)
config.resolver = {
    ...config.resolver,
    resolveRequest: (context, moduleName, platform) => {
        if (moduleName === 'react-native-worklets/plugin') {
            return context.resolveRequest(
                context,
                'react-native-reanimated/plugin',
                platform
            );
        }
        // Default resolution for everything else
        return context.resolveRequest(context, moduleName, platform);
    },
};

module.exports = withNativeWind(config, { input: './global.css' });