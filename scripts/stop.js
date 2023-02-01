const { execSync } = require("child_process");
const { killZoteroWindows, killZoteroUnix } = require("./zotero-cmd.json");

try {
  if (process.platform === "win32") {
    execSync(killZoteroWindows);
  } else {
    execSync(killZoteroUnix);
  }
} catch (e) {}
