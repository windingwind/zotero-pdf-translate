import { config } from "../../package.json";

export {
  getPref,
  setPref,
  clearPref,
  getPrefJSON,
  registerPrefObserver,
  unregisterPrefObserver,
};

type _PluginPrefsMap = _ZoteroTypes.Prefs["PluginPrefsMap"];

function getPref<K extends keyof _PluginPrefsMap>(key: K): _PluginPrefsMap[K];
function getPref(key: string): string | number | boolean;
function getPref(key: string): string | number | boolean {
  return Zotero.Prefs.get(`${config.prefsPrefix}.${key}`, true) as any;
}

function setPref<K extends keyof _PluginPrefsMap>(
  key: K,
  value: _PluginPrefsMap[K],
): void;
function setPref(key: string, value: string | number | boolean): void;
function setPref(key: string, value: string | number | boolean) {
  return Zotero.Prefs.set(`${config.prefsPrefix}.${key}`, value, true);
}

function clearPref<K extends keyof _PluginPrefsMap>(key: K): void;
function clearPref(key: string): void;
function clearPref(key: string) {
  return Zotero.Prefs.clear(`${config.prefsPrefix}.${key}`, true);
}

function getPrefJSON(key: string) {
  try {
    return JSON.parse(String(getPref(key) || "{}"));
  } catch (e) {
    setPref(key, "{}");
  }
  return {};
}

function registerPrefObserver<K extends keyof _PluginPrefsMap>(
  key: K,
  callback: (value: _PluginPrefsMap[K]) => void,
): symbol;
function registerPrefObserver(
  key: string,
  callback: (value: any) => void,
): symbol;
function registerPrefObserver(key: string, callback: (value: any) => void) {
  return Zotero.Prefs.registerObserver(
    `${config.prefsPrefix}.${key}`,
    callback,
    true,
  );
}

function unregisterPrefObserver(observerID: symbol) {
  return Zotero.Prefs.unregisterObserver(observerID);
}
