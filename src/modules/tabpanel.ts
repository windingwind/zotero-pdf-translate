import { getString } from "../utils/locale";
import { config } from "../../package.json";
import { LANG_CODE, SERVICES } from "../utils/config";
import { getPref, setPref } from "../utils/prefs";
import {
  addTranslateTask,
  autoDetectLanguage,
  getLastTranslateTask,
  putTranslateTaskAtHead,
} from "../utils/task";

export function registerReaderTabPanel() {
  ztoolkit.ReaderTabPanel.register(
    getString("readerpanel-label"),
    (
      panel: XUL.TabPanel | undefined,
      ownerDeck: XUL.Deck,
      ownerWindow: Window,
      readerInstance: _ZoteroTypes.ReaderInstance,
    ) => {
      if (ownerDeck.selectedPanel?.children[0].tagName === "vbox") {
        panel = createPanel(ownerDeck, readerInstance._instanceID);
      }
      panel && buildPanel(panel, readerInstance._instanceID);
    },
    {
      selectPanel: getPref("autoFocus") as boolean,
    },
  ).then((tabId) => {
    addon.data.panel.tabOptionId = tabId;
  });
  new (ztoolkit.getGlobal("MutationObserver"))((_muts) => {
    updateTextAreasSize();
  }).observe(document.querySelector("#zotero-context-pane")!, {
    attributes: true,
    attributeFilter: ["width"],
  });
  document
    .querySelector("#zotero-context-pane")
    ?.querySelector("grippy")
    ?.addEventListener("click", (ev) => {
      updateTextAreasSize();
    });
  updateTextAreasSize(true);
}

async function openWindowPanel() {
  if (addon.data.panel.windowPanel && !addon.data.panel.windowPanel.closed) {
    addon.data.panel.windowPanel.close();
  }
  const dialogData = {
    loadLock: Zotero.Promise.defer(),
  };
  const win: Window = ztoolkit.getGlobal("openDialog")(
    `chrome://${config.addonRef}/content/standalone.xhtml`,
    `${config.addonRef}-standalone`,
    `chrome,extrachrome,menubar,resizable=yes,scrollbars,status,dialog=no,${
      getPref("keepWindowTop") ? ",alwaysRaised=yes" : ""
    }`,
    dialogData,
  );
  await dialogData.loadLock.promise;
  buildPanel(
    win.document.querySelector("#panel-container") as XUL.Box,
    "standalone",
  );
  win.addEventListener("resize", (ev) => {
    updateTextAreaSize(win.document);
  });
  buildExtraPanel(win.document.querySelector("#extra-container") as XUL.Box);
  updateTextAreaSize(win.document);
  addon.data.panel.windowPanel = win;
}

export function updateReaderTabPanels() {
  ztoolkit.ReaderTabPanel.changeTabPanel(addon.data.panel.tabOptionId, {
    selectPanel: getPref("autoFocus") as boolean,
  });
  cleanPanels();
  addon.data.panel.activePanels.forEach((panel) => updatePanel(panel));
  if (addon.data.panel.windowPanel && !addon.data.panel.windowPanel.closed) {
    updateExtraPanel(addon.data.panel.windowPanel.document);
  }
  updateTextAreasSize(true);
}

function createPanel(ownerDeck: XUL.Deck, refID: string) {
  const container = ownerDeck.selectedPanel;
  container.innerHTML = "";
  ztoolkit.UI.appendElement(
    {
      tag: "tabbox",
      id: `${config.addonRef}-${refID}-extra-tabbox`,
      classList: ["zotero-view-tabbox"],
      attributes: {
        flex: "1",
      },
      ignoreIfExists: true,
      children: [
        {
          tag: "tabs",
          classList: ["zotero-editpane-tabs"],
          attributes: {
            orient: "horizontal",
          },
          children: [
            {
              tag: "tab",
              attributes: {
                label: getString("readerpanel-label"),
              },
            },
          ],
        },
        {
          tag: "tabpanels",
          classList: ["zotero-view-item"],
          attributes: {
            flex: "1",
          },
          children: [
            {
              tag: "tabpanel",
              attributes: {
                flex: "1",
              },
            },
          ],
        },
      ],
    },
    container,
  );
  return container.querySelector("tabpanel") as XUL.TabPanel;
}

function buildPanel(panel: HTMLElement, refID: string, force: boolean = false) {
  const makeId = (type: string) => `${config.addonRef}-${refID}-panel-${type}`;
  const itemID = Zotero.Reader._readers.find(
    (reader) => reader._instanceID === refID,
  )?._item?.id;
  panel.setAttribute("item-id", String(itemID) || "");
  // Manually existance check to avoid unnecessary element creation with ...
  if (!force && panel.querySelector(`#${makeId("root")}`)) {
    return;
  }
  ztoolkit.UI.appendElement(
    {
      tag: "vbox",
      id: makeId("root"),
      classList: [`${config.addonRef}-panel-root`],
      attributes: {
        flex: "1",
        align: "stretch",
      },
      styles: {
        padding: "8px",
      },
      ignoreIfExists: true,
      children: [
        {
          tag: "hbox",
          id: makeId("engine"),
          attributes: {
            flex: "0",
            align: "center",
          },
          children: [
            {
              tag: "menulist",
              id: makeId("services"),
              attributes: {
                flex: "0",
                native: "true",
              },
              listeners: [
                {
                  type: "command",
                  listener: (e: Event) => {
                    const newService = (e.target as XUL.MenuList).value;
                    setPref("translateSource", newService);
                    addon.hooks.onReaderTabPanelRefresh();
                    const data = getLastTranslateTask();
                    if (!data) {
                      return;
                    }
                    data.service = newService;
                    addon.hooks.onTranslate(undefined, {
                      noCheckZoteroItemLanguage: true,
                    });
                  },
                },
              ],
              children: [
                {
                  tag: "menupopup",
                  children: SERVICES.filter(
                    (service) => service.type === "sentence",
                  ).map((service) => ({
                    tag: "menuitem",
                    attributes: {
                      label: getString(`service-${service.id}`),
                      value: service.id,
                    },
                  })),
                },
              ],
            },
            {
              tag: "button",
              namespace: "xul",
              attributes: {
                label: `${getString(
                  "readerpanel-translate-button-label",
                )}(${getString("ctrl")} + T2154)`,
                flex: "1",
              },
              listeners: [
                {
                  type: "click",
                  listener: (ev: Event) => {
                    if (!getLastTranslateTask()) {
                      addTranslateTask(
                        (
                          panel.querySelector(
                            `#${makeId(
                              getPref("rawResultOrder")
                                ? "resulttext"
                                : "rawtext",
                            )}`,
                          ) as HTMLTextAreaElement
                        )?.value,
                      );
                    }
                    addon.hooks.onTranslate(undefined, {
                      noCheckZoteroItemLanguage: true,
                    });
                  },
                },
              ],
            },
          ],
        },
        {
          tag: "hbox",
          id: makeId("lang"),
          attributes: {
            flex: "0",
            align: "center",
          },
          styles: {
            marginTop: "8px",
          },
          children: [
            {
              tag: "menulist",
              id: makeId("langfrom"),
              attributes: {
                flex: "1",
                native: "true",
              },
              listeners: [
                {
                  type: "command",
                  listener: (e: Event) => {
                    const newValue = (e.target as XUL.MenuList).value;
                    setPref("sourceLanguage", newValue);
                    itemID &&
                      (addon.data.translate.cachedSourceLanguage[itemID] =
                        newValue);
                    addon.hooks.onReaderTabPanelRefresh();
                  },
                },
              ],
              children: [
                {
                  tag: "menupopup",
                  children: LANG_CODE.map((lang) => ({
                    tag: "menuitem",
                    attributes: {
                      label: lang.name,
                      value: lang.code,
                    },
                  })),
                },
              ],
            },
            {
              tag: "div",
              styles: {
                paddingLeft: "8px",
                paddingRight: "8px",
              },
              properties: {
                innerHTML: "↔️",
              },
              listeners: [
                {
                  type: "click",
                  listener: (ev) => {
                    const langfrom = getPref("sourceLanguage") as string;
                    const langto = getPref("targetLanguage") as string;
                    setPref("targetLanguage", langfrom);
                    setPref("sourceLanguage", langto);
                    addon.hooks.onReaderTabPanelRefresh();
                  },
                },
              ],
            },
            {
              tag: "menulist",
              id: makeId("langto"),
              attributes: {
                flex: "1",
                native: "true",
              },
              listeners: [
                {
                  type: "command",
                  listener: (e: Event) => {
                    setPref("targetLanguage", (e.target as XUL.MenuList).value);
                    addon.hooks.onReaderTabPanelRefresh();
                  },
                },
              ],
              children: [
                {
                  tag: "menupopup",
                  children: LANG_CODE.map((lang) => ({
                    tag: "menuitem",
                    attributes: {
                      label: lang.name,
                      value: lang.code,
                    },
                  })),
                },
              ],
            },
          ],
        },
        {
          tag: "hbox",
          id: makeId("auto"),
          attributes: {
            flex: "0",
            align: "center",
          },
          styles: {
            marginTop: "8px",
          },
          children: [
            {
              tag: "div",
              styles: {
                paddingLeft: "8px",
              },
              properties: {
                innerHTML: getString("readerpanel-auto-description-label"),
              },
            },
            {
              tag: "checkbox",
              styles: {
                paddingLeft: "8px",
              },
              id: makeId("autotrans"),
              attributes: {
                label: getString("readerpanel-auto-selection-label"),
                native: "true",
              },
              listeners: [
                {
                  type: "command",
                  listener: (e: Event) => {
                    setPref("enableAuto", (e.target as XUL.Checkbox).checked);
                    addon.hooks.onReaderTabPanelRefresh();
                  },
                },
              ],
            },
            {
              tag: "checkbox",
              styles: {
                paddingLeft: "8px",
              },
              id: makeId("autoannot"),
              attributes: {
                label: getString("readerpanel-auto-annotation-label"),
                native: "true",
              },
              listeners: [
                {
                  type: "command",
                  listener: (e: Event) => {
                    setPref(
                      "enableComment",
                      (e.target as XUL.Checkbox).checked,
                    );
                    addon.hooks.onReaderTabPanelRefresh();
                  },
                },
              ],
            },
          ],
        },
        {
          tag: "hbox",
          id: makeId("concat"),
          styles: {
            marginTop: "8px",
          },
          attributes: {
            flex: "0",
            align: "center",
          },
          children: [
            {
              tag: "div",
              styles: {
                paddingLeft: "8px",
              },
              properties: {
                innerHTML: getString("readerpanel-concat-description-label"),
              },
            },
            {
              tag: "checkbox",
              styles: {
                paddingLeft: "8px",
              },
              id: makeId("concat"),
              attributes: {
                label: `${getString(
                  "readerpanel-concat-enable-label",
                )}/${getString("alt")}`,
                native: "true",
              },
              listeners: [
                {
                  type: "command",
                  listener: (e) => {
                    addon.data.translate.concatCheckbox = (
                      e.target as XUL.Checkbox
                    ).checked;
                    addon.hooks.onReaderTabPanelRefresh();
                  },
                },
              ],
            },
            {
              tag: "button",
              namespace: "xul",
              attributes: {
                label: getString("readerpanel-concat-clear-label"),
                flex: "0",
              },
              listeners: [
                {
                  type: "click",
                  listener: (e) => {
                    const task = getLastTranslateTask();
                    if (task) {
                      task.raw = "";
                      task.result = "";
                      addon.hooks.onReaderTabPanelRefresh();
                    }
                  },
                },
              ],
            },
          ],
        },
        {
          tag: "hbox",
          id: makeId("raw"),
          attributes: {
            flex: "1",
            spellcheck: false,
          },
          styles: {
            marginTop: "8px",
          },
          children: [
            {
              tag: "textarea",
              id: makeId("rawtext"),
              styles: {
                resize: "none",
                fontFamily: "inherit",
              },
              listeners: [
                {
                  type: "input",
                  listener: (ev) => {
                    const task = getLastTranslateTask({
                      id: panel.getAttribute("translate-task-id") || "",
                    });
                    if (!task) {
                      return;
                    }
                    const reverseRawResult = getPref("rawResultOrder");
                    if (!reverseRawResult) {
                      task.raw = (ev.target as HTMLTextAreaElement).value;
                    } else {
                      task.result = (ev.target as HTMLTextAreaElement).value;
                    }
                    putTranslateTaskAtHead(task.id);
                  },
                },
              ],
            },
          ],
        },
        {
          tag: "splitter",
          id: makeId("splitter"),
          attributes: { collapse: "after" },
          styles: {
            height: "3px",
          },
          children: [
            {
              tag: "grippy",
            },
          ],
        },
        {
          tag: "hbox",
          id: makeId("result"),
          attributes: {
            flex: "1",
            spellcheck: false,
          },
          children: [
            {
              tag: "textarea",
              id: makeId("resulttext"),
              styles: {
                resize: "none",
                fontFamily: "inherit",
              },
              listeners: [
                {
                  type: "input",
                  listener: (ev) => {
                    const task = getLastTranslateTask({
                      id: panel.getAttribute("translate-task-id") || "",
                    });
                    if (!task) {
                      return;
                    }
                    const reverseRawResult = getPref("rawResultOrder");
                    if (!reverseRawResult) {
                      task.result = (ev.target as HTMLTextAreaElement).value;
                    } else {
                      task.raw = (ev.target as HTMLTextAreaElement).value;
                    }
                    putTranslateTaskAtHead(task.id);
                  },
                },
              ],
            },
          ],
        },
        {
          tag: "hbox",
          id: makeId("copy"),
          attributes: {
            flex: "0",
            align: "center",
          },
          styles: {
            marginTop: "8px",
          },
          children: [
            {
              tag: "div",
              properties: {
                innerHTML: getString("readerpanel-copy-description-label"),
              },
            },
            {
              tag: "button",
              namespace: "xul",
              attributes: {
                label: getString("readerpanel-copy-raw-label"),
                flex: "1",
              },
              listeners: [
                {
                  type: "click",
                  listener: (e: Event) => {
                    const task = getLastTranslateTask({
                      id: panel.getAttribute("translate-task-id") || "",
                    });
                    if (!task) {
                      return;
                    }
                    new ztoolkit.Clipboard()
                      .addText(task.raw, "text/unicode")
                      .copy();
                  },
                },
              ],
            },
            {
              tag: "button",
              namespace: "xul",
              attributes: {
                label: getString("readerpanel-copy-result-label"),
                flex: "1",
              },
              listeners: [
                {
                  type: "click",
                  listener: (e: Event) => {
                    const task = getLastTranslateTask({
                      id: panel.getAttribute("translate-task-id") || "",
                    });
                    if (!task) {
                      return;
                    }
                    new ztoolkit.Clipboard()
                      .addText(task.result, "text/unicode")
                      .copy();
                  },
                },
              ],
            },
            {
              tag: "button",
              namespace: "xul",
              attributes: {
                label: getString("readerpanel-copy-both-label"),
                flex: "1",
              },
              listeners: [
                {
                  type: "click",
                  listener: (e: Event) => {
                    const task = getLastTranslateTask({
                      id: panel.getAttribute("translate-task-id") || "",
                    });
                    if (!task) {
                      return;
                    }
                    new ztoolkit.Clipboard()
                      .addText(
                        `${task.raw}\n----\n${task.result}`,
                        "text/unicode",
                      )
                      .copy();
                  },
                },
              ],
            },
          ],
        },
        {
          tag: "hbox",
          id: makeId("openwindow"),
          styles: {
            marginTop: "8px",
          },
          attributes: {
            flex: "0",
            align: "center",
          },
          children: [
            {
              tag: "button",
              namespace: "xul",
              attributes: {
                label: getString("readerpanel-openwindow-open-label"),
                flex: "1",
              },
              listeners: [
                {
                  type: "click",
                  listener: (e: Event) => {
                    openWindowPanel();
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    panel,
  );
  updatePanel(panel);
  updateTextAreaSize(panel);
  recordPanel(panel);
}

function buildExtraPanel(panel: XUL.Box) {
  ztoolkit.UI.appendElement(
    {
      tag: "hbox",
      id: "extraTools",
      attributes: {
        flex: "1",
        align: "center",
      },
      styles: {
        paddingLeft: "8px",
        paddingRight: "8px",
        marginBottom: "8px",
      },
      ignoreIfExists: true,
      children: [
        {
          tag: "button",
          namespace: "xul",
          attributes: {
            label: getString("readerpanel-extra-addservice-label"),
            flex: "1",
          },
          listeners: [
            {
              type: "click",
              listener: (ev: Event) => {
                const extraServices = getPref("extraEngines");
                setPref(
                  "extraEngines",
                  extraServices
                    ? `${extraServices},${SERVICES[0].id}`
                    : SERVICES[0].id,
                );
                openWindowPanel();
              },
            },
          ],
        },
        {
          tag: "button",
          namespace: "xul",
          attributes: {
            label: getString("readerpanel-extra-resize-label"),
            flex: "1",
          },
          listeners: [
            {
              type: "click",
              listener: (ev: Event) => {
                const win = addon.data.panel.windowPanel;
                if (!win) {
                  return;
                }
                Array.from(win.document.querySelectorAll("textarea")).forEach(
                  (elem) => (elem.style.width = "280px"),
                );
                ztoolkit.getGlobal("setTimeout")(() => {
                  win?.resizeTo(300, win.outerHeight);
                }, 10);
              },
            },
          ],
        },
        {
          tag: "button",
          namespace: "xul",
          attributes: {
            label: getString(
              `readerpanel-extra-${
                getPref("keepWindowTop") ? "pinned" : "pin"
              }-label`,
            ),
            flex: "1",
          },
          styles: {
            minWidth: "0px",
          },
          listeners: [
            {
              type: "click",
              listener: (ev: Event) => {
                setPref("keepWindowTop", !getPref("keepWindowTop"));
                openWindowPanel();
              },
            },
          ],
        },
      ],
    },
    panel,
  );
  const extraEngines = (getPref("extraEngines") as string)
    .split(",")
    .filter((thisServiceId) =>
      SERVICES.find((service) => service.id === thisServiceId),
    );
  if (!extraEngines.length) {
    panel.style.display = "contents";
    return;
  }
  ztoolkit.UI.appendElement(
    {
      tag: "vbox",
      attributes: {
        flex: "1",
        align: "stretch",
      },
      children: extraEngines.map((serviceId, idx) => {
        return {
          tag: "vbox",
          attributes: {
            flex: "1",
            align: "stretch",
          },
          children: [
            {
              tag: "hbox",
              id: `${serviceId}-${idx}`,
              attributes: {
                flex: "1",
                align: "center",
              },
              classList: [serviceId],
              children: [
                {
                  tag: "menulist",
                  attributes: {
                    flex: "1",
                    value: serviceId,
                    native: "true",
                  },
                  listeners: [
                    {
                      type: "command",
                      listener: (ev: Event) => {
                        const menulist = ev.currentTarget as XUL.MenuList;
                        const newService = menulist.value;
                        const [serviceId, idx] =
                          menulist.parentElement?.id.split("-") || [];
                        const extraServices = (
                          getPref("extraEngines") as string
                        ).split(",");
                        if (extraServices[Number(idx)] === serviceId) {
                          // If the idx and service matches
                          extraServices[Number(idx)] = newService;
                          menulist.parentElement!.id = `${newService}-${idx}`;
                          menulist.parentElement!.className = newService;
                          setPref("extraEngines", extraServices.join(","));
                        } else {
                          // Otherwise reload window
                          openWindowPanel();
                        }
                      },
                    },
                  ],
                  children: [
                    {
                      tag: "menupopup",
                      children: SERVICES.filter(
                        (service) => service.type === "sentence",
                      ).map((service) => ({
                        tag: "menuitem",
                        attributes: {
                          label: getString(`service-${service.id}`),
                          value: service.id,
                        },
                      })),
                    },
                  ],
                },
                {
                  tag: "button",
                  namespace: "xul",
                  attributes: {
                    label: getString("readerpanel-extra-removeservice-label"),
                  },
                  styles: {
                    minWidth: "0px",
                  },
                  listeners: [
                    {
                      type: "click",
                      listener: (ev) => {
                        const [serviceId, idx] =
                          (ev.target as XUL.Button).parentElement?.id.split(
                            "-",
                          ) || [];
                        const extraServices = (
                          getPref("extraEngines") as string
                        ).split(",");
                        // If the idx and service matches
                        if (extraServices[Number(idx)] === serviceId) {
                          extraServices.splice(Number(idx), 1);
                          setPref("extraEngines", extraServices.join(","));
                        }
                        openWindowPanel();
                      },
                    },
                  ],
                },
              ],
            },
            {
              tag: "hbox",
              attributes: {
                flex: "1",
                spellcheck: false,
              },
              children: [
                {
                  tag: "textarea",
                  styles: {
                    resize: "none",
                    fontSize: `${getPref("fontSize")}px`,
                    "font-family": "inherit",
                    lineHeight: getPref("lineHeight") as string,
                  },
                },
              ],
            },
          ],
        };
      }),
    },
    panel,
  );
}

function updatePanel(panel: HTMLElement) {
  const idPrefix = panel
    .querySelector(`.${config.addonRef}-panel-root`)!
    .id.split("-")
    .slice(0, -1)
    .join("-");
  const makeId = (type: string) => `${idPrefix}-${type}`;
  const updateHidden = (type: string, pref: string) => {
    const elem = panel.querySelector(`#${makeId(type)}`) as XUL.Box;
    elem.hidden = !getPref(pref) as boolean;
  };
  const setCheckBox = (type: string, checked: boolean) => {
    const elem = panel.querySelector(`#${makeId(type)}`) as XUL.Checkbox;
    elem.checked = checked;
  };
  const setValue = (type: string, value: string) => {
    const elem = panel.querySelector(`#${makeId(type)}`) as XUL.Textbox;
    elem.value = value;
  };
  const setTextBoxStyle = (type: string) => {
    const elem = panel.querySelector(`#${makeId(type)}`) as XUL.Textbox;
    elem.style.fontSize = `${getPref("fontSize")}px`;
    elem.style.lineHeight = getPref("lineHeight") as string;
  };

  updateHidden("engine", "showSidebarEngine");
  updateHidden("lang", "showSidebarLanguage");
  updateHidden("auto", "showSidebarSettings");
  updateHidden("concat", "showSidebarConcat");
  updateHidden("raw", "showSidebarRaw");
  updateHidden("splitter", "showSidebarRaw");
  updateHidden("copy", "showSidebarCopy");

  setValue("services", getPref("translateSource") as string);

  const { fromLanguage, toLanguage } = autoDetectLanguage(
    Zotero.Items.get(panel.getAttribute("item-id") as string),
  );
  setValue("langfrom", fromLanguage);
  setValue("langto", toLanguage);

  setCheckBox("autotrans", getPref("enableAuto") as boolean);
  setCheckBox("autoannot", getPref("enableComment") as boolean);
  setCheckBox("concat", addon.data.translate.concatCheckbox);

  const lastTask = getLastTranslateTask();
  if (!lastTask) {
    return;
  }
  // For manually update translation task
  panel.setAttribute("translate-task-id", lastTask.id);
  const reverseRawResult = getPref("rawResultOrder");
  setValue("rawtext", reverseRawResult ? lastTask.result : lastTask.raw);
  setValue("resulttext", reverseRawResult ? lastTask.raw : lastTask.result);
  setTextBoxStyle("rawtext");
  setTextBoxStyle("resulttext");
  panel
    .querySelector(`#${makeId("splitter")}`)
    ?.setAttribute("collapse", reverseRawResult ? "after" : "before");
}

function updateExtraPanel(container: HTMLElement | Document) {
  const extraTasks = getLastTranslateTask()?.extraTasks;
  if (extraTasks?.length === 0) {
    return;
  }
  extraTasks?.forEach((task) => {
    Array.from(
      container.querySelectorAll(`.${task.service}+hbox>textarea`),
    ).forEach((elem) => ((elem as HTMLTextAreaElement).value = task.result));
  });
}

function updateTextAreaSize(
  container: HTMLElement | Document,
  noDelay: boolean = false,
) {
  const setTimeout = ztoolkit.getGlobal("setTimeout");
  Array.from(container.querySelectorAll("textarea")).forEach((elem) => {
    if (noDelay) {
      elem.style.width = `${elem.parentElement?.scrollWidth}px`;
      return;
    }
    elem.style.width = "0px";
    setTimeout(() => {
      elem.style.width = `${elem.parentElement?.scrollWidth}px`;
    }, 0);
  });
}

function updateTextAreasSize(noDelay: boolean = false) {
  cleanPanels();
  addon.data.panel.activePanels.forEach((panel) =>
    updateTextAreaSize(panel, noDelay),
  );
}

function recordPanel(panel: HTMLElement) {
  addon.data.panel.activePanels.push(panel);
}

function cleanPanels() {
  addon.data.panel.activePanels = addon.data.panel.activePanels.filter(
    (elem) => elem.parentElement && (elem as any).ownerGlobal,
  );
}
