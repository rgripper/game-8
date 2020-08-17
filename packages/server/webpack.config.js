const path = require('path');
//const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.js', '.wasm']
  },
  devtool: 'inline-source-map',
  devServer: {
    open: true,
    contentBase: './build',
    historyApiFallback: true
  },
  plugins: [
    //new CleanWebpackPlugin(),
  ],
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'build')
  }
};
