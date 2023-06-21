import process from "process";
import { execSync } from "child_process";
import cmd from "./zotero-cmd.json" assert { type: "json" };
const { killZoteroWindows, killZoteroUnix } = cmd;

try {
  if (process.platform === "win32") {
    execSync(killZoteroWindows);
  } else {
    execSync(killZoteroUnix);
  }
} catch (e) {
  console.error(e);
}
