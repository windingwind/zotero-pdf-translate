const { execSync } = require("child_process");
const { exit } = require("process");
const { exec } = require("./zotero-cmd.json");

// Run node start.js -h for help
const args = require("minimist")(process.argv.slice(2));

if (args.help || args.h) {
  console.log("Start Zotero Args:");
  console.log(
    "--zotero(-z): Zotero exec key in zotero-cmd.json. Default the first one."
  );
  console.log("--profile(-p): Zotero profile name.");
  exit(0);
}

const zoteroPath = exec[args.zotero || args.z || Object.keys(exec)[0]];
const profile = args.profile || args.p;

const startZotero = `${zoteroPath} --debugger --purgecaches ${
  profile ? `-p ${profile}` : ""
}`;

execSync(startZotero);
exit(0);
