const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: './src/content.js',
  output: {
    filename: 'lingo-sdk.js',
    path: path.resolve(__dirname, 'dist'),
    globalObject: 'self'
  },
  mode: 'production',
  target: 'webworker',
  resolve: {
    fallback: {
      "fs": false,
      "path": false,
      "http": false,
      "https": false,
      "net": false,
      "tls": false,
      "url": false,
      "assert": false,
      "vm": false,
      "crypto": false,
      "stream": false,
      "zlib": false,
      "util": false,
      "os": false,
      "child_process": false,
      "canvas": false,
      "process": require.resolve('process/browser')
    }
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': JSON.stringify({}),
      'process.env.NODE_ENV': JSON.stringify('production')
    }),
    new webpack.ProvidePlugin({
      process: 'process/browser'
    })
  ]
};
