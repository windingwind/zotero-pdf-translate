import api from "./api";
import hooks from "./hooks";
import { TranslateTask } from "./utils/translate";
import { TranslationServices } from "./modules/services";
import { config } from "../package.json";

class Addon {
  public data: {
    alive: boolean;
    // Env type, see build.js
    env: "development" | "production";
    ztoolkit: ZToolkit;
    locale: {
      stringBundle: any;
    };
    prefs: {
      window: Window | null;
    };
    panel: {
      tabOptionId: string;
      activePanels: HTMLElement[];
      windowPanel: Window | null;
    };
    popup: {
      currentPopup: HTMLDivElement | null;
    };
    translate: {
      concatKey: boolean;
      concatCheckbox: boolean;
      queue: TranslateTask[];
      maximumQueueLength: number;
      batchTaskDelay: number;
      services: TranslationServices;
    };
  };
  // Lifecycle hooks
  public hooks: typeof hooks;
  // APIs
  public api: typeof api;

  constructor() {
    this.data = {
      alive: true,
      env: __env__,
      ztoolkit: new ZToolkit(),
      locale: { stringBundle: null },
      prefs: { window: null },
      panel: { tabOptionId: "", activePanels: [], windowPanel: null },
      popup: { currentPopup: null },
      translate: {
        concatKey: false,
        concatCheckbox: false,
        queue: [],
        maximumQueueLength: 100,
        batchTaskDelay: 1000,
        services: new TranslationServices(),
      },
    };
    this.hooks = hooks;
    this.api = api;
  }
}

/**
 * Alternatively, import toolkit modules you use to minify the plugin size.
 *
 * Steps to replace the default `ztoolkit: ZoteroToolkit` with your `ztoolkit: MyToolkit`:
 *
 * 1. Uncomment this file's line 30:            `ztoolkit: new MyToolkit(),`
 *    and comment line 31:                      `ztoolkit: new ZoteroToolkit(),`.
 * 2. Uncomment this file's line 10:            `ztoolkit: MyToolkit;` in this file
 *    and comment line 11:                      `ztoolkit: ZoteroToolkit;`.
 * 3. Uncomment `./typing/global.d.ts` line 12: `declare const ztoolkit: import("../src/addon").MyToolkit;`
 *    and comment line 13:                      `declare const ztoolkit: import("zotero-plugin-toolkit").ZoteroToolkit;`.
 *
 * You can now add the modules under the `MyToolkit` class.
 */

import { BasicTool, unregister } from "zotero-plugin-toolkit/dist/basic";
import { ToolkitGlobal } from "zotero-plugin-toolkit/dist/managers/toolkitGlobal";
import { UITool } from "zotero-plugin-toolkit/dist/tools/ui";
import { ShortcutManager } from "zotero-plugin-toolkit/dist/managers/shortcut";
import { MenuManager } from "zotero-plugin-toolkit/dist/managers/menu";
import { PreferencePaneManager } from "zotero-plugin-toolkit/dist/managers/preferencePane";
import { ReaderTabPanelManager } from "zotero-plugin-toolkit/dist/managers/readerTabPanel";
import { ReaderInstanceManager } from "zotero-plugin-toolkit/dist/managers/readerInstance";
import { PromptManager } from "zotero-plugin-toolkit/dist/managers/prompt";
import { ProgressWindowHelper } from "zotero-plugin-toolkit/dist/helpers/progressWindow";
import { ClipboardHelper } from "zotero-plugin-toolkit/dist/helpers/clipboard";
import { ReaderTool } from "zotero-plugin-toolkit/dist/tools/reader";
import { ExtraFieldTool } from "zotero-plugin-toolkit/dist/tools/extraField";
import { ItemTreeManager } from "zotero-plugin-toolkit/dist/managers/itemTree";
import { ItemBoxManager } from "zotero-plugin-toolkit/dist/managers/itemBox";
import { DialogHelper } from "zotero-plugin-toolkit/dist/helpers/dialog";

export class ZToolkit extends BasicTool {
  Global: typeof ToolkitGlobal;
  UI: UITool;
  Reader: ReaderTool;
  ExtraField: ExtraFieldTool;
  Shortcut: ShortcutManager;
  Menu: MenuManager;
  ItemTree: ItemTreeManager;
  ItemBox: ItemBoxManager;
  Prompt: PromptManager;
  PreferencePane: PreferencePaneManager;
  ReaderTabPanel: ReaderTabPanelManager;
  ReaderInstance: ReaderInstanceManager;
  Dialog: typeof DialogHelper;
  ProgressWindow: typeof ProgressWindowHelper;
  Clipboard: typeof ClipboardHelper;

  constructor() {
    super();
    this.Global = ToolkitGlobal;
    this.UI = new UITool(this);
    this.Reader = new ReaderTool(this);
    this.ExtraField = new ExtraFieldTool(this);
    this.Shortcut = new ShortcutManager(this);
    this.Menu = new MenuManager(this);
    this.ItemTree = new ItemTreeManager(this);
    this.ItemBox = new ItemBoxManager(this);
    this.PreferencePane = new PreferencePaneManager(this);
    this.ReaderTabPanel = new ReaderTabPanelManager(this);
    this.ReaderInstance = new ReaderInstanceManager(this);
    this.Prompt = new PromptManager(this);
    this.Dialog = DialogHelper;
    this.ProgressWindow = ProgressWindowHelper;
    this.ProgressWindow.setIconURI(
      "default",
      `chrome://${config.addonRef}/content/icons/favicon.png`
    );
    this.Clipboard = ClipboardHelper;
  }

  unregisterAll() {
    unregister(this);
  }
}

export default Addon;
