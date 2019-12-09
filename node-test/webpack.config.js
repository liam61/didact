const webpack = require('webpack');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

function resolve(...filePath) {
  return path.join(__dirname, ...filePath);
}

module.exports = {
  entry: resolve('./index.jsx'),
  output: {
    filename: '[name].js',
    path: resolve('./dist'),
  },
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        loader: 'babel-loader?cacheDirectory',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: resolve('./index.html'),
      filename: 'index.html',
    }),
  ],
  devServer: {
    contentBase: resolve('./dist'),
    disableHostCheck: true,
    historyApiFallback: true, // 不跳转
    inline: true,
    open: true,
    hot: true,
  },
};
