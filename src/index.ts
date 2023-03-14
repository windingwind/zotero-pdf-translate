import { BasicTool } from "zotero-plugin-toolkit/dist/basic";
import Addon from "./addon";
import { config } from "../package.json";

const basicTool = new BasicTool();

if (!basicTool.getGlobal("Zotero")[config.addonInstance]) {
  // Set global variables
  _globalThis.Zotero = basicTool.getGlobal("Zotero");
  _globalThis.ZoteroPane = basicTool.getGlobal("ZoteroPane");
  _globalThis.Zotero_Tabs = basicTool.getGlobal("Zotero_Tabs");
  _globalThis.ZoteroContextPane = basicTool.getGlobal("ZoteroContextPane");
  _globalThis.window = basicTool.getGlobal("window");
  _globalThis.document = basicTool.getGlobal("document");
  _globalThis.crypto = basicTool.getGlobal("crypto");
  _globalThis.TextEncoder = basicTool.getGlobal("TextEncoder");
  _globalThis.addon = new Addon();
  _globalThis.ztoolkit = addon.data.ztoolkit;
  ztoolkit.basicOptions.log.prefix = `[${config.addonName}]`;
  ztoolkit.basicOptions.log.disableConsole = addon.data.env === "production";
  ztoolkit.UI.basicOptions.ui.enableElementJSONLog =
    addon.data.env === "development";
  // Set the default false and enable manually
  ztoolkit.UI.basicOptions.ui.enableElementRecord = false;
  Zotero[config.addonInstance] = addon;
  // Trigger addon hook for initialization
  addon.hooks.onStartup();
}
