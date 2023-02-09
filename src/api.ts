import { getPref } from "./utils/prefs";
import { TranslateTask } from "./utils/translate";

/**
 * To plugin developers: Please use this API to translate your custom text.
 *
 * @param raw raw text for translation.
 * @param service service id. See src/utils/config.ts > SERVICES
 * @returns TranslateTask object.
 */
async function translate(raw: string, service?: string) {
  const data: TranslateTask = {
    id: `${Zotero.Utilities.randomString()}-${new Date().getTime()}`,
    type: "custom",
    raw,
    result: "",
    audio: [],
    service: service || (getPref("translateSource") as string),
    candidateServices: [],
    itemId: -1,
    status: "waiting",
    extraTasks: [],
  };
  await addon.data.translate.services.runTranslationTask(data, {
    noDisplay: true,
  });
  return data;
}

export default { translate };
