/**
 * Most of this code is from Zotero team's official Make It Red example[1]
 * or the Zotero 7 documentation[2].
 * [1] https://github.com/zotero/make-it-red
 * [2] https://www.zotero.org/support/dev/zotero_7_for_developers
 */

if (typeof Zotero == "undefined") {
  var Zotero;
}

var chromeHandle;

var windowListener;

// In Zotero 6, bootstrap methods are called before Zotero is initialized, and using include.js
// to get the Zotero XPCOM service would risk breaking Zotero startup. Instead, wait for the main
// Zotero window to open and get the Zotero object from there.
//
// In Zotero 7, bootstrap methods are not called until Zotero is initialized, and the 'Zotero' is
// automatically made available.
async function waitForZotero() {
  await new Promise(async (resolve) => {
    if (typeof Zotero != "undefined") {
      resolve();
    }

    const { Services } = ChromeUtils.import(
      "resource://gre/modules/Services.jsm",
    );
    const windows = Services.wm.getEnumerator("navigator:browser");
    let found = false;
    while (windows.hasMoreElements()) {
      let win = windows.getNext();
      if (win.Zotero) {
        Zotero = win.Zotero;
        found = true;
        resolve();
        break;
      }
    }
    windowListener = {
      onOpenWindow: function (aWindow) {
        // Wait for the window to finish loading
        const domWindow = aWindow
          .QueryInterface(Ci.nsIInterfaceRequestor)
          .getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
        domWindow.addEventListener(
          "load",
          async function () {
            domWindow.removeEventListener("load", arguments.callee, false);
            if (!found && domWindow.Zotero) {
              Zotero = domWindow.Zotero;
              resolve();
            } else if (
              domWindow.location.href ===
              "chrome://zotero/content/zoteroPane.xhtml"
            ) {
              // Call the hook for the main window load event
              // Note that this is not called the first time the window is opened
              // (when Zotero is initialized), but only when the window is re-opened
              // after being closed
              await Zotero.__addonInstance__?.hooks.onMainWindowLoad(domWindow);
            }
          },
          false,
        );
      },
      onCloseWindow: function (aWindow) {
        const domWindow = aWindow
          .QueryInterface(Ci.nsIInterfaceRequestor)
          .getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
        if (
          domWindow.location.href === "chrome://zotero/content/zoteroPane.xhtml"
        ) {
          Zotero.__addonInstance__?.hooks.onMainWindowUnload(domWindow);
        }
      },
    };
    Services.wm.addListener(windowListener);
  });
}

function install(data, reason) {}

async function startup({ id, version, resourceURI, rootURI }, reason) {
  await waitForZotero();
  await Zotero.initializationPromise;

  // String 'rootURI' introduced in Zotero 7
  if (!rootURI) {
    rootURI = resourceURI.spec;
  }

  var aomStartup = Components.classes[
    "@mozilla.org/addons/addon-manager-startup;1"
  ].getService(Components.interfaces.amIAddonManagerStartup);
  var manifestURI = Services.io.newURI(rootURI + "manifest.json");
  chromeHandle = aomStartup.registerChrome(manifestURI, [
    ["content", "__addonRef__", rootURI + "chrome/content/"],
  ]);

  /**
   * Global variables for plugin code.
   * The `_globalThis` is the global root variable of the plugin sandbox environment
   * and all child variables assigned to it is globally accessible.
   * See `src/index.ts` for details.
   */
  const ctx = {
    rootURI,
  };
  ctx._globalThis = ctx;

  Services.scriptloader.loadSubScript(
    `${rootURI}/chrome/content/scripts/__addonRef__.js`,
    ctx,
  );
}

function shutdown({ id, version, resourceURI, rootURI }, reason) {
  if (reason === APP_SHUTDOWN) {
    return;
  }
  Services.wm.removeListener(windowListener);

  if (typeof Zotero === "undefined") {
    Zotero = Components.classes["@zotero.org/Zotero;1"].getService(
      Components.interfaces.nsISupports,
    ).wrappedJSObject;
  }
  Zotero.__addonInstance__.hooks.onShutdown();

  Cc["@mozilla.org/intl/stringbundle;1"]
    .getService(Components.interfaces.nsIStringBundleService)
    .flushBundles();

  Cu.unload(`${rootURI}/chrome/content/scripts/__addonRef__.js`);

  if (chromeHandle) {
    chromeHandle.destruct();
    chromeHandle = null;
  }
}

function uninstall(data, reason) {}
