import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { getPref } from "../utils/prefs";
import {
  addTranslateAbstractTask,
  addTranslateTitleTask,
  TranslateTask,
} from "../utils/task";

export function registerMenu() {
  const menuIcon = `chrome://${config.addonRef}/content/icons/favicon.png`;
  if (
    getPref("showItemMenuTitleTranslation") ||
    getPref("showItemMenuAbstractTranslation")
  ) {
    ztoolkit.Menu.register("item", {
      tag: "menuseparator",
    });
  }
  if (getPref("showItemMenuTitleTranslation")) {
    ztoolkit.Menu.register("item", {
      tag: "menuitem",
      label: getString("itemmenu-translateTitle-label"),
      commandListener: (ev) => {
        addon.hooks.onTranslateInBatch(
          Zotero.getActiveZoteroPane()
            .getSelectedItems(true)
            .map((id) => addTranslateTitleTask(id, true))
            .filter((task) => task) as TranslateTask[],
          { noDisplay: true },
        );
      },
      icon: menuIcon,
    });
  }

  if (getPref("showItemMenuAbstractTranslation")) {
    ztoolkit.Menu.register("item", {
      tag: "menuitem",
      label: getString("itemmenu-translateAbstract-label"),
      commandListener: (ev) => {
        addon.hooks.onTranslateInBatch(
          Zotero.getActiveZoteroPane()
            .getSelectedItems(true)
            .map((id) => addTranslateAbstractTask(id, true))
            .filter((task) => task) as TranslateTask[],
          { noDisplay: true },
        );
      },
      icon: menuIcon,
    });
  }
}
