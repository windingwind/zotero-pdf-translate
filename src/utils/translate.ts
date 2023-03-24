import { getService, SecretValidateResult, SERVICES } from "./config";
import { gptStatusCallback } from "./gptModels";
import { getString } from "./locale";
import { niutransStatusCallback } from "./niuTransLogin";
import { getPref, setPref } from "./prefs";

export interface TranslateTask {
  /**
   * Task id.
   */
  id: string;
  /**
   * Task type.
   */
  type: "text" | "annotation" | "title" | "abstract" | "custom";
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
}

export type TranslateTaskProcessor = (
  data: Required<TranslateTask>
) => Promise<void> | void;

export class TranslateTaskRunner {
  protected processor: TranslateTaskProcessor;
  constructor(processor: TranslateTaskProcessor) {
    this.processor = processor;
  }

  public async run(data: TranslateTask) {
    data.langfrom = getPref("sourceLanguage") as string;
    data.langto = getPref("targetLanguage") as string;
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
  }

  protected makeErrorInfo(serviceId: string, detail: string) {
    return `${getString("service.errorPrefix")} ${getString(
      `service.${serviceId}`
    )}\n\n${detail}`;
  }
}

export function addTranslateTask(
  raw: string,
  itemId?: number,
  type?: TranslateTask["type"],
  service?: string
) {
  if (!raw) {
    return;
  }
  type = type || "text";
  // Filter raw string
  raw = raw.replace(/[\u0000-\u001F\u007F-\u009F]/gu, " ").normalize("NFKC");

  // Append raw text to last task's raw if in concat mode
  const isConcatMode =
    type === "text" &&
    (addon.data.translate.concatCheckbox || addon.data.translate.concatKey);
  const lastTask = getLastTranslateTask({ type: "text" });
  if (isConcatMode && lastTask) {
    lastTask.raw += " " + raw;
    lastTask.extraTasks.forEach((extraTask) => (extraTask.raw += " " + raw));
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
        })
      );
  }
  // Keep queue size
  cleanTasks();
  return newTask;
}

export function addTranslateAnnotationTask(itemId: number) {
  const item = Zotero.Items.get(itemId);
  if (!item) {
    return;
  }
  return addTranslateTask(item.annotationText, item.id, "annotation");
}

export function addTranslateTitleTask(
  itemId: number,
  skipIfExists: boolean = false
) {
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
  skipIfExists: boolean = false
) {
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
      "abstract"
    );
  }
}

function setDefaultService(task: TranslateTask) {
  // Use wordService(dictSource) for single word translation
  if (
    getPref("enableDict") &&
    task.raw.trim().split(/[^a-z,A-Z]+/).length == 1
  ) {
    task.service = getPref("dictSource") as string;
    task.candidateServices.push(getPref("translateSource") as string);
  } else {
    task.service = getPref("translateSource") as string;
  }

  // In case service is still empty
  task.service = task.service || SERVICES[0].id;
}

function cleanTasks() {
  if (
    addon.data.translate.queue.length > addon.data.translate.maximumQueueLength
  ) {
    addon.data.translate.queue.splice(
      0,
      Math.floor(addon.data.translate.maximumQueueLength / 3)
    );
  }
}

export function getTranslateTasks(count: number) {
  return addon.data.translate.queue.slice(-count);
}

export function getLastTranslateTask<
  K extends keyof TranslateTask,
  V extends TranslateTask[K]
>(conditions?: { [key in K]: V }) {
  const queue = addon.data.translate.queue;
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

export function putTranslateTaskAtHead(taskId: string) {
  const queue = addon.data.translate.queue;
  const idx = queue.findIndex((task) => task.id === taskId);
  if (idx >= 0) {
    const targetTask = queue.splice(idx, 1)[0];
    queue.push(targetTask);
    return true;
  }
  return false;
}

export function getServiceSecret(serviceId: string) {
  try {
    return JSON.parse(getPref("secretObj") as string)[serviceId] || "";
  } catch (e) {
    setPref("secretObj", "{}");
    return "";
  }
}

export function setServiceSecret(serviceId: string, secret: string) {
  let secrets;
  try {
    secrets = JSON.parse(getPref("secretObj") as string) || {};
  } catch (e) {
    secrets = {};
  }
  secrets[serviceId] = secret;
  setPref("secretObj", JSON.stringify(secrets));
}

export function validateServiceSecret(
  serviceId: string,
  validateCallback?: (result: SecretValidateResult) => void
): SecretValidateResult {
  const secret = getServiceSecret(serviceId);
  const validator = getService(serviceId).secretValidator;
  if (!validator) {
    return { secret, status: true, info: "" };
  }
  const validateResult = validator(secret);
  if (validateCallback) {
    validateCallback(validateResult);
  }
  return validateResult;
}

export const secretStatusButtonData: {
  [key: string]: {
    labels: { [_k in "pass" | "fail"]: string };
    callback(status: boolean): void;
  };
} = {
  niutranspro: {
    labels: {
      pass: "service.niutranspro.secret.pass",
      fail: "service.niutranspro.secret.fail",
    },
    callback: niutransStatusCallback,
  },
  deeplcustom: {
    labels: {
      pass: "service.deeplcustom.secret.pass",
      fail: "service.deeplcustom.secret.fail",
    },
    callback: function () {
      Zotero.launchURL(
        "https://github.com/KyleChoy/zotero-pdf-translate/blob/CustomDeepL/README.md"
      );
    },
  },
  gpt: {
    labels: {
      pass: "service.gpt.secret.pass",
      fail: "service.gpt.secret.fail",
    },
    callback: gptStatusCallback,
  },
};
