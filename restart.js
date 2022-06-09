const { execSync } = require("child_process");
const { killZotero, startZotero } = require("./zotero-cmd.json");

try {
  execSync(killZotero);
} catch (e) {}

execSync(startZotero);
