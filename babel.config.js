module.exports = function (api) {
  api.cache(true);
  return {
    // Tell Expo to parse NativeWind JSX correctly
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
