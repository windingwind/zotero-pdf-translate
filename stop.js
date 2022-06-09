const { execSync } = require("child_process");
const { killZotero } = require("./zotero-cmd.json");

try {
  execSync(killZotero);
} catch (e) {}
