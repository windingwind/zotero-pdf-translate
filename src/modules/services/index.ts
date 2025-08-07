import { getPref } from "../../utils/prefs";
import {
  getLastTranslateTask,
  TranslateTask,
  TranslateTaskRunner,
} from "../../utils/task";
import { stripEmptyLines } from "../../utils/str";

// import { AliyunTranslationService } from "./aliyun";
import { TencentTranslationService } from "./tencent";
// import { YoudaoZhiyunLLMService } from "./youdaozhiyunllm";
import { gpt, customGPT1, customGPT2, customGPT3, azureGPT } from "./gpt-2";
import { TranslationService } from "./base";

export const services: TranslationService[] = [
  // AliyunTranslationService,
  // YoudaoZhiyunLLMService,
  TencentTranslationService,
  gpt,
  customGPT1,
  customGPT2,
  customGPT3,
  azureGPT,
];

export class TranslationServices {
  public getServiceById(id: string) {
    return services.find((service) => service.id === id);
  }

  public async runTranslationTask(
    task?: TranslateTask,
    options: {
      noCheckZoteroItemLanguage?: boolean;
      noDisplay?: boolean;
      noCache?: boolean;
    } = {},
  ): Promise<boolean> {
    ztoolkit.log("runTranslationTask", options);
    const { noCache, noCheckZoteroItemLanguage, noDisplay } = options;

    task = task || getLastTranslateTask();
    if (!task || !task.raw) {
      ztoolkit.log("skipped empty");
      return false;
    }
    task.status = "processing" as TranslateTask["status"];
    // Check whether item language is in disabled languages list
    let disabledByItemLanguage = false;
    if (!noCheckZoteroItemLanguage && task.itemId) {
      const item = Zotero.Items.getTopLevel([Zotero.Items.get(task.itemId)])[0];
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
    // /簠[^簠]*簠/g
    const regex =
      splitChar === ""
        ? ""
        : new RegExp(`${splitChar}[^${splitChar}]*${splitChar}`, "g");
    task.raw = task.raw.replace(regex, "");
    task.result = "";
    // Display raw
    if (!noDisplay) {
      addon.api.getTemporaryRefreshHandler()();
    }

    let cacheHit = false;
    if (!noCache) {
      // Check cache
      const cachedTask = addon.data.translate.queue.findLast((_t) => {
        return (
          _t.status === "success" &&
          _t.raw === task!.raw &&
          _t.service === task!.service &&
          (!task.langfrom || _t.langfrom === task.langfrom) &&
          (!task.langto || _t.langto === task.langto)
        );
      });

      if (cachedTask) {
        cacheHit = true;
        ztoolkit.log("cache hit", cachedTask);
        task.result = cachedTask.result;
        task.status = "success";

        if (!noDisplay) {
          addon.api.getTemporaryRefreshHandler()();
        }
      }
    }

    if (!cacheHit) {
      // Get task service
      const service = services.find((s) => s.id == task.service);
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

    const success = task.status === "success";
    const item = Zotero.Items.get(task.itemId!);
    // Data storage for corresponding types
    if (success) {
      switch (task.type) {
        case "annotation":
          {
            if (item) {
              const savePosition = getPref("annotationTranslationPosition") as
                | "comment"
                | "body";
              const currentText = (
                (savePosition === "comment"
                  ? item.annotationComment
                  : item.annotationText) || ""
              ).replace(regex, "");
              let text = `${
                currentText[currentText.length - 1] === "\n" ? "" : "\n"
              }${splitChar}${task.result}${splitChar}\n`;
              text = splitChar === "" ? text : `${currentText}${text}`;
              item[
                savePosition === "comment"
                  ? "annotationComment"
                  : "annotationText"
              ] = text;
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
}
