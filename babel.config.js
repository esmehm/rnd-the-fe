// Babel is used only to run the React Compiler (React 19 auto-memoisation),
// plus react-refresh in dev. Rspack handles everything else.
const ReactCompilerConfig = { target: '19' };

module.exports = function (api) {
  const isDev = api.env('development');
  api.cache.using(() => process.env.NODE_ENV);
  return {
    presets: [
      ['@babel/preset-env', { targets: { chrome: '87' } }], // M10-era Chromium WebView
      ['@babel/preset-react', { runtime: 'automatic' }],
      ['@babel/preset-typescript', { isTSX: true, allExtensions: true }],
    ],
    plugins: [
      ['babel-plugin-react-compiler', ReactCompilerConfig],
      ...(isDev ? ['react-refresh/babel'] : []),
    ],
  };
};
