import { config } from "../../package.json";
import { getPref } from "../utils/prefs";
import {
  addTranslateAbstractTask,
  addTranslateTitleTask,
  TranslateTask,
} from "../utils/task";

export function registerMenu() {
  const menuIcon = `chrome://${config.addonRef}/content/icons/favicon.png`;

  Zotero.MenuManager.registerMenu({
    menuID: `${config.addonRef}-translate-title`,
    pluginID: config.addonID,
    target: "main/library/item",
    menus: [
      {
        menuType: "menuitem",
        l10nID: `${config.addonRef}-itemmenu-translateTitle`,
        icon: menuIcon,
        onCommand: (event, context) => {
          addon.hooks.onTranslateInBatch(
            (
              context.menuElem.ownerGlobal
                ?.ZoteroPane as _ZoteroTypes.ZoteroPane
            )
              ?.getSelectedItems(true)
              .map((id) => addTranslateTitleTask(id, true))
              .filter((task) => task) as TranslateTask[],
            { noDisplay: true, noCache: true },
          );
        },
        onShowing: (event, context) => {
          const enabled =
            getPref("showItemMenuTitleTranslation") &&
            context.items?.every((item) => item.isRegularItem());
          context.menuElem.hidden = !enabled;
        },
      },
      {
        menuType: "menuitem",
        l10nID: `${config.addonRef}-itemmenu-translateAbstract`,
        icon: menuIcon,
        onCommand: (event, context) => {
          addon.hooks.onTranslateInBatch(
            (
              context.menuElem.ownerGlobal
                ?.ZoteroPane as _ZoteroTypes.ZoteroPane
            )
              ?.getSelectedItems(true)
              .map((id) => addTranslateAbstractTask(id, true))
              .filter((task) => task) as TranslateTask[],
            { noDisplay: true, noCache: true },
          );
        },
        onShowing: (event, context) => {
          const enabled =
            getPref("showItemMenuTitleTranslation") &&
            context.items?.every((item) => item.isRegularItem());
          context.menuElem.hidden = !enabled;
        },
      },
    ],
  });
}
