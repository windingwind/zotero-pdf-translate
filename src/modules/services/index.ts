import { getPref } from "../../utils/prefs";
import {
  getLastTranslateTask,
  TranslateTask,
  TranslateTaskRunner,
} from "../../utils/task";

export class TranslationServices {
  [key: string]: TranslateTaskRunner | unknown;
  constructor() {
    import("./deepl").then((e) => {
      this.deeplfree = new TranslateTaskRunner(e.deeplfree);
      this.deeplpro = new TranslateTaskRunner(e.deeplpro);
    });
    import("./google").then((e) => {
      this.googleapi = new TranslateTaskRunner(e.googleapi);
      this.google = new TranslateTaskRunner(e.google);
    });
    import("./gpt").then((e) => {
      this.chatgpt = new TranslateTaskRunner(e.chatGPT);
    });
  }

  public async runTranslationTask(
    task?: TranslateTask,
    options: {
      noCheckZoteroItemLanguage?: boolean;
      noDisplay?: boolean;
    } = {},
  ): Promise<boolean> {
    ztoolkit.log("runTranslationTask", options);
    task = task || getLastTranslateTask();
    if (!task || !task.raw) {
      ztoolkit.log("skipped empty");
      return false;
    }
    task.status = "processing" as TranslateTask["status"];
    // Check whether item language is in disabled languages list
    let disabledByItemLanguage = false;
    if (!options.noCheckZoteroItemLanguage && task.itemId) {
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
    const splitChar = task.raw.includes(getPref("splitChar") as string)
      ? ""
      : getPref("splitChar");
    // /🔤[^🔤]*🔤/g
    const regex =
      splitChar === ""
        ? ""
        : new RegExp(`${splitChar}[^${splitChar}]*${splitChar}`, "g");
    task.raw = task.raw.replace(regex, "");
    task.result = "";
    // Display raw
    if (!options.noDisplay) {
      addon.hooks.onReaderPopupRefresh();
      addon.hooks.onReaderTabPanelRefresh();
    }
    // Get task runner
    const runner = this[task.service] as TranslateTaskRunner;
    if (!runner) {
      task.result = `${task.service} is not implemented.`;
      task.status = "fail";
      return false;
    }
    // Run task
    await runner.run(task);
    // Run extra tasks. Do not wait.
    if (task.extraTasks?.length) {
      Promise.all(
        task.extraTasks.map((extraTask) => {
          return this.runTranslationTask(extraTask, {
            noCheckZoteroItemLanguage: options.noCheckZoteroItemLanguage,
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
      if (!options.noDisplay) {
        addon.hooks.onReaderPopupRefresh();
        addon.hooks.onReaderTabPanelRefresh();
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
              let text = `${currentText[currentText.length - 1] === "\n" ? "" : "\n"
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
                ztoolkit.isZotero7() ? task.result : " " + task.result,
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
