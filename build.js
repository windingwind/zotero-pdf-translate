const esbuild = require("esbuild");
const compressing = require("compressing");
const path = require("path");
const fs = require("fs");
const process = require("process");
const replace = require("replace-in-file");
const { version } = require("./package.json");

function copyFileSync(source, target) {
  var targetFile = target;

  // If target is a directory, a new file with the same name will be created
  if (fs.existsSync(target)) {
    if (fs.lstatSync(target).isDirectory()) {
      targetFile = path.join(target, path.basename(source));
    }
  }

  fs.writeFileSync(targetFile, fs.readFileSync(source));
}

function copyFolderRecursiveSync(source, target) {
  var files = [];

  // Check if folder needs to be created or integrated
  var targetFolder = path.join(target, path.basename(source));
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder);
  }

  // Copy
  if (fs.lstatSync(source).isDirectory()) {
    files = fs.readdirSync(source);
    files.forEach(function (file) {
      var curSource = path.join(source, file);
      if (fs.lstatSync(curSource).isDirectory()) {
        copyFolderRecursiveSync(curSource, targetFolder);
      } else {
        copyFileSync(curSource, targetFolder);
      }
    });
  }
}

function clearFolder(target) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }

  fs.mkdirSync(target, { recursive: true });
}

function dateFormat(fmt, date) {
  let ret;
  const opt = {
    "Y+": date.getFullYear().toString(),
    "m+": (date.getMonth() + 1).toString(),
    "d+": date.getDate().toString(),
    "H+": date.getHours().toString(),
    "M+": date.getMinutes().toString(),
    "S+": date.getSeconds().toString(),
  };
  for (let k in opt) {
    ret = new RegExp("(" + k + ")").exec(fmt);
    if (ret) {
      fmt = fmt.replace(
        ret[1],
        ret[1].length == 1 ? opt[k] : opt[k].padStart(ret[1].length, "0")
      );
    }
  }
  return fmt;
}

const t = new Date()
const BUILD_TIME = dateFormat("YYYY-mm-dd HH:MM:SS", t);
const BUILD_DIR = "builds";

console.log(`[Build] BUILD_DIR=${BUILD_DIR}, VERSION=${version}, BUILD_TIME=${BUILD_TIME}`);

clearFolder(BUILD_DIR);

copyFolderRecursiveSync("addon", BUILD_DIR);

esbuild
  .build({
    entryPoints: ["src/index.js"],
    bundle: true,
    outfile: path.join(BUILD_DIR, "addon/chrome/content/scripts/index.js"),
    minify: true,
  })
  .catch(() => process.exit(1));

console.log("[Build] Run esbuild OK");

const optionsVersion = {
  files: [path.join(BUILD_DIR, "**/*.rdf"), path.join(BUILD_DIR, "**/*.dtd")],
  from: "__buildVersion__",
  to: version,
};

const optionsUpdateVersion = {
  files: ["update.rdf"],
  from: /<em:version>\S*<\/em:version>/g,
  to: `<em:version>${version}</em:version>`,
};

const optionsTime = {
  files: [path.join(BUILD_DIR, "**/*.dtd")],
  from: "__buildTime__",
  to: BUILD_TIME,
};

replace.sync(optionsVersion);
replace.sync(optionsUpdateVersion);
replace.sync(optionsTime);

console.log("[Build] Replace info OK");

copyFileSync(
  "src/preferences.js",
  path.join(BUILD_DIR, "addon/chrome/content/scripts")
);

console.log("[Build] Addon prepare OK");

compressing.zip.compressDir(
  path.join(BUILD_DIR, "addon"),
  path.join(BUILD_DIR, "zotero-pdf-translate.xpi"),
  {
    ignoreBase: true,
  }
);

console.log("[Build] Addon pack OK");
console.log(
  `[Build] Finished in ${(new Date().getTime() - t.getTime()) / 1000} s.`
);
