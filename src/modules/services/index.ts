import { TranslateService } from "./base";
import {
  getString,
  getPref,
  getLastTranslateTask,
  getActiveTextTask,
  putTranslateTaskAtHead,
  sanitizeTaskForLog,
  TranslateTask,
  TranslateTaskRunner,
  stripEmptyLines,
  updateTranslateTaskLang,
} from "../../utils";

import { Aliyun } from "./aliyun";
import { Tencent } from "./tencent";
import { ChatGPT, customGPT1, customGPT2, customGPT3, azureGPT } from "./gpt";
import { Baidu } from "./baidu";
import { BaiduField } from "./baidufield";
import { Bing } from "./bing";
import { BingDict } from "./bingdict";
import { Caiyun } from "./caiyun";
import { CambridgeDict } from "./cambridgedict";
import { Claude } from "./claude";
import { Cnki } from "./cnki";
import { CollinsDict } from "./collinsdict";
import { DeeplFree, DeeplPro } from "./deepl";
import { FreeDictionaryAPI } from "./freedictionaryapi";
import { Gemini } from "./gemini";
import { Google, GoogleAPI } from "./google";
import { Haici } from "./haici";
import { HaiciDict } from "./haicidict";
import { GramotaDict } from "./gramotadict";
import { Huoshan } from "./huoshan";
import { HuoshanWeb } from "./huoshanweb";
import { Iciba } from "./iciba";
import { LibreTranslate } from "./libretranslate";
import { Microsoft } from "./microsoft";
import { Mtranserver } from "./mtranserver";
import { MyMemory } from "./mymemory";
import { Niutrans } from "./niutrans";
import { Nllb } from "./nllb";
import { Openl } from "./openl";
import { Pot } from "./pot";
import { QwenMT } from "./qwenmt";
import { WeblioDict } from "./webliodict";
import { WordsTalk } from "./wordstalk";
import { XFfrans } from "./xftrans";
import { TencentTransmart } from "./tencenttransmart";
import { Youdao } from "./youdao";
import { YoudaoDict } from "./youdaodict";
import { YoudaoZhiyun } from "./youdaozhiyun";
import { YoudaoZhiyunLLM } from "./youdaozhiyunllm";
import { DeepLCustom } from "./deeplcustom";
import { DeepLX } from "./deeplx";

const register: TranslateService[] = [
  Aliyun,
  Baidu,
  BaiduField,
  Bing,
  BingDict,
  Caiyun,
  CambridgeDict,
  Claude,
  Cnki,
  CollinsDict,
  DeeplFree,
  DeeplPro,
  DeepLCustom,
  DeepLX,
  FreeDictionaryAPI,
  Gemini,
  GramotaDict,
  Google,
  GoogleAPI,
  ChatGPT,
  customGPT1,
  customGPT2,
  customGPT3,
  azureGPT,
  Haici,
  HaiciDict,
  Huoshan,
  HuoshanWeb,
  Iciba,
  LibreTranslate,
  Microsoft,
  Mtranserver,
  MyMemory,
  Niutrans,
  Nllb,
  Openl,
  Pot,
  QwenMT,
  Tencent,
  TencentTransmart,
  WeblioDict,
  WordsTalk,
  XFfrans,
  Youdao,
  YoudaoDict,
  YoudaoZhiyun,
  YoudaoZhiyunLLM,
];

export class TranslationServices {
  #services: readonly TranslateService[] = Object.freeze(
    this.sortServices(register),
  );

  /**
   * In-flight secondary pass requests, keyed by service/item/language/raw.
   * Sharing the promise prevents duplicated AI requests when the user selects
   * the same text again before the first one finishes.
   */
  #secondPassInFlight = new Map<string, Promise<TranslateTask>>();

  /**
   * Sort the TranslateService list by the following rules:
   * 1. Free and no-config services (no secret, no config) come first.
   * 2. All other services are sorted by `id` in ascending order (case-insensitive).
   * 3. Services whose `id` starts with "custom" are placed last
   *    (sorted by `id` in ascending order within this group).
   */
  private sortServices<T extends TranslateService>(services: T[]) {
    return services.sort((a, b) => {
      const rank = (s: T) => {
        const needsSecret = !!s.defaultSecret || !!s.secretValidator;
        const hasConfig = !!s.config;
        const needExternalConfig = s.requireExternalConfig;

        // Rank for sentence services
        if (s.type === "sentence") {
          // Group 4: "custom" at the start → last
          if (s.id.startsWith("custom")) return 3;

          // Group 1: Free sentence services (no secret, no external config)
          if (!needsSecret && !needExternalConfig) return 0;

          // Group 2: No-secret but requires external config
          if (!needsSecret && needExternalConfig) return 1;

          // Group 3: Needs secret but no config
          if (needsSecret && !hasConfig) return 2;

          // Default (Sentence service needs secret and has config) — also rank 2
          return 2;
        }
        // Rank for word services
        else {
          // Default //TODO Modify it if necessary in the future
          return 0;
        }
      };

      const ra = rank(a);
      const rb = rank(b);

      if (ra !== rb) return ra - rb;
      return a.id.localeCompare(b.id);
    });
  }

  public getServiceById(id: string): TranslateService | undefined {
    return this.#services.find((service) => service.id === id);
  }

  public getAllServices(): TranslateService[] {
    return [...this.#services];
  }

  public getAllServicesWithType(type: string): TranslateService[] {
    return this.getAllServices().filter((service) => service.type === type);
  }

  public getServiceNameByID(id: string): string {
    const baseName =
      (getPref(`renameServices.${id}`) as string) || getString(`service-${id}`);
    const service = this.getServiceById(id);
    if (
      !!service?.defaultSecret ||
      !!service?.secretValidator ||
      id.startsWith("custom")
    ) {
      return baseName + "🗝️";
    }
    if (service?.requireExternalConfig) {
      return baseName + "📍";
    }
    return baseName;
  }

  public getAllServiceNames(): string[] {
    return this.getAllServices().map((service) =>
      this.getServiceNameByID(service.id),
    );
  }

  public getAllServiceNamesWithType(type: string): string[] {
    return this.getAllServicesWithType(type).map((service) =>
      this.getServiceNameByID(service.id),
    );
  }

  /**
   * Whether a service requires an API key/secret to work.
   */
  private serviceNeedsSecret(service: TranslateService) {
    return (
      !!service.defaultSecret ||
      !!service.secretValidator ||
      // customGPT1 uses an opaque ID; customGPT2/3 keep the pref-style ID.
      service.id === "customgpt1" ||
      service.id.startsWith("custom")
    );
  }

  /**
   * Get the set of unconfigured service IDs.
   * A service is unconfigured if it requires a secret but none is set or validation fails.
   * @returns Set of service IDs that are not configured
   */
  public getUnconfiguredServiceIds(): Set<string> {
    const unconfigured = new Set<string>();

    let secrets: Record<string, string> = {};
    try {
      secrets = JSON.parse((getPref("secretObj") as string) || "{}");
    } catch {
      secrets = {};
    }

    for (const service of this.#services) {
      if (!this.serviceNeedsSecret(service)) continue;

      const secret = secrets[service.id] || "";
      if (!secret) {
        unconfigured.add(service.id);
        continue;
      }

      if (service.secretValidator) {
        try {
          if (!service.secretValidator(secret).status) {
            unconfigured.add(service.id);
          }
        } catch {
          // Validation error - treat as configured
        }
      }
    }

    return unconfigured;
  }

  public async runTranslationTask(
    task?: TranslateTask,
    options: {
      noCheckZoteroItemLanguage?: boolean;
      noDisplay?: boolean;
      noCache?: boolean;
      noSecondPass?: boolean;
    } = {},
  ): Promise<boolean> {
    ztoolkit.log("runTranslationTask", options);
    const { noCache, noCheckZoteroItemLanguage, noDisplay } = options;

    task = task || getLastTranslateTask();
    if (!task || !task.raw) {
      ztoolkit.log("skipped empty");
      return false;
    }
    if (!noDisplay && task.type === "text") {
      // Keep popup and item-pane rendering on the task the user just
      // translated, even if other text tasks are queued.
      addon.data.popup.activeTaskId = task.id;
    }
    task.status = "processing" as TranslateTask["status"];
    // Check whether item language is in disabled languages list
    let disabledByItemLanguage = false;
    if (!noCheckZoteroItemLanguage && task.itemId) {
      const taskItem = Zotero.Items.get(task.itemId);
      const item = taskItem && Zotero.Items.getTopLevel([taskItem])[0];
      if (item && task.type !== "custom") {
        const itemLanguage = getPref("autoDetectLanguage")
          ? task.langfrom
          : ((item.getField("language") as string) || "").split("-")[0];
        const disabledLanguages = (
          getPref("disabledLanguages") as string
        ).split(",");
        disabledByItemLanguage =
          disabledLanguages.length > 0 &&
          !!itemLanguage &&
          disabledLanguages.includes(itemLanguage);
      }
    }
    if (disabledByItemLanguage) {
      ztoolkit.log("disabledByItemLanguage");
      return false;
    }
    // Remove possible translation results (for annotations).
    const splitChar = (getPref("splitChar") as string).trim();
    // /🔤[^🔤]*🔤/g
    const regex =
      splitChar === ""
        ? ""
        : new RegExp(`${splitChar}[^${splitChar}]*${splitChar}`, "g");
    task.raw = task.raw.replace(regex, "");
    task.result = "";
    // Keep languages current before the cache lookup and the secondary pass;
    // otherwise a re-translation after changing the target language could
    // request the secondary service with the previous language.
    if (task.processed) {
      updateTranslateTaskLang(task);
    }
    // The raw text changed (concat mode or manual edit): drop any result that
    // belongs to an older selection.
    if (task.secondPass && task.secondPass.raw !== task.raw) {
      task.secondPass = undefined;
    }
    // Display raw
    if (!noDisplay) {
      addon.api.getTemporaryRefreshHandler()();
    }

    let cacheHit = false;
    if (!noCache) {
      // Check cache
      // A new task has no language yet; its target is the current preference.
      // Without this, switching the target language could return a cached
      // translation in the previous language.
      const cacheLangto = task.langto || (getPref("targetLanguage") as string);
      const cachedTask = addon.data.translate.queue.findLast((_t) => {
        return (
          _t.status === "success" &&
          typeof _t.result === "string" &&
          _t.result.trim().length > 0 &&
          _t.raw === task!.raw &&
          _t.service === task!.service &&
          (!task.langfrom || _t.langfrom === task.langfrom) &&
          (!cacheLangto || _t.langto === cacheLangto)
        );
      });

      if (cachedTask) {
        cacheHit = true;
        ztoolkit.log("cache hit", sanitizeTaskForLog(cachedTask));
        task.audio = cachedTask.audio;
        task.result = cachedTask.result;
        task.status = "success";
        if (cachedTask.secondPass?.status === "success") {
          task.secondPass = { ...cachedTask.secondPass, requestID: "cache" };
        }

        if (!noDisplay) {
          addon.api.getTemporaryRefreshHandler()();
        }
      }
    }

    this.maybeStartSecondPass(task, options);

    if (!cacheHit) {
      // Get task service
      const service = this.getServiceById(task.service);
      if (!service) {
        task.result = `${task.service} is not implemented.`;
        task.status = "fail";
        return false;
      }

      // Run task
      const runner = new TranslateTaskRunner(service.translate);
      await runner.run(task);

      // Apply strip empty lines if enabled
      const stripEnabled = getPref("stripEmptyLines") as boolean;
      if (stripEnabled && task.result) {
        task.result = stripEmptyLines(task.result, true);
      }

      const resultRegex = getPref("resultRegex") as string;
      if (resultRegex) {
        try {
          const regex = new RegExp(resultRegex, "g");
          // Remove all matches
          task.result = task.result.replace(regex, "");
        } catch (e) {
          ztoolkit.log("Invalid result regex", e);
          task.result = `Invalid result regex: ${resultRegex}. Please check settings > Translate > Advanced > Result Regex.`;
        }
      }

      // Treat an empty translation as a failure,
      // so configured candidate services can be tried.
      if (task.status === "success" && !task.result?.trim()) {
        ztoolkit.log("Empty translation result; treating as failure", {
          service: task.service,
          raw: task.raw,
        });

        task.result = "";
        task.status = "fail";
      }

      // Run extra tasks. Do not wait.
      if (task.extraTasks?.length) {
        Promise.all(
          task.extraTasks.map((extraTask) => {
            return this.runTranslationTask(extraTask, {
              noCheckZoteroItemLanguage,
              noDisplay: true,
            });
          }),
        ).then(() => {
          addon.hooks.onReaderTabPanelRefresh();
        });
      }
      // Try candidate services if current run fails
      if (task.status === "fail" && task.candidateServices.length > 0) {
        task.service = task.candidateServices.shift()!;
        task.status = "waiting";
        return await this.runTranslationTask(task, options);
      } else {
        // Display result
        if (!noDisplay) {
          addon.api.getTemporaryRefreshHandler()();
        }
      }
    }

    if (this.applySecondPassResult(task) && !noDisplay) {
      addon.api.getTemporaryRefreshHandler()();
    }

    const success = task.status === "success";
    const item = Zotero.Items.get(task.itemId!);
    // Data storage for corresponding types
    if (success) {
      switch (task.type) {
        case "annotation":
          {
            if (item) {
              const savePosition = getPref("annotationTranslationPosition") as
                "comment" | "body";
              const savePositionInBody = getPref(
                "annotationTranslationPositionInBody",
              ) as "before" | "after";
              const currentText = (
                (savePosition === "comment"
                  ? item.annotationComment
                  : item.annotationText) || ""
              ).replace(regex, "");
              const translationText = `${splitChar}${task.result}${splitChar}\n`;
              let text = `${
                currentText[currentText.length - 1] === "\n" ? "" : "\n"
              }${translationText}`;
              if (splitChar !== "") {
                text =
                  savePosition === "body" && savePositionInBody === "before"
                    ? `${translationText}${currentText}`
                    : `${currentText}${text}`;
              }
              item[
                savePosition === "comment"
                  ? "annotationComment"
                  : "annotationText"
              ] = text;

              // Auto tag
              const enableAutoTag = getPref(
                "enableAutoTagAnnotation",
              ) as boolean;
              if (enableAutoTag) {
                const tagContent = getPref("annotationTagContent") as string;
                if (tagContent && tagContent.trim()) {
                  const tag = tagContent.trim();
                  // Check if the tag already exists
                  const existingTags = item.getTags();
                  const tagExists = existingTags.some(
                    (existingTag) => existingTag.tag === tag,
                  );

                  if (!tagExists) {
                    item.addTag(tag);
                  }
                }
              }
              item.saveTx();
            }
          }
          break;
        case "title":
          {
            if (item) {
              ztoolkit.ExtraField.setExtraField(
                item,
                "titleTranslation",
                task.result,
              );
              item.saveTx();
            }
          }
          break;
        case "abstract":
          {
            if (item) {
              ztoolkit.ExtraField.setExtraField(
                item,
                "abstractTranslation",
                // A dirty workaround to make it collapsible on Zotero 6
                task.result,
              );
              item.saveTx();
            }
          }
          break;
        default:
          break;
      }
    }
    return success;
  }

  /**
   * Re-run only the secondary pass for a task (or the latest text task).
   *
   * Used when the user switches the secondary service: the existing
   * translation stays visible until the new result arrives, then it is
   * silently replaced. No extra click on Translate is required.
   */
  public rerunSecondPass(task?: TranslateTask) {
    task = task || getActiveTextTask();
    if (!task || task.type !== "text" || !task.raw.trim()) {
      return;
    }
    const serviceId = getPref("secondPassService") as string;
    if (!serviceId) {
      return;
    }
    if (!this.getServiceById(serviceId)) {
      this.notifySecondPass("second-pass-unavailable");
      return;
    }
    // Selecting the primary service for the second pass is redundant.
    if (serviceId === task.service) {
      return;
    }
    if (this.getUnconfiguredServiceIds().has(serviceId)) {
      this.notifySecondPass("second-pass-unavailable");
      return;
    }
    // Invalidate the previous request/result so the new service is queried.
    // Restore it when no new request could be started (e.g. the selected
    // service needs a key that is not configured).
    const previous = task.secondPass;
    if (previous) {
      previous.cancel?.();
      previous.notify = false;
    }
    task.secondPass = undefined;
    if (!this.maybeStartSecondPass(task, {}, true)) {
      task.secondPass = previous ? { ...previous, status: "fail" } : undefined;
      return;
    }
    // The popup and the panel both read the latest text task. Make the task
    // the user is re-translating the latest one so the refreshed popup shows
    // this result instead of an older entry.
    if (!putTranslateTaskAtHead(task.id)) {
      addon.data.translate.queue.push(task);
    }
    addon.data.popup.activeTaskId = task.id;
  }

  /**
   * Start the optional secondary pass for an interactive text task.
   *
   * The primary (fast) translation is displayed immediately; the secondary
   * result replaces it once ready. Failures are silent by design.
   */
  private maybeStartSecondPass(
    task: TranslateTask,
    options: { noDisplay?: boolean; noSecondPass?: boolean },
    notify = false,
  ): boolean {
    if (options.noDisplay || options.noSecondPass) {
      return false;
    }
    if (task.type !== "text") {
      return false;
    }
    // Single-word lookups use a dictionary service, whose definitions,
    // phonetics and audio are richer than a plain secondary translation.
    if (this.getServiceById(task.service)?.type === "word") {
      return false;
    }
    const serviceId = getPref("secondPassService") as string;
    if (!serviceId || serviceId === task.service) {
      return false;
    }
    // Already replaced by a result from the same secondary service.
    if (
      task.secondPass?.status === "success" &&
      task.secondPass.service === serviceId
    ) {
      return false;
    }
    const service = this.getServiceById(serviceId);
    if (!service) {
      return false;
    }
    // Do not fire requests that are known to fail because no valid key is set.
    if (this.getUnconfiguredServiceIds().has(serviceId)) {
      return false;
    }
    if (task.raw.trim().length < 2) {
      return false;
    }

    const requestID = `${task.id}-${Zotero.Utilities.randomString(6)}`;
    let settled = false;
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      settle("fail", undefined);
    }, 60000);
    const settle = (
      status: "success" | "fail",
      result: TranslateTask | undefined,
    ) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      const current = task.secondPass;
      if (!current || current.requestID !== requestID) return;
      if (status === "success" && result) {
        this.applySecondPass(task, result, requestID);
      } else {
        current.status = "fail";
        if (current.notify && getActiveTextTask()?.id === task.id) {
          this.notifySecondPass(
            timedOut ? "second-pass-timeout" : "second-pass-failed",
          );
        }
      }
    };
    task.secondPass = {
      service: serviceId,
      requestID,
      raw: task.raw,
      status: "processing",
      notify,
      cancel: () => {
        settled = true;
        clearTimeout(timeoutId);
      },
    };

    const secondary: TranslateTask = {
      id: requestID,
      // Use "custom" so streaming services do not steal the global refresh
      // tick or render partial secondary results before the final swap.
      type: "custom",
      raw: task.raw,
      result: "",
      audio: [],
      service: serviceId,
      candidateServices: [],
      itemId: task.itemId,
      status: "waiting",
      extraTasks: [],
      langfrom: task.langfrom,
      langto: task.langto || (getPref("targetLanguage") as string),
      langfromInferred: task.langfromInferred,
      silent: true,
    };

    // Share one request for identical selections so that quickly selecting
    // the same text twice does not double the AI cost.
    const key = [
      serviceId,
      task.itemId ?? -1,
      task.langfrom || (getPref("sourceLanguage") as string),
      task.langto || (getPref("targetLanguage") as string),
      task.raw,
    ].join("|");
    let pending = this.#secondPassInFlight.get(key);
    if (!pending) {
      pending = (async () => {
        await this.runTranslationTask(secondary, {
          noDisplay: true,
          noSecondPass: true,
        });
        return secondary;
      })();
      this.#secondPassInFlight.set(key, pending);
      void pending.then(
        () => this.#secondPassInFlight.delete(key),
        () => this.#secondPassInFlight.delete(key),
      );
    }
    void pending
      .then((result) => settle("success", result))
      .catch((e) => {
        ztoolkit.log("second pass failed", e);
        settle("fail", undefined);
      });
    return true;
  }

  private notifySecondPass(
    messageId:
      "second-pass-failed" | "second-pass-timeout" | "second-pass-unavailable",
  ) {
    try {
      new ztoolkit.ProgressWindow(addon.data.config.addonName)
        .createLine({
          text: getString(messageId),
          progress: 100,
          type: "fail",
        })
        .show();
    } catch (e) {
      ztoolkit.log("second pass notification failed", e);
    }
  }

  private applySecondPass(
    task: TranslateTask,
    secondary: TranslateTask,
    requestID: string,
  ) {
    const secondPass = task.secondPass;
    if (!secondPass || secondPass.requestID !== requestID) {
      return;
    }
    // The user kept selecting (concat mode) or edited the text meanwhile.
    if (task.raw !== secondary.raw) {
      secondPass.status = "fail";
      return;
    }
    if (secondary.status !== "success" || !secondary.result?.trim()) {
      secondPass.status = "fail";
      if (secondPass.notify && getActiveTextTask()?.id === task.id) {
        this.notifySecondPass("second-pass-failed");
      }
      return;
    }
    secondPass.status = "success";
    secondPass.result = secondary.result;
    // While the primary request is still running, the result is applied when
    // that request finishes; otherwise replace the visible text right away.
    if (task.status !== "processing" && task.status !== "waiting") {
      if (this.applySecondPassResult(task)) {
        addon.hooks.onReaderPopupRefresh();
        addon.hooks.onReaderTabPanelRefresh();
      }
    }
  }

  private applySecondPassResult(task: TranslateTask) {
    const secondPass = task.secondPass;
    if (!secondPass || secondPass.status !== "success" || !secondPass.result) {
      return false;
    }
    if (secondPass.raw !== task.raw) {
      return false;
    }
    if (task.result === secondPass.result) {
      return false;
    }
    task.result = secondPass.result;
    task.status = "success";
    return true;
  }
}

export const services = new TranslationServices();
