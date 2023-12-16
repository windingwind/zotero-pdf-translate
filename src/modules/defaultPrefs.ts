import { getService, SERVICES } from "../utils/config";
import { getPref, setPref } from "../utils/prefs";

export function setDefaultPrefSettings() {
  const servicesIds = SERVICES.map((service) => service.id);
  if (!servicesIds.includes((getPref("translateSource") as string) || "")) {
    // Google Translate is not accessible in China mainland
    setPref("translateSource", "chatGPT");
  }

  if (!getPref("targetLanguage")) {
    setPref("targetLanguage", Zotero.locale);
  }

  const secrets = JSON.parse((getPref("secretObj") as string) || "{}");
  for (const serviceId of servicesIds) {
    if (typeof secrets[serviceId] === "undefined") {
      secrets[serviceId] = getService(serviceId).defaultSecret || "";
    }
  }
  setPref("secretObj", JSON.stringify(secrets));

  const extraServices = getPref("extraEngines") as string;
  if (extraServices.startsWith(",")) {
    setPref("extraEngines", extraServices.slice(1));
  }
}
