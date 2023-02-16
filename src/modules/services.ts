import { getPref } from "../utils/prefs";
import {
  getLastTranslateTask,
  TranslateTask,
  TranslateTaskRunner,
} from "../utils/translate";

export class TranslationServices {
  [key: string]: TranslateTaskRunner | Function;
  constructor() {
    import("./services/baidu").then(
      (e) => (this.baidu = new TranslateTaskRunner(e.default))
    );
    import("./services/baidufield").then(
      (e) => (this.baidufield = new TranslateTaskRunner(e.default))
    );
    import("./services/bingdict").then(
      (e) => (this.bingdict = new TranslateTaskRunner(e.default))
    );
    import("./services/caiyun").then(
      (e) => (this.caiyun = new TranslateTaskRunner(e.default))
    );
    import("./services/cnki").then(
      (e) => (this.cnki = new TranslateTaskRunner(e.default))
    );
    import("./services/collinsdict").then(
      (e) => (this.collinsdict = new TranslateTaskRunner(e.default))
    );
    import("./services/deepl").then((e) => {
      this.deeplfree = new TranslateTaskRunner(e.deeplfree);
      this.deeplpro = new TranslateTaskRunner(e.deeplpro);
    });
    import("./services/deeplcustom").then(
      (e) => (this.deeplcustom = new TranslateTaskRunner(e.default))
    );
    import("./services/freedictionaryapi").then(
      (e) => (this.freedictionaryapi = new TranslateTaskRunner(e.default))
    );
    import("./services/google").then((e) => {
      this.googleapi = new TranslateTaskRunner(e.googleapi);
      this.google = new TranslateTaskRunner(e.google);
    });
    import("./services/haici").then(
      (e) => (this.haici = new TranslateTaskRunner(e.default))
    );
    import("./services/haicidict").then(
      (e) => (this.haicidict = new TranslateTaskRunner(e.default))
    );
    import("./services/microsoft").then(
      (e) => (this.microsoft = new TranslateTaskRunner(e.default))
    );
    import("./services/niutrans").then(
      (e) => (this.niutranspro = new TranslateTaskRunner(e.default))
    );
    import("./services/openl").then(
      (e) => (this.openl = new TranslateTaskRunner(e.default))
    );
    import("./services/tencent").then(
      (e) => (this.tencent = new TranslateTaskRunner(e.default))
    );
    import("./services/webliodict").then(
      (e) => (this.webliodict = new TranslateTaskRunner(e.default))
    );
    import("./services/xftrans").then(
      (e) => (this.xftrans = new TranslateTaskRunner(e.default))
    );
    import("./services/youdao").then(
      (e) => (this.youdao = new TranslateTaskRunner(e.default))
    );
    import("./services/youdaodict").then(
      (e) => (this.youdaodict = new TranslateTaskRunner(e.default))
    );
    import("./services/youdaozhiyun").then(
      (e) => (this.youdaozhiyun = new TranslateTaskRunner(e.default))
    );
  }

  public async runTranslationTask(
    task?: TranslateTask,
    options: {
      noCheckZoteroItemLanguage?: boolean;
      noDisplay?: boolean;
    } = {}
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
      if (item) {
        const itemLanguage = (
          (item.getField("language") as string) || ""
        ).split("-")[0];
        const disabledLanguages = (
          getPref("disabledLanguages") as string
        ).split(",");
        disabledByItemLanguage = disabledLanguages.includes(itemLanguage);
      }
    }
    if (disabledByItemLanguage) {
      ztoolkit.log("disabledByItemLanguage");
      return false;
    }
    // Remove possible translation results (for annotations).
    task.raw = task.raw.replace(/🔤[\s\S]*🔤/g, "");
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
        })
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
              ).replace(/🔤[\s\S]*🔤/g, "");
              item[
                savePosition === "comment"
                  ? "annotationComment"
                  : "annotationText"
              ] = `${currentText}${
                currentText[currentText.length - 1] === "\n" ? "" : "\n"
              }🔤${task.result}🔤\n`;
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
                task.result
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
                task.result
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
