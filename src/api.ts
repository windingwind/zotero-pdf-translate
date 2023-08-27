import { SERVICES } from "./utils/config";
import { getPref } from "./utils/prefs";
import { TranslateTask } from "./utils/task";
import { version } from "../package.json";

/**
 * To plugin developers: Please use this API to translate your custom text.
 *
 * @param raw raw text for translation.
 * @param service service id. See src/utils/config.ts > SERVICES
 * If not provided, the default service will be used.
 * If you want to use multiple services, please provide an array of service ids.
 * The first service in the array will be used as the default service.
 * Others will be used as fallback services.
 * @returns TranslateTask object.
 */
async function translate(raw: string, service?: string | string[]) {
  let currentService: string;
  let candidateServices: string[] = [];
  if (typeof service === "string") {
    currentService = service;
  } else if (Array.isArray(service)) {
    currentService = service[0];
    candidateServices = service.slice(1);
  } else {
    currentService = getPref("translateSource") as string;
  }

  const data: TranslateTask = {
    id: `${Zotero.Utilities.randomString()}-${new Date().getTime()}`,
    type: "custom",
    raw,
    result: "",
    audio: [],
    service: currentService,
    candidateServices,
    itemId: -1,
    status: "waiting",
    extraTasks: [],
    silent: true,
  };
  await addon.data.translate.services.runTranslationTask(data, {
    noDisplay: true,
  });
  return data;
}

/**
 * Get all available services.
 * @returns Array of services.
 */
function getServices() {
  return SERVICES.map((service) => Object.assign({}, service));
}

/**
 * Get version of the plugin.
 * @returns Version of the plugin.
 */
function getVersion() {
  return version;
}

export default {
  translate,
  getServices,
  getVersion,
};
