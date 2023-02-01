import { config } from "../../package.json";

export function registerShortcuts() {
  //   ztoolkit.Shortcut.register("element", {
  //     id:,
  //     key: "T",
  //     callback: (keyOptions) => {
  //       addon.hooks.onShortcuts(Zotero_Tabs.selectedType);
  //     },
  //     modifiers: "accel",
  //   });

  ztoolkit.Shortcut.register("element", {
    id: `${config.addonRef}-translateKey`,
    key: "T",
    modifiers: "accel",
    xulData: {
      document,
      command: `${config.addonRef}-translateCmd`,
      _parentId: `${config.addonRef}-keyset`,
      _commandOptions: {
        id: `${config.addonRef}-translateCmd`,
        document,
        _parentId: `${config.addonRef}-cmdset`,
        oncommand: `Zotero.${config.addonInstance}.hooks.onShortcuts(Zotero_Tabs.selectedType)`,
      },
    },
  });
}
