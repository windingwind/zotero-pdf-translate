import { config } from "../../package.json";

export function getPref(key: string) {
  return Zotero.Prefs.get(`${config.prefsPrefix}.${key}`, true);
}

export function setPref(key: string, value: string | number | boolean) {
  return Zotero.Prefs.set(`${config.prefsPrefix}.${key}`, value, true);
}

export function clearPref(key: string) {
  return Zotero.Prefs.clear(`${config.prefsPrefix}.${key}`, true);
}

export function getPrefJSON(key: string) {
  try {
    return JSON.parse(String(getPref(key) || "{}"));
  } catch (e) {
    setPref(key, "{}");
  }
  return {};
}
