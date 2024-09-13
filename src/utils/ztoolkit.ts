import { config } from "../../package.json";

export { createZToolkit };

function createZToolkit() {
  // const _ztoolkit = new ZoteroToolkit();
  /**
   * Alternatively, import toolkit modules you use to minify the plugin size.
   * You can add the modules under the `MyToolkit` class below and uncomment the following line.
   */
  const _ztoolkit = new MyToolkit();
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

import {
  BasicTool,
  makeHelperTool,
  unregister,
} from "zotero-plugin-toolkit/dist/basic";
import { UITool } from "zotero-plugin-toolkit/dist/tools/ui";
import { MenuManager } from "zotero-plugin-toolkit/dist/managers/menu";
import { PromptManager } from "zotero-plugin-toolkit/dist/managers/prompt";
import { ProgressWindowHelper } from "zotero-plugin-toolkit/dist/helpers/progressWindow";
import { ClipboardHelper } from "zotero-plugin-toolkit/dist/helpers/clipboard";
import { ExtraFieldTool } from "zotero-plugin-toolkit/dist/tools/extraField";
import { DialogHelper } from "zotero-plugin-toolkit/dist/helpers/dialog";
import { KeyboardManager } from "zotero-plugin-toolkit/dist/managers/keyboard";
import { FieldHookManager } from "zotero-plugin-toolkit/dist/managers/fieldHook";

export class MyToolkit extends BasicTool {
  UI: UITool;
  ExtraField: ExtraFieldTool;
  FieldHook: FieldHookManager;
  Keyboard: KeyboardManager;
  Menu: MenuManager;
  Prompt: PromptManager;
  Dialog: typeof DialogHelper;
  ProgressWindow: typeof ProgressWindowHelper;
  Clipboard: typeof ClipboardHelper;

  constructor() {
    super();
    this.UI = new UITool(this);
    this.ExtraField = new ExtraFieldTool(this);
    this.FieldHook = new FieldHookManager(this);
    this.Keyboard = new KeyboardManager(this);
    this.Menu = new MenuManager(this);
    this.Prompt = new PromptManager(this);
    this.Dialog = makeHelperTool(DialogHelper, this);
    this.ProgressWindow = makeHelperTool(ProgressWindowHelper, this);
    this.Clipboard = makeHelperTool(ClipboardHelper, this);
  }

  unregisterAll() {
    unregister(this);
  }
}
