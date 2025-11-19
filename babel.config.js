module.exports = function (api) {
    api.cache(true);
    return {
        presets: [
            ["babel-preset-expo", { jsxImportSource: "nativewind" }],
            "nativewind/babel",
        ],
        plugins: [
            [
                "module:react-native-dotenv",
                {
                    moduleName: "@env",
                    path: ".env",
                    blocklist: null,
                    allowlist: null,
                    blacklist: null, // DEPRECATED
                    whitelist: null, // DEPRECATED
                    safe: false,
                    allowUndefined: true,
                    verbose: false,
                },
            ],
            "react-native-reanimated/plugin", // Add this - MUST be last
        ],
    };
};