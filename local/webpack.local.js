// Wraps the author's webpack config so the UI builds on Linux: same build,
// but the output goes to local/dist/FindIt instead of the Windows toolchain's Mods path.
// Run from FindIt/UI: npx webpack --config ../../local/webpack.local.js
const path = require("path");

process.env.CSII_USERDATAPATH = process.env.CSII_USERDATAPATH || "unused-on-linux";

const config = require("../FindIt/UI/webpack.config.js");

config.output.path = path.resolve(__dirname, "dist/FindIt");

module.exports = config;
