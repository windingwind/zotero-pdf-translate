import { config } from "../../package.json";
import { getString } from "../utils/locale";
import {
  addTranslateAbstractTask,
  addTranslateTitleTask,
  TranslateTask,
} from "../utils/translate";

export function registerMenu() {
  const menuIcon = `chrome://${config.addonRef}/content/icons/favicon@0.5x.png`;
  ztoolkit.Menu.register("item", {
    tag: "menuseparator",
  });
  ztoolkit.Menu.register("item", {
    tag: "menuitem",
    label: getString("itemmenu-translateTitle-label"),
    commandListener: (ev) => {
      addon.hooks.onTranslateInBatch(
        ZoteroPane.getSelectedItems(true)
          .map((id) => addTranslateTitleTask(id, true))
          .filter((task) => task) as TranslateTask[],
        { noDisplay: true },
      );
    },
    icon: menuIcon,
  });
  ztoolkit.Menu.register("item", {
    tag: "menuitem",
    label: getString("itemmenu-translateAbstract-label"),
    commandListener: (ev) => {
      addon.hooks.onTranslateInBatch(
        ZoteroPane.getSelectedItems(true)
          .map((id) => addTranslateAbstractTask(id, true))
          .filter((task) => task) as TranslateTask[],
        { noDisplay: true },
      );
    },
    icon: menuIcon,
  });
  ztoolkit.Menu.register("item", {
    tag: "menuitem",
    label: `${getString("itemmenu-switchTitleMode-label")}(${getString(
      "ctrl",
    )} + T)`,
    commandListener: (ev) => {
      addon.hooks.onSwitchTitleColumnDisplay();
    },
    icon: menuIcon,
  });
}
