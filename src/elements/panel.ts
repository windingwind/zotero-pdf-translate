import { config } from "../../package.json";
import { PluginCEBase } from "./base";
import { getPref, setPref } from "../utils/prefs";
import { LANG_CODE } from "../utils/config";
import {
  SECOND_PASS_OFF,
  menuValueToServiceId,
  selectMenuValue,
  serviceIdToMenuValue,
} from "../utils/secondPass";
import {
  addTranslateTask,
  autoDetectLanguage,
  getActiveTextTask,
  getLastTranslateTask,
  putTranslateTaskAtHead,
} from "../utils/task";
import type { TranslationServices } from "../modules/services";

//@ts-expect-error addon instance not typed
const services = Zotero[config.addonInstance].data.translate
  .services as TranslationServices;

export class TranslatorPanel extends PluginCEBase {
  _item: Zotero.Item | null = null;

  _taskID = "";

  _updatingMenus = false;

  get item() {
    return this._item;
  }

  set item(val) {
    this._item = val;
  }

  get content() {
    return this._parseContentID(
      MozXULElement.parseXULToFragment(`
<linkset>
  <html:link rel="localization" href="${config.addonRef}-panel.ftl" />
  <html:link
    rel="stylesheet"
    href="chrome://${config.addonRef}/content/styles/panel.css"
  ></html:link>
</linkset>
<hbox id="engine" align="center">
  <menulist id="services" native="true">
    <menupopup>
      ${services
        .getAllServicesWithType("sentence")
        .map((service) => {
          const customName = services.getServiceNameByID(service.id);
          return `<menuitem label="${customName}" value="${service.id}" />`;
        })
        .join("\n")}
    </menupopup>
  </menulist>
  <menulist id="second-pass-service" native="true" value="${SECOND_PASS_OFF}" data-l10n-id="secondPassService">
    <menupopup>
      <menuitem label="" value="${SECOND_PASS_OFF}" />
      ${services
        .getAllServicesWithType("sentence")
        .map(
          (service) =>
            `<menuitem label="${services.getServiceNameByID(service.id)}" value="${service.id}" />`,
        )
        .join("\n")}
    </menupopup>
  </menulist>
  <button id="translate" data-l10n-id="translate" />
</hbox>
<hbox id="language" align="center">
  <menulist id="langfrom" class="lang-menulist" native="true">
    <menupopup>
      ${LANG_CODE.map((lang) => `<menuitem label="${lang.name}" value="${lang.code}" />`).join("\n")}
    </menupopup>
  </menulist>
  <toolbarbutton id="swap-language" class="icon-button" data-l10n-id="swapLanguage" />
  <menulist id="langto" class="lang-menulist" native="true">
    <menupopup>
      ${LANG_CODE.map((lang) => `<menuitem label="${lang.name}" value="${lang.code}" />`).join("\n")}
    </menupopup>
  </menulist>
</hbox>
<html:div class="separator"></html:div>
<html:div id="text-container" class="editor-container">
  ${
    (getPref("enableMathRendering") as boolean)
      ? `<math-textbox id="raw-text"></math-textbox>`
      : `<editable-text id="raw-text" multiline="true" />`
  }
  <html:div id="resizer" class="draggable-container">
    <html:div class="separator"></html:div>
  </html:div>
  ${
    (getPref("enableMathRendering") as boolean)
      ? `<math-textbox id="result-text"></math-textbox>`
      : `<editable-text id="result-text" multiline="true" />`
  }
</html:div>
<html:div class="separator"></html:div>
<html:div class="options-container">
  <html:div id="auto-container" class="options-grid">
    <html:label class="options-label" data-l10n-id="auto" />
    <html:div class="options-content">
      <checkbox id="auto-trans-selection" native="true" data-l10n-id="autoTranslateSelection" />
      <checkbox id="auto-trans-annotation" native="true" data-l10n-id="autoTranslateAnnotation" />
    </html:div>
  </html:div>
  <html:div id="concat-container" class="options-grid">
    <html:label class="options-label" data-l10n-id="selection" />
    <html:div class="options-content">
      <checkbox id="concat" native="true" data-l10n-id="enableConcat" />
      <button id="clear-concat" data-l10n-id="clearConcat" />
    </html:div>
  </html:div>
  <html:div id="copy-container" class="options-grid" >
    <html:label class="options-label" data-l10n-id="copy" />
    <html:div class="options-content">
      <button id="copy-raw" data-l10n-id="copyRaw" />
      <button id="copy-result" data-l10n-id="copyResult" />
      <button id="copy-both" data-l10n-id="copyBoth" />
    </html:div>
  </html:div>
</html:div>
`),
    );
  }

  init(): void {
    // Services
    const primaryServiceMenu = this._queryID("services") as XUL.MenuList | null;
    primaryServiceMenu?.addEventListener("command", () =>
      this._applyPrimaryMenuSelection(true),
    );

    // Translate
    this._queryID("translate")?.addEventListener("command", () => {
      let task = getLastTranslateTask({ type: "text" });
      if (!task) {
        task = addTranslateTask(
          (
            this._queryID(
              getPref("rawResultOrder") ? "result-text" : "raw-text",
            ) as HTMLTextAreaElement
          )?.value,
        );
      }
      if (!task) {
        return;
      }
      putTranslateTaskAtHead(task.id);
      this._addon.hooks.onTranslate(task, {
        noCheckZoteroItemLanguage: true,
        noCache: true,
      });
    });

    // Language change
    this._queryID("langfrom")?.addEventListener("command", (e) => {
      const newValue = (e.target as XUL.MenuList).value;
      setPref("sourceLanguage", newValue);
      const itemID = this.item?.id;
      if (itemID) {
        this._addon.data.translate.cachedSourceLanguage[Number(itemID)] =
          newValue;
      }
      this._addon.hooks.onReaderTabPanelRefresh();
    });

    this._queryID("swap-language")?.addEventListener("command", () => {
      const langfrom = getPref("sourceLanguage") as string;
      const langto = getPref("targetLanguage") as string;
      setPref("targetLanguage", langfrom);
      setPref("sourceLanguage", langto);
      this._addon.hooks.onReaderTabPanelRefresh();
    });

    this._queryID("langto")?.addEventListener("command", (e) => {
      setPref("targetLanguage", (e.target as XUL.MenuList).value);
      this._addon.hooks.onReaderTabPanelRefresh();
    });

    // Text change
    this._queryID("raw-text")?.addEventListener("input", (e) => {
      let task = getLastTranslateTask({
        id: this._taskID,
      });
      if (!task) {
        task = addTranslateTask(
          (e.target as HTMLTextAreaElement).value,
          this.item?.id,
          "text",
        );
        if (task) this._taskID = task.id;
      }
      if (!task) {
        return;
      }
      const reverseRawResult = getPref("rawResultOrder");
      if (!reverseRawResult) {
        task.raw = (e.target as HTMLTextAreaElement).value;
      } else {
        task.result = (e.target as HTMLTextAreaElement).value;
      }
      putTranslateTaskAtHead(task.id);
    });

    this._queryID("result-text")?.addEventListener("input", (e) => {
      let task = getLastTranslateTask({
        id: this._taskID,
      });
      if (!task) {
        task = addTranslateTask(
          (e.target as HTMLTextAreaElement).value,
          this.item?.id,
          "text",
        );
        if (task) this._taskID = task.id;
      }
      if (!task) {
        return;
      }
      const reverseRawResult = getPref("rawResultOrder");
      if (!reverseRawResult) {
        task.result = (e.target as HTMLTextAreaElement).value;
      } else {
        task.raw = (e.target as HTMLTextAreaElement).value;
      }
      putTranslateTaskAtHead(task.id);
    });

    // Auto translate
    this._queryID("auto-trans-selection")?.addEventListener("command", (e) => {
      setPref("enableAuto", (e.target as XUL.Checkbox).checked);
      this._addon.hooks.onReaderTabPanelRefresh();
    });

    this._queryID("auto-trans-annotation")?.addEventListener("command", (e) => {
      setPref("enableComment", (e.target as XUL.Checkbox).checked);
      this._addon.hooks.onReaderTabPanelRefresh();
    });

    // Secondary translation service. Empty value disables the second pass.
    const secondPassMenu = this._queryID(
      "second-pass-service",
    ) as XUL.MenuList | null;
    secondPassMenu?.addEventListener("command", () =>
      this._applySecondPassMenuSelection(true),
    );
    // Fallback for platforms where command carries a stale value: re-read the
    // actual selection once the popup closes.
    secondPassMenu
      ?.querySelector("menupopup")
      ?.addEventListener("popuphidden", () =>
        this._applySecondPassMenuSelection(false),
      );

    // Concat
    this._queryID("concat")?.addEventListener("command", (e) => {
      this._addon.data.translate.concatCheckbox = (
        e.target as XUL.Checkbox
      ).checked;
      this._addon.hooks.onReaderTabPanelRefresh();
    });

    this._queryID("clear-concat")?.addEventListener("command", () => {
      const task = getLastTranslateTask({ type: "text" });
      if (task) {
        task.raw = "";
        task.result = "";
        task.extraTasks.forEach((t) => {
          t.result = "";
        });
        this._addon.hooks.onReaderTabPanelRefresh();
      }
    });

    // Copy
    this._queryID("copy-raw")?.addEventListener("command", () => {
      const task = getLastTranslateTask({
        id: this._taskID,
      });
      if (!task) {
        return;
      }
      new this._addon.data.ztoolkit.Clipboard()
        .addText(task.raw, "text/plain")
        .copy();
    });

    this._queryID("copy-result")?.addEventListener("command", () => {
      const task = getLastTranslateTask({
        id: this._taskID,
      });
      if (!task) {
        return;
      }
      new this._addon.data.ztoolkit.Clipboard()
        .addText(task.result, "text/plain")
        .copy();
    });

    this._queryID("copy-both")?.addEventListener("command", () => {
      const task = getLastTranslateTask({
        id: this._taskID,
      });
      if (!task) {
        return;
      }
      new this._addon.data.ztoolkit.Clipboard()
        .addText(`${task.raw}\n----\n${task.result}`, "text/plain")
        .copy();
    });

    // Draggable text area
    const resizer = this._queryID("resizer") as HTMLElement;
    const container = this._queryID("text-container") as HTMLElement;
    const rawArea = this._queryID("raw-text") as HTMLElement;
    const resultArea = this._queryID("result-text") as HTMLElement;

    rawArea.style.flex = `${getPref("customRawRatio")} 1 0%`;
    resultArea.style.flex = `${getPref("customResultRatio")} 1 0%`;

    let isDragging = false;
    let containerRect: DOMRect;
    resizer?.addEventListener("mousedown", (e: MouseEvent) => {
      if (e.button !== 0) {
        return;
      }
      isDragging = true;
      e.preventDefault();
      containerRect = container.getBoundingClientRect();
      window.document.addEventListener("mousemove", doDrag);
      window.document.addEventListener("mouseup", (e: MouseEvent) => {
        isDragging = false;
        window.document.removeEventListener("mousemove", doDrag);
      });
    });

    function doDrag(e: MouseEvent) {
      if (!isDragging) {
        return;
      }
      const newRawHeight = e.clientY - containerRect.top;
      const maxRawHeight = containerRect.height - 100 - 13;
      if (newRawHeight >= 100 && newRawHeight <= maxRawHeight) {
        const newResultHeight = containerRect.height - newRawHeight - 13;
        const newRawRatio = (
          newRawHeight / Math.min(newRawHeight, newResultHeight)
        ).toFixed(3);
        const newResultRatio = (
          newResultHeight / Math.min(newRawHeight, newResultHeight)
        ).toFixed(3);
        rawArea.style.flex = `${newRawRatio} 1 0%`;
        resultArea.style.flex = `${newResultRatio} 1 0%`;
        setPref("customRawRatio", newRawRatio);
        setPref("customResultRatio", newResultRatio);
      }
    }

    resizer?.addEventListener("dblclick", (e: MouseEvent) => {
      if (e.button !== 0) {
        return;
      }
      e.preventDefault();
      rawArea.style.flex = "1 1 0%";
      resultArea.style.flex = "1 1 0%";
      setPref("customRawRatio", "1");
      setPref("customResultRatio", "1");
    });
  }

  destroy(): void {}

  private _applyPrimaryMenuSelection(force: boolean) {
    if (this._updatingMenus || !this.isConnected) {
      return;
    }
    const menu = this._queryID("services") as XUL.MenuList | null;
    if (!menu) {
      return;
    }
    const newService = menu.selectedItem?.getAttribute("value") ?? menu.value;
    if (!newService) {
      return;
    }
    this._updatingMenus = true;
    try {
      selectMenuValue(menu, newService);
    } finally {
      this._updatingMenus = false;
    }
    if (!force && newService === (getPref("translateSource") as string)) {
      return;
    }
    setPref("translateSource", newService);
    const data = getActiveTextTask() || getLastTranslateTask({ type: "text" });
    if (!data) {
      this._addon.hooks.onReaderTabPanelRefresh();
      return;
    }
    data.secondPass?.cancel?.();
    data.secondPass = undefined;
    data.service = newService;
    putTranslateTaskAtHead(data.id);
    this._addon.data.popup.activeTaskId = data.id;
    this._addon.hooks.onTranslate(data, {
      noCheckZoteroItemLanguage: true,
      noCache: true,
    });
  }

  private _applySecondPassMenuSelection(force: boolean) {
    if (this._updatingMenus) {
      return;
    }
    if (!this.isConnected) {
      return;
    }
    const menu = this._queryID("second-pass-service") as XUL.MenuList | null;
    if (!menu) {
      return;
    }
    const menuValue =
      menu.selectedItem?.getAttribute("value") ?? menu.value ?? "";
    const serviceId = menuValueToServiceId(menuValue);
    this._updatingMenus = true;
    try {
      selectMenuValue(menu, serviceIdToMenuValue(serviceId));
    } finally {
      this._updatingMenus = false;
    }
    const currentTask = getActiveTextTask();
    const activeSecondPass = currentTask?.secondPass;
    const alreadyActive =
      !!serviceId &&
      activeSecondPass?.service === serviceId &&
      (activeSecondPass.status === "success" ||
        activeSecondPass.status === "processing");
    if (
      !force &&
      serviceId === (getPref("secondPassService") as string) &&
      (alreadyActive || !currentTask)
    ) {
      return;
    }
    setPref("secondPassService", serviceId);
    if (serviceId) {
      if (currentTask) {
        services.rerunSecondPass(currentTask);
      }
    } else {
      // Disabling the feature must also silence a still-running request so it
      // cannot report a failure or overwrite the text after the user opted out.
      currentTask?.secondPass?.cancel?.();
      if (currentTask?.secondPass?.status === "processing") {
        currentTask.secondPass = undefined;
      }
    }
    this._addon.hooks.onReaderTabPanelRefresh();
  }

  /**
   * Filter unconfigured services from the dropdown menu.
   * Hides services that require API keys but haven't been configured.
   */
  _filterUnconfiguredServices() {
    const menuPopups = ["services", "second-pass-service"]
      .map((id) => this._queryID(id)?.querySelector("menupopup"))
      .filter(Boolean) as Element[];
    if (!menuPopups.length) return;

    const hideUnconfigured = getPref("hideUnconfiguredServices") as boolean;
    const unconfiguredIds = hideUnconfigured
      ? services.getUnconfiguredServiceIds()
      : null;

    menuPopups.forEach((menuPopup) => {
      menuPopup.querySelectorAll("menuitem").forEach((item) => {
        const serviceId = item.getAttribute("value");
        (item as HTMLElement).hidden = !!unconfiguredIds?.has(serviceId || "");
      });
    });
  }

  render() {
    const updateHidden = (type: string, pref: string) => {
      const elem = this._queryID(type) as XUL.Box;
      const hidden = !getPref(pref) as boolean;
      elem.hidden = hidden;
      if (
        elem.nextElementSibling?.classList.contains("separator") ||
        elem.nextElementSibling?.classList.contains("draggable-container")
      ) {
        (elem.nextElementSibling as HTMLDivElement).hidden = hidden;
      }
    };
    const setCheckBox = (type: string, checked: boolean) => {
      const elem = this._queryID(type) as XUL.Checkbox;
      elem.checked = checked;
    };
    const setValue = (type: string, value: string) => {
      const elem = this._queryID(type) as XUL.Textbox;
      if (elem.value !== value) {
        elem.value = value;
      }
    };
    const setPalceHolder = (type: string, placeholder: string) => {
      const elem = this._queryID(type) as XUL.Textbox;
      elem.placeholder = placeholder;
    };
    const setTextBoxStyle = (type: string) => {
      const elem = this._queryID(type) as XUL.Textbox;
      elem.style.fontSize = `${getPref("fontSize")}px`;
      elem.style.lineHeight = getPref("lineHeight") as string;
    };

    updateHidden("engine", "showSidebarEngine");
    updateHidden("language", "showSidebarLanguage");
    updateHidden("raw-text", "showSidebarRaw");
    updateHidden("auto-container", "showSidebarSettings");
    updateHidden("concat-container", "showSidebarConcat");
    updateHidden("copy-container", "showSidebarCopy");

    // Filter unconfigured services from dropdown if preference is enabled
    this._filterUnconfiguredServices();

    const { fromLanguage, toLanguage } = autoDetectLanguage(this.item);
    const secondPassService = getPref("secondPassService") as string;
    this._updatingMenus = true;
    try {
      selectMenuValue(
        this._queryID("services") as XUL.MenuList | null,
        getPref("translateSource") as string,
      );
      selectMenuValue(
        this._queryID("langfrom") as XUL.MenuList | null,
        fromLanguage,
      );
      selectMenuValue(
        this._queryID("langto") as XUL.MenuList | null,
        toLanguage,
      );
      selectMenuValue(
        this._queryID("second-pass-service") as XUL.MenuList | null,
        serviceIdToMenuValue(secondPassService),
      );
    } finally {
      this._updatingMenus = false;
    }

    setCheckBox("auto-trans-selection", getPref("enableAuto") as boolean);
    setCheckBox("auto-trans-annotation", getPref("enableComment") as boolean);
    setCheckBox("concat", this._addon.data.translate.concatCheckbox);

    setTextBoxStyle("raw-text");
    setTextBoxStyle("result-text");
    const reverseRawResult = getPref("rawResultOrder");
    setPalceHolder(
      "raw-text",
      reverseRawResult ? "" : "Select or type to translate",
    );
    setPalceHolder(
      "result-text",
      reverseRawResult ? "Select or type to translate" : "",
    );

    // Both the panel and the reader popup follow the same active text task.
    const lastTask = getActiveTextTask();
    if (!lastTask) {
      return;
    }
    // For manually update translation task
    this._taskID = lastTask.id;

    setValue("raw-text", reverseRawResult ? lastTask.result : lastTask.raw);
    setValue("result-text", reverseRawResult ? lastTask.raw : lastTask.result);
  }
}
