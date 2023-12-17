import { main as build, esbuildOptions } from "./build.mjs";
import { openDevToolScript, reloadScript } from "./scripts.mjs";
import { main as startZotero } from "./start.mjs";
import { Logger } from "./utils.mjs";
import cmd from "./zotero-cmd.json" assert { type: "json" };
import { execSync } from "child_process";
import chokidar from "chokidar";
import { context } from "esbuild";
import { exit } from "process";

process.env.NODE_ENV = "development";

const { zoteroBinPath, profilePath } = cmd.exec;

const startZoteroCmd = `"${zoteroBinPath}" --debugger --purgecaches -profile "${profilePath}"`;

async function watch() {
  const watcher = chokidar.watch(["src/**", "addon/**"], {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
  });

  let esbuildCTX = await context(esbuildOptions);

  watcher
    .on("ready", () => {
      Logger.info("Server Ready! \n");
    })
    .on("change", async (path) => {
      Logger.info(`${path} changed.`);
      if (path.startsWith("src")) {
        await esbuildCTX.rebuild();
      } else if (path.startsWith("addon")) {
        await build()
          // Do not abort the watcher when errors occur in builds triggered by the watcher.
          .catch((err) => {
            Logger.error(err);
          });
      }
      // reload
      reload();
    })
    .on("error", (err) => {
      Logger.error("Server start failed!", err);
    });
}

function reload() {
  Logger.debug("Reloading...");
  const url = `zotero://ztoolkit-debug/?run=${encodeURIComponent(
    reloadScript,
  )}`;
  const command = `${startZoteroCmd} -url "${url}"`;
  execSync(command);
}

function openDevTool() {
  Logger.debug("Open dev tools...");
  const url = `zotero://ztoolkit-debug/?run=${encodeURIComponent(
    openDevToolScript,
  )}`;
  const command = `${startZoteroCmd} -url "${url}"`;
  execSync(command);
}

async function main() {
  // build
  await build();

  // start Zotero
  startZotero(openDevTool);

  // watch
  await watch();
}

main().catch((err) => {
  Logger.error(err);
  // execSync("node scripts/stop.mjs");
  exit(1);
});

process.on("SIGINT", (code) => {
  execSync("node scripts/stop.mjs");
  Logger.info(`Server terminated with signal ${code}.`);
  exit(0);
});
