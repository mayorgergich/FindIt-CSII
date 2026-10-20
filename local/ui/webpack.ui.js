// Builds the local dock UI (local/ui/src) as the "FindItLocal" UI module.
// Reuses the author's toolchain (FindIt/UI/node_modules) and imports the author's
// components, domain types and icons that the redesign keeps (see "upstream/" imports).
// Run from FindIt/UI: npx webpack --config ../../local/ui/webpack.ui.js
const path = require("path");
const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserPlugin = require("terser-webpack-plugin");

const MOD = require("./mod.json");
const UPSTREAM_UI = path.resolve(__dirname, "../../FindIt/UI");
// The game loads <module>.css only when the .mjs exports hasCSS (game-ui/modding/utils/load-css);
// the author's plugin adds that export.
const { CSSPresencePlugin } = require(path.join(UPSTREAM_UI, "tools/css-presence"));
const OUTPUT_DIR = path.resolve(__dirname, "../dist/FindIt");

// The game reads the module id from this header comment (UIModuleAsset.ParseModuleInfo).
const banner = `
 * Cities: Skylines II UI Module
 *
 * Id: ${MOD.id}
 * Author: ${MOD.author}
 * Version: ${MOD.version}
 * Dependencies: ${MOD.dependencies.join(",")}
`;

module.exports = {
  mode: "production",
  stats: "errors-warnings",
  context: __dirname,
  entry: {
    [MOD.id]: "./src/index.tsx",
  },
  externalsType: "window",
  externals: {
    react: "React",
    "react-dom": "ReactDOM",
    "cs2/modding": "cs2/modding",
    "cs2/api": "cs2/api",
    "cs2/bindings": "cs2/bindings",
    "cs2/l10n": "cs2/l10n",
    "cs2/ui": "cs2/ui",
    "cs2/input": "cs2/input",
    "cs2/utils": "cs2/utils",
    "cohtml/cohtml": "cohtml/cohtml",
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: "ts-loader",
          options: { configFile: path.resolve(__dirname, "tsconfig.json") },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.s?css$/,
        include: [path.join(__dirname, "src"), path.join(UPSTREAM_UI, "src")],
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: "css-loader",
            options: {
              url: true,
              importLoaders: 1,
              modules: {
                auto: true,
                exportLocalsConvention: "camelCase",
                localIdentName: "[local]_fl[hash:base64:3]",
              },
            },
          },
          "sass-loader",
        ],
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: "asset/resource",
        generator: {
          filename: "images/[name][ext][query]",
        },
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    modules: [path.join(__dirname, "src"), path.join(UPSTREAM_UI, "src"), path.join(UPSTREAM_UI, "node_modules"), "node_modules"],
    alias: {
      "mod.json": path.resolve(__dirname, "mod.json"),
      upstream: path.join(UPSTREAM_UI, "src"),
    },
  },
  resolveLoader: {
    modules: [path.join(UPSTREAM_UI, "node_modules"), "node_modules"],
  },
  output: {
    path: OUTPUT_DIR,
    library: {
      type: "module",
    },
    publicPath: `coui://ui-mods/`,
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        extractComments: {
          banner: () => banner,
        },
      }),
    ],
  },
  experiments: {
    outputModule: true,
  },
  plugins: [
    new MiniCssExtractPlugin(),
    new CSSPresencePlugin(),
    // Upstream components import "../../../mod.json" relatively; point every such import at
    // this module's mod.json so they bind to the "FindItLocal" group.
    new webpack.NormalModuleReplacementPlugin(/mod\.json$/, path.resolve(__dirname, "mod.json")),
  ],
};
