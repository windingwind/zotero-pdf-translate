import { getPref } from "../../utils/prefs";
import {
  getLastTranslateTask,
  TranslateTask,
  TranslateTaskRunner,
} from "../../utils/task";

export class TranslationServices {
  [key: string]: TranslateTaskRunner | unknown;
  constructor() {
    import("./huoshan").then(
      (e) => (this.huoshan = new TranslateTaskRunner(e.default)),
    );
    import("./aliyun").then(
      (e) => (this.aliyun = new TranslateTaskRunner(e.default)),
    );
    import("./baidu").then(
      (e) => (this.baidu = new TranslateTaskRunner(e.default)),
    );
    import("./baidufield").then(
      (e) => (this.baidufield = new TranslateTaskRunner(e.default)),
    );
    import("./bing").then(
      (e) => (this.bing = new TranslateTaskRunner(e.default)),
    );
    import("./NEUniutrans").then(
      (e) => (this.NEUniutrans = new TranslateTaskRunner(e.default)),
    );
    import("./bingdict").then(
      (e) => (this.bingdict = new TranslateTaskRunner(e.default)),
    );
    import("./caiyun").then(
      (e) => (this.caiyun = new TranslateTaskRunner(e.default)),
    );
    import("./cambridgedict").then(
      (e) => (this.cambridgedict = new TranslateTaskRunner(e.default)),
    );
    import("./cnki").then(
      (e) => (this.cnki = new TranslateTaskRunner(e.default)),
    );
    import("./collinsdict").then(
      (e) => (this.collinsdict = new TranslateTaskRunner(e.default)),
    );
    import("./deepl").then((e) => {
      this.deeplfree = new TranslateTaskRunner(e.deeplfree);
      this.deeplpro = new TranslateTaskRunner(e.deeplpro);
    });
    import("./deeplx").then((e) => {
      this.deeplx = new TranslateTaskRunner(e.default);
    });
    import("./deeplcustom").then(
      (e) => (this.deeplcustom = new TranslateTaskRunner(e.default)),
    );
    import("./freedictionaryapi").then(
      (e) => (this.freedictionaryapi = new TranslateTaskRunner(e.default)),
    );
    import("./google").then((e) => {
      this.googleapi = new TranslateTaskRunner(e.googleapi);
      this.google = new TranslateTaskRunner(e.google);
    });
    import("./haici").then(
      (e) => (this.haici = new TranslateTaskRunner(e.default)),
    );
    import("./haicidict").then(
      (e) => (this.haicidict = new TranslateTaskRunner(e.default)),
    );
    import("./microsoft").then(
      (e) => (this.microsoft = new TranslateTaskRunner(e.default)),
    );
    import("./niutrans").then(
      (e) => (this.niutranspro = new TranslateTaskRunner(e.default)),
    );
    import("./openl").then(
      (e) => (this.openl = new TranslateTaskRunner(e.default)),
    );
    import("./tencent").then(
      (e) => (this.tencent = new TranslateTaskRunner(e.default)),
    );
    import("./webliodict").then(
      (e) => (this.webliodict = new TranslateTaskRunner(e.default)),
    );
    import("./xftrans").then(
      (e) => (this.xftrans = new TranslateTaskRunner(e.default)),
    );
    import("./gpt").then((e) => {
      this.chatgpt = new TranslateTaskRunner(e.getLLMService("chatGPT"));
      this.customgpt1 = new TranslateTaskRunner(e.getLLMService("customGPT1"));
      this.customgpt2 = new TranslateTaskRunner(e.getLLMService("customGPT2"));
      this.customgpt3 = new TranslateTaskRunner(e.getLLMService("customGPT3"));
      this.azuregpt = new TranslateTaskRunner(e.azureGPT);
    });
    import("./gemini").then((e) => {
      this.gemini = new TranslateTaskRunner(e.gemini);
    });
    import("./youdao").then(
      (e) => (this.youdao = new TranslateTaskRunner(e.default)),
    );
    import("./youdaodict").then(
      (e) => (this.youdaodict = new TranslateTaskRunner(e.default)),
    );
    import("./youdaozhiyun").then(
      (e) => (this.youdaozhiyun = new TranslateTaskRunner(e.default)),
    );
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
    const splitChar = (getPref("splitChar") as string).trim();
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
