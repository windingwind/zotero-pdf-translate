import ZoteroToolkit from "zotero-plugin-toolkit";
import { config } from "../../package.json";

export { createZToolkit };

function createZToolkit() {
  const _ztoolkit = new ZoteroToolkit();
  /**
   * Alternatively, import toolkit modules you use to minify the plugin size.
   * You can add the modules under the `MyToolkit` class below and uncomment the following line.
   */
  // const _ztoolkit = new MyToolkit();
  initZToolkit(_ztoolkit);
  return _ztoolkit;
}

function initZToolkit(_ztoolkit: ReturnType<typeof createZToolkit>) {
  const env = __env__;
  _ztoolkit.basicOptions.log.prefix = `[${config.addonName}]`;
  _ztoolkit.basicOptions.log.disableConsole = env === "production";
  _ztoolkit.UI.basicOptions.ui.enableElementJSONLog = __env__ === "development";
  _ztoolkit.UI.basicOptions.ui.enableElementDOMLog = __env__ === "development";
  _ztoolkit.basicOptions.debug.disableDebugBridgePassword =
    __env__ === "development";
  _ztoolkit.basicOptions.api.pluginID = config.addonID;
  _ztoolkit.ProgressWindow.setIconURI(
    "default",
    `chrome://${config.addonRef}/content/icons/favicon.png`,
  );
}

import { BasicTool, unregister } from "zotero-plugin-toolkit/dist/basic";
import { UITool } from "zotero-plugin-toolkit/dist/tools/ui";
import { ShortcutManager } from "zotero-plugin-toolkit/dist/managers/shortcut";
import { MenuManager } from "zotero-plugin-toolkit/dist/managers/menu";
import { PreferencePaneManager } from "zotero-plugin-toolkit/dist/managers/preferencePane";
import { ReaderTabPanelManager } from "zotero-plugin-toolkit/dist/managers/readerTabPanel";
import { PromptManager } from "zotero-plugin-toolkit/dist/managers/prompt";
import { ProgressWindowHelper } from "zotero-plugin-toolkit/dist/helpers/progressWindow";
import { ClipboardHelper } from "zotero-plugin-toolkit/dist/helpers/clipboard";
import { ExtraFieldTool } from "zotero-plugin-toolkit/dist/tools/extraField";
import { ItemTreeManager } from "zotero-plugin-toolkit/dist/managers/itemTree";
import { ItemBoxManager } from "zotero-plugin-toolkit/dist/managers/itemBox";
import { DialogHelper } from "zotero-plugin-toolkit/dist/helpers/dialog";

export class MyToolkit extends BasicTool {
  UI: UITool;
  ExtraField: ExtraFieldTool;
  Shortcut: ShortcutManager;
  Menu: MenuManager;
  ItemTree: ItemTreeManager;
  ItemBox: ItemBoxManager;
  Prompt: PromptManager;
  PreferencePane: PreferencePaneManager;
  ReaderTabPanel: ReaderTabPanelManager;
  Dialog: typeof DialogHelper;
  ProgressWindow: typeof ProgressWindowHelper;
  Clipboard: typeof ClipboardHelper;
  LibraryTabPanel: any;

  constructor() {
    super();
    this.UI = new UITool(this);
    this.ExtraField = new ExtraFieldTool(this);
    this.Shortcut = new ShortcutManager(this);
    this.Menu = new MenuManager(this);
    this.ItemTree = new ItemTreeManager(this);
    this.ItemBox = new ItemBoxManager(this);
    this.PreferencePane = new PreferencePaneManager(this);
    this.ReaderTabPanel = new ReaderTabPanelManager(this);
    this.Prompt = new PromptManager(this);
    this.Dialog = DialogHelper;
    this.ProgressWindow = ProgressWindowHelper;
    this.Clipboard = ClipboardHelper;
  }

  unregisterAll() {
    unregister(this);
  }
}
