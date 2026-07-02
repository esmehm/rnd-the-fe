import * as path from 'node:path';
import { rspack } from '@rspack/core';
import type { Configuration } from '@rspack/core';
import ReactRefreshPlugin from '@rspack/plugin-react-refresh';
import { VanillaExtractPlugin } from '@vanilla-extract/webpack-plugin';

const isDev = process.env.NODE_ENV !== 'production';

const config: Configuration = {
  mode: isDev ? 'development' : 'production',
  entry: { main: './src/main.tsx' },
  context: __dirname,
  devtool: isDev ? 'eval-cheap-module-source-map' : 'source-map',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: isDev ? '[name].js' : '[name].[contenthash].js',
    publicPath: '/',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  // vanilla-extract emits real .css; let CssExtractRspackPlugin own the CSS pipeline
  // instead of rspack's native css handling so the two don't double-process it.
  experiments: { css: false },
  module: {
    rules: [
      {
        // babel-loader does TS strip + JSX (automatic runtime) + React Compiler
        // + react-refresh in one pass. Slower builds than swc, but build speed is
        // not the perf variable we're measuring (runtime on the M10 is).
        test: /\.[jt]sx?$/,
        exclude: [/node_modules/],
        use: {
          loader: 'babel-loader',
          options: { babelrc: false, configFile: path.resolve(__dirname, 'babel.config.js') },
        },
      },
      {
        test: /\.css$/,
        type: 'javascript/auto',
        use: [
          rspack.CssExtractRspackPlugin.loader,
          { loader: 'css-loader', options: { url: false } },
        ],
      },
      { test: /\.(png|svg|jpg|jpeg|gif)$/i, type: 'asset/resource' },
    ],
  },
  plugins: [
    new rspack.HtmlRspackPlugin({ template: './src/index.html' }),
    new VanillaExtractPlugin(),
    new rspack.CssExtractRspackPlugin({}),
    isDev && new ReactRefreshPlugin(),
  ].filter(Boolean),
  optimization: {
    splitChunks: { chunks: 'all' },
  },
  devServer: {
    port: 3100,
    historyApiFallback: true,
    hot: true,
    // No auth needed (backend runs with debug_no_access_control). Proxy /graphql
    // to the OMS backend so the app is same-origin and dodges CORS.
    proxy: [
      {
        context: ['/graphql'],
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    ],
  },
};

export default config;
