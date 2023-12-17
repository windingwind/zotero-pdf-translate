import details from "../package.json" assert { type: "json" };

const { addonID, addonName } = details.config;
const { version } = details;

export const reloadScript = `
(async () => {
Services.obs.notifyObservers(null, "startupcache-invalidate", null);
const { AddonManager } = ChromeUtils.import("resource://gre/modules/AddonManager.jsm");
const addon = await AddonManager.getAddonByID("${addonID}");
await addon.reload();
const progressWindow = new Zotero.ProgressWindow({ closeOnClick: true });
progressWindow.changeHeadline("${addonName} Hot Reload");
progressWindow.progress = new progressWindow.ItemProgress(
    "chrome://zotero/skin/tick.png",
    "VERSION=${version}, BUILD=${new Date().toLocaleString()}. By zotero-plugin-toolkit"
);
progressWindow.progress.setProgress(100);
progressWindow.show();
progressWindow.startCloseTimer(5000);
})()`;

export const openDevToolScript = `
(async () => {

// const { BrowserToolboxLauncher } = ChromeUtils.import(
//   "resource://devtools/client/framework/browser-toolbox/Launcher.jsm",
// );
// BrowserToolboxLauncher.init();
// TODO: Use the above code to open the devtool after https://github.com/zotero/zotero/pull/3387

Zotero.Prefs.set("devtools.debugger.remote-enabled", true, true);
Zotero.Prefs.set("devtools.debugger.remote-port", 6100, true);
Zotero.Prefs.set("devtools.debugger.prompt-connection", false, true);
Zotero.Prefs.set("devtools.debugger.chrome-debugging-websocket", false, true);

env =
    Services.env ||
    Cc["@mozilla.org/process/environment;1"].getService(Ci.nsIEnvironment);

env.set("MOZ_BROWSER_TOOLBOX_PORT", 6100);
Zotero.openInViewer(
    "chrome://devtools/content/framework/browser-toolbox/window.html",
    {
    onLoad: (doc) => {
        doc.querySelector("#status-message-container").style.visibility =
        "collapse";
        let toolboxBody;
        waitUntil(
        () => {
            toolboxBody = doc
            .querySelector(".devtools-toolbox-browsertoolbox-iframe")
            ?.contentDocument?.querySelector(".theme-body");
            return toolboxBody;
        },
        () => {
            toolboxBody.style = "pointer-events: all !important";
        }
        );
    },
    }
);

function waitUntil(condition, callback, interval = 100, timeout = 10000) {
    const start = Date.now();
    const intervalId = setInterval(() => {
    if (condition()) {
        clearInterval(intervalId);
        callback();
    } else if (Date.now() - start > timeout) {
        clearInterval(intervalId);
    }
    }, interval);
}  
})()`;
