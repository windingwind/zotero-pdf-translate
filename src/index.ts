import { BasicTool } from "zotero-plugin-toolkit/dist/basic";
import Addon from "./addon";
import { config } from "../package.json";

const basicTool = new BasicTool();

if (!basicTool.getGlobal("Zotero")[config.addonInstance]) {
  // Set global variables
  _globalThis.Zotero = basicTool.getGlobal("Zotero");
  defineGlobal("window");
  defineGlobal("document");
  defineGlobal("ZoteroPane");
  defineGlobal("Zotero_Tabs");
  defineGlobal("ZoteroContextPane");
  defineGlobal("crypto");
  defineGlobal("TextEncoder");
  _globalThis.addon = new Addon();
  Object.defineProperty(_globalThis, "ztoolkit", {
    get() {
      return _globalThis.addon.data.ztoolkit;
    },
  });
  Zotero[config.addonInstance] = addon;
  // Trigger addon hook for initialization
  addon.hooks.onStartup();
}

function defineGlobal(name: Parameters<BasicTool["getGlobal"]>[0]) {
  Object.defineProperty(_globalThis, name, {
    get() {
      return basicTool.getGlobal(name);
    },
  });
}
