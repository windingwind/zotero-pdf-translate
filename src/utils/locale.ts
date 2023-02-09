import { config } from "../../package.json";

export function initLocale() {
  addon.data.locale = {
    stringBundle: Components.classes["@mozilla.org/intl/stringbundle;1"]
      .getService(Components.interfaces.nsIStringBundleService)
      .createBundle(`chrome://${config.addonRef}/locale/addon.properties`),
  };
}

export function getString(localeString: string): string {
  switch (localeString) {
    case "alt":
      return Zotero.isMac ? "⌥" : "Alt";
    case "ctrl":
      return Zotero.isMac ? "⌘" : "Ctrl";
  }
  try {
    return addon.data.locale.stringBundle.GetStringFromName(localeString);
  } catch (e) {
    return localeString;
  }
}
