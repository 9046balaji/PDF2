const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const ImageMinimizerPlugin = require('image-minimizer-webpack-plugin');

module.exports = (env, argv) => ({
  entry: {
    app: './js/app.js',
    enhancedPDFTools: './js/EnhancedPDFTools.js',
    enhancedSearchComponent: './js/EnhancedSearchComponent.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    // Use app.bundle.js as specified in requirements
    filename: '[name].bundle.js',
    chunkFilename: '[name].[chunkhash].chunk.js',
    // Public path for assets
    publicPath: ''
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          // .babelrc file will be used for configuration
        }
      },
      {
        test: /\.css$/,
        use: [
          argv.mode === 'production'
            ? MiniCssExtractPlugin.loader
            : 'style-loader',
          'css-loader',
          'postcss-loader'
        ]
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|ico)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 10 * 1024, // 10kb - inline smaller images as data URIs
          },
        },
        generator: {
          filename: (pathData) => {
            // Special handling for large background image
            if (pathData.filename.includes('login-bg.png')) {
              return 'login/img/[name][ext]';
            }
            return 'images/[name][ext]';
          }
        }
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name][ext]'
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx', '.css'],
    alias: {
      '@': path.resolve(__dirname, 'js'),
    },
  },
  // Development settings
  ...(argv.mode === 'development' && {
    devtool: 'eval-source-map',
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist'),
      },
      hot: true,
      port: 3000,
      historyApiFallback: true,
      open: true,
    }
  }),
  // Production optimizations
  ...(argv.mode === 'production' && {
    devtool: 'source-map',
    optimization: {
      minimize: true,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            format: {
              comments: false,
            },
          },
          extractComments: false,
        }),
        new ImageMinimizerPlugin({
          minimizer: {
            implementation: ImageMinimizerPlugin.imageminMinify,
            options: {
              plugins: [
                ['gifsicle', { interlaced: true }],
                ['jpegtran', { progressive: true }],
                ['optipng', { optimizationLevel: 5 }],
                [
                  'svgo',
                  {
                    plugins: [
                      {
                        name: 'preset-default',
                        params: {
                          overrides: {
                            removeViewBox: false,
                            addAttributesToSVGElement: {
                              params: {
                                attributes: [
                                  { xmlns: 'http://www.w3.org/2000/svg' },
                                ],
                              },
                            },
                          },
                        },
                      },
                    ],
                  },
                ],
              ],
            },
          },
        }),
      ],
      splitChunks: {
        chunks: 'all',
        maxInitialRequests: Infinity,
        minSize: 20000,
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              // Get the name of the package
              const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
              // Create a clean name for common libs
              return `vendor.${packageName.replace('@', '')}`;
            },
            priority: 10
          },
          common: {
            name: 'common',
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true
          }
        }
      },
    }
  }),
  plugins: [
    new CleanWebpackPlugin(),
    // Main application HTML
    new HtmlWebpackPlugin({
      template: './html/index.html',
      filename: 'index.html',
      chunks: ['app', 'common'],
      inject: true,
      // Extra optimization for production
      ...(argv.mode === 'production' && {
        minify: {
          removeComments: true,
          collapseWhitespace: true,
          removeRedundantAttributes: true,
          useShortDoctype: true,
          removeEmptyAttributes: true,
          removeStyleLinkTypeAttributes: true,
          keepClosingSlash: true,
          minifyJS: true,
          minifyCSS: true,
          minifyURLs: true,
        }
      })
    }),
    // Login HTML files
    new HtmlWebpackPlugin({
      template: './login/index.html',
      filename: 'login/index.html',
      chunks: ['common'],
      minify: argv.mode === 'production',
    }),
    new HtmlWebpackPlugin({
      template: './login/register.html',
      filename: 'login/register.html',
      chunks: ['common'],
      minify: argv.mode === 'production',
    }),
    new HtmlWebpackPlugin({
      template: './login/reset.html',
      filename: 'login/reset.html',
      chunks: ['common'],
      minify: argv.mode === 'production',
    }),
    // Copy static assets
    new CopyWebpackPlugin({
      patterns: [
        { from: 'favicon.ico', to: '' },
        // We'll handle the login-bg.png separately with optimize-login-bg.js
      ],
    }),
    // Extract CSS into separate files in production
    ...(argv.mode === 'production' 
      ? [new MiniCssExtractPlugin({
          filename: 'css/[name].css',
        })]
      : []
    )
  ],
  externals: {
    'react': 'React',
    'react-dom': 'ReactDOM',
    'prop-types': 'PropTypes'
  },
  
  // Performance hints configuration
  performance: {
    hints: 'warning',
    // Increase maxAssetSize to 400KB to accommodate the login background image after optimization
    maxAssetSize: 400 * 1024,
    maxEntrypointSize: 500 * 1024,
    // Exclude large images from performance hints
    assetFilter: function(assetFilename) {
      return !assetFilename.endsWith('.png') && !assetFilename.endsWith('.jpg');
    },
  }
});
