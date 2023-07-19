import { execSync } from "child_process";
import { exit } from "process";
import { existsSync, writeFileSync, readFileSync, mkdirSync } from "fs";
import path from "path";
import details from "../package.json" assert { type: "json" };
import cmd from "./zotero-cmd.json" assert { type: "json" };

const { addonID } = details.config;
const { zoteroBinPath, profilePath, dataDir } = cmd.exec;

if (!existsSync(zoteroBinPath)) {
  throw new Error("Zotero binary does not exist.");
}

if (existsSync(profilePath)) {
  const addonProxyFilePath = path.join(profilePath, `extensions/${addonID}`);
  const buildPath = path.resolve("build/addon");

  if (!existsSync(path.join(buildPath, "./manifest.json"))) {
    throw new Error(
      `The built file does not exist, maybe you need to build the addon first.`,
    );
  }

  function writeAddonProxyFile() {
    writeFileSync(addonProxyFilePath, buildPath);
    console.log(
      `[info] Addon proxy file has been updated. 
      File path: ${addonProxyFilePath} 
      Addon path: ${buildPath} `,
    );
  }

  if (existsSync(addonProxyFilePath)) {
    if (readFileSync(addonProxyFilePath, "utf-8") !== buildPath) {
      writeAddonProxyFile();
    }
  } else {
    if (
      existsSync(profilePath) &&
      !existsSync(path.join(profilePath, "extensions"))
    ) {
      mkdirSync(path.join(profilePath, "extensions"));
    }
    writeAddonProxyFile();
  }

  const prefsPath = path.join(profilePath, "prefs.js");
  if (existsSync(prefsPath)) {
    const PrefsLines = readFileSync(prefsPath, "utf-8").split("\n");
    const filteredLines = PrefsLines.map((line) => {
      if (
        line.includes("extensions.lastAppBuildId") ||
        line.includes("extensions.lastAppVersion")
      ) {
        return;
      }
      if (line.includes("extensions.zotero.dataDir") && dataDir !== "") {
        return `user_pref("extensions.zotero.dataDir", "${dataDir}");`;
      }
      return line;
    });
    const updatedPrefs = filteredLines.join("\n");
    writeFileSync(prefsPath, updatedPrefs, "utf-8");
    console.log("[info] The <profile>/prefs.js has been modified.");
  }
} else {
  throw new Error("The given Zotero profile does not exist.");
}

const startZotero = `"${zoteroBinPath}" --debugger --purgecaches -profile "${profilePath}"`;

execSync(startZotero);
exit(0);
