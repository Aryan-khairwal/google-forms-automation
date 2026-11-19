const path = require("node:path");

function localPath(name) {
  return path.resolve(process.env.FORMS_DATA_DIR || process.cwd(), name);
}

module.exports = { localPath };
