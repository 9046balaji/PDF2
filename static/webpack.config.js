const path = require('path');

module.exports = {
  entry: {
    app: './app.js',
    enhancedPDFTools: './EnhancedPDFTools.js',
    enhancedSearchComponent: './EnhancedSearchComponent.js'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true, // Clean the output directory before emit
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx']
  },
  // For development, uncomment the following section:
  // devtool: 'source-map',
  externals: {
    'react': 'React',
    'react-dom': 'ReactDOM',
    'prop-types': 'PropTypes'
  }
};
