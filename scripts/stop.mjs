import { Logger, isRunning } from "./utils.mjs";
import cmd from "./zotero-cmd.json" assert { type: "json" };
import { execSync } from "child_process";
import process from "process";

const { killZoteroWindows, killZoteroUnix } = cmd;

isRunning("zotero", (status) => {
  if (status) {
    killZotero();
  } else {
    Logger.warn("No Zotero running.");
  }
});

function killZotero() {
  try {
    if (process.platform === "win32") {
      execSync(killZoteroWindows);
    } else {
      execSync(killZoteroUnix);
    }
  } catch (e) {
    Logger.error(e);
  }
}
