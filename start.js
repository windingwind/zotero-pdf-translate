const { execSync } = require("child_process");
const { exit } = require("process");
const { startZotero } = require("./zotero-cmd.json");

execSync(startZotero);
exit(0);
