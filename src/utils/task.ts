import { inferLanguage, matchLanguage } from "./config";
import { getString } from "./locale";
import { getPref } from "./prefs";
import { getServiceSecret } from "./secret";
import { config } from "../../package.json";
import Addon from "../addon";

export interface TranslateTask {
  /**
   * Task id.
   */
  id: string;
  /**
   * Task type.
   */
  type: "text" | "annotation" | "title" | "abstract" | "addtonote" | "custom";
  /**
   * Raw text for translation.
   */
  raw: string;
  /**
   * Translation result or error info.
   */
  result: string;
  /**
   * Audio resources.
   */
  audio: { text: string; url: string }[];
  /**
   * Service id.
   */
  service: string;
  /**
   * Candidate service ids.
   *
   * Only used when the run of `service` fails.
   * Generally this is for the fallback of word services.
   */
  candidateServices: string[];
  /**
   * Zotero item id.
   *
   * For language disable check.
   */
  itemId: number | undefined;
  /**
   * From language
   *
   * Generated at task runtime.
   */
  langfrom?: string;
  /**
   * To language.
   *
   * Generated at task runtime.
   */
  langto?: string;
  /**
   * Whether the from language is inferred.
   */
  langfromInferred?: boolean;
  /**
   * Service secret.
   *
   * Generated at task runtime.
   */
  secret?: string;
  /**
   * task status.
   */
  status: "waiting" | "processing" | "success" | "fail";
  /**
   * Extra tasks.
   *
   * For extra services function.
   */
  extraTasks: TranslateTask[] & { extraTasks: [] }[];
  /**
   * Whether to mute error info, depends on the implementation of the service.
   */
  silent?: boolean;
  /**
   * Caller identifier.
   *
   * This is for translate service provider to identify the caller.
   * If not provided, the call will fail.
   */
  callerID?: string;
  /**
   * If the task is once processed.
   */
  processed?: boolean;
}

export type TranslateTaskProcessor = (
  data: Required<TranslateTask>,
) => Promise<void> | void;

export class TranslateTaskRunner {
  protected processor: TranslateTaskProcessor;
  constructor(processor: TranslateTaskProcessor) {
    this.processor = processor;
  }

  public async run(data: TranslateTask) {
    // @ts-ignore - Plugin instance is not typed
    const addon = Zotero[config.addonInstance] as Addon;
    const ztoolkit = addon.data.ztoolkit;
    if (!data.langfrom || !data.langto) {
      ztoolkit.log("try auto detect language");
      const { fromLanguage, toLanguage, isInferred } = autoDetectLanguage(
        Zotero.Items.get(data.itemId || -1),
      );
      data.langfrom = data.langfrom || fromLanguage;
      data.langto = data.langto || toLanguage;
      if (isInferred) {
        data.langfromInferred = true;
      }
    }

    // If the task is not new, update language settings
    if (data.processed) {
      updateTranslateTaskLang(data);
    }

    data.callerID = data.callerID || config.addonID;

    data.secret = getServiceSecret(data.service);
    data.status = "processing";
    try {
      ztoolkit.log(data);
      await this.processor(data as Required<TranslateTask>);
      data.status = "success";
    } catch (e) {
      data.result = this.makeErrorInfo(data.service, String(e));
      data.status = "fail";
    }
    data.processed = true;
  }

  protected makeErrorInfo(serviceId: string, detail: string) {
    return `${getString("service-errorPrefix")} ${getString(
      `service-${serviceId}`,
    )}\n\n${detail}`;
  }
}

export function addTranslateTask(
  raw: string,
  itemId?: number,
  type?: TranslateTask["type"],
  service?: string,
) {
  if (!raw) {
    return;
  }
  // @ts-ignore - Plugin instance is not typed
  const addon = Zotero[config.addonInstance] as Addon;
  type = type || "text";
  // Filter raw string

  // eslint-disable-next-line no-control-regex
  raw = raw.replace(/[\u0000-\u001F\u007F-\u009F]/gu, " ").normalize("NFKC");

  // Append raw text to last task's raw if in concat mode
  const isConcatMode =
    type === "text" &&
    (addon.data.translate.concatCheckbox ||
      (getPref("enableConcatKey") && addon.data.translate.concatKey));
  const lastTask = getLastTranslateTask({ type: "text" });
  if (isConcatMode && lastTask) {
    lastTask.raw += " " + raw;
    lastTask.extraTasks.forEach((extraTask) => (extraTask.raw += " " + raw));
    lastTask.status = "waiting";
    putTranslateTaskAtHead(lastTask.id);
    return;
  }
  // Create a new task
  const newTask: TranslateTask = {
    id: `${Zotero.Utilities.randomString()}-${new Date().getTime()}`,
    type,
    raw,
    result: "",
    audio: [],
    service: "",
    candidateServices: [],
    itemId,
    status: "waiting",
    extraTasks: [],
  };

  if (!service) {
    setDefaultService(newTask);
  } else {
    newTask.service = service;
  }

  addon.data.translate.queue.push(newTask);
  // In case window panel requires extra translations
  if (
    type === "text" &&
    addon.data.panel.windowPanel &&
    !addon.data.panel.windowPanel.closed
  ) {
    (getPref("extraEngines") as string)
      .split(",")
      .filter((s) => s)
      .forEach((extraService) =>
        newTask.extraTasks.push({
          id: `${Zotero.Utilities.randomString()}-${new Date().getTime()}`,
          type: "text",
          raw,
          result: "",
          audio: [],
          service: extraService,
          candidateServices: [],
          extraTasks: [],
          itemId,
          status: "waiting",
        }),
      );
  }
  // Keep queue size
  cleanTasks();
  return newTask;
}

export function addTranslateAnnotationTask(
  libraryID: number,
  itemKey: string,
): TranslateTask | undefined;
export function addTranslateAnnotationTask(
  itemID: number,
): TranslateTask | undefined;
export function addTranslateAnnotationTask(
  itemIDOrLibraryID: number,
  itemKey?: string,
) {
  let item: Zotero.Item | false;
  if (itemKey) {
    item = Zotero.Items.getByLibraryAndKey(
      itemIDOrLibraryID,
      itemKey,
    ) as Zotero.Item;
  } else {
    item = Zotero.Items.get(itemIDOrLibraryID);
  }
  if (!item) {
    return;
  }
  return addTranslateTask(item.annotationText, item.id, "annotation");
}

export function addTranslateTitleTask(
  itemId: number,
  skipIfExists: boolean = false,
) {
  // @ts-ignore - Plugin instance is not typed
  const addon = Zotero[config.addonInstance] as Addon;
  const ztoolkit = addon.data.ztoolkit;
  const item = Zotero.Items.get(itemId);
  if (
    item?.isRegularItem() &&
    !(
      skipIfExists &&
      ztoolkit.ExtraField.getExtraField(item, "titleTranslation")
    )
  ) {
    return addTranslateTask(item.getField("title") as string, item.id, "title");
  }
}

export function addTranslateAbstractTask(
  itemId: number,
  skipIfExists: boolean = false,
) {
  // @ts-ignore - Plugin instance is not typed
  const addon = Zotero[config.addonInstance] as Addon;
  const ztoolkit = addon.data.ztoolkit;
  const item = Zotero.Items.get(itemId);
  if (
    item?.isRegularItem() &&
    !(
      skipIfExists &&
      ztoolkit.ExtraField.getExtraField(item, "abstractTranslation")
    )
  ) {
    return addTranslateTask(
      item.getField("abstractNote") as string,
      item.id,
      "abstract",
    );
  }
}

function setDefaultService(task: TranslateTask) {
  // Use wordService(dictSource) for single word translation
  if (
    getPref("enableDict") &&
    task.raw.trim().split(/[^a-zA-Z]+/).length == 1
  ) {
    task.service = getPref("dictSource") as string;
    task.candidateServices.push(getPref("translateSource") as string);
  } else {
    task.service = getPref("translateSource") as string;
  }

  // In case service is still empty
  task.service =
    task.service || addon.data.translate.services.getAllServices()[0].id;
}

function cleanTasks() {
  // @ts-ignore - Plugin instance is not typed
  const addon = Zotero[config.addonInstance] as Addon;

  if (
    addon.data.translate.queue.length > addon.data.translate.maximumQueueLength
  ) {
    addon.data.translate.queue.splice(
      0,
      Math.floor(addon.data.translate.maximumQueueLength / 3),
    );
  }
}

export function getTranslateTasks(count: number) {
  // @ts-ignore - Plugin instance is not typed
  return (Zotero[config.addonInstance] as Addon).data.translate.queue.slice(
    -count,
  );
}

export function getLastTranslateTask<
  K extends keyof TranslateTask,
  V extends TranslateTask[K],
>(conditions?: { [key in K]: V }) {
  // @ts-ignore - Plugin instance is not typed
  const queue = (Zotero[config.addonInstance] as Addon).data.translate.queue;
  let i = queue.length - 1;
  while (i >= 0) {
    const currentTask = queue[i];
    const notMatchConditions =
      conditions &&
      Object.keys(conditions)
        .map((key) => currentTask[key as K] === conditions[key as K])
        .includes(false);
    if (!notMatchConditions) {
      return queue[i];
    }
    i--;
  }
  return undefined;
}

/**
 * Update the task with the latest language settings.
 */
export function updateTranslateTaskLang(task: TranslateTask) {
  if (!task.langfromInferred) {
    task.langfrom = getPref("sourceLanguage") as string;
  }
  task.langto = getPref("targetLanguage") as string;
}

export function putTranslateTaskAtHead(taskId: string) {
  // @ts-ignore - Plugin instance is not typed
  const queue = (Zotero[config.addonInstance] as Addon).data.translate.queue;
  const idx = queue.findIndex((task) => task.id === taskId);
  if (idx >= 0) {
    const targetTask = queue.splice(idx, 1)[0];
    queue.push(targetTask);
    return true;
  }
  return false;
}

export function autoDetectLanguage(item: Zotero.Item | null) {
  if (!item) {
    return {
      fromLanguage: getPref("sourceLanguage") as string,
      toLanguage: getPref("targetLanguage") as string,
    };
  }
  // @ts-ignore - Plugin instance is not typed
  const addon = Zotero[config.addonInstance] as Addon;
  const ztoolkit = addon.data.ztoolkit;
  const topItem = Zotero.Items.getTopLevel([item])[0];
  const fromLanguage = getPref("sourceLanguage") as string;
  const toLanguage = getPref("targetLanguage") as string;
  let detectedFromLanguage = fromLanguage;
  // Use cached source language
  const sourceLanguageCache =
    addon.data.translate.cachedSourceLanguage[item.id];
  if (sourceLanguageCache && sourceLanguageCache !== toLanguage) {
    return {
      fromLanguage: sourceLanguageCache,
      toLanguage,
    };
  }
  let isInferred = false;
  if (getPref("enableAutoDetectLanguage")) {
    if (topItem) {
      let itemLanguage: string =
        // Respect language field
        matchLanguage((topItem.getField("language") as string) || "").code;
      ztoolkit.log("try itemLanguage", itemLanguage);
      if (!itemLanguage) {
        // Respect AbstractNote or Title inferred language
        const inferredLanguage = inferLanguage(
          (topItem.getField("abstractNote") as string) ||
            (topItem.getField("title") as string) ||
            "",
        ).code;
        ztoolkit.log("try inferredLanguage", inferredLanguage);
        if (inferredLanguage) {
          // Update language field so that it can be used in the future
          itemLanguage = inferredLanguage;
          if (topItem.isRegularItem()) {
            topItem.setField("language", fromLanguage);
          }
        }
      }
      if (itemLanguage && ![fromLanguage, toLanguage].includes(itemLanguage)) {
        ztoolkit.log("use autoDetect", itemLanguage);
        // If the item language is not the same as the target/source language, use it
        detectedFromLanguage = itemLanguage;
        isInferred = true;
      }
    }
  }
  return {
    fromLanguage: detectedFromLanguage,
    toLanguage,
    isInferred,
  };
}
