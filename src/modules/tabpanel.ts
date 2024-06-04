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

let paneKey = "";

export function registerReaderTabPanel() {
  const key = Zotero.ItemPaneManager.registerSection({
    paneID: "translate",
    pluginID: config.addonID,
    header: {
      l10nID: `${config.addonRef}-itemPaneSection-header`,
      icon: `chrome://${config.addonRef}/content/icons/section-16.svg`,
    },
    sidenav: {
      l10nID: `${config.addonRef}-itemPaneSection-sidenav`,
      icon: `chrome://${config.addonRef}/content/icons/section-20.svg`,
    },
    onInit,
    onDestroy,
    onRender,
    onItemChange,
    sectionButtons: [
      {
        type: "fullHeight",
        icon: `chrome://${config.addonRef}/content/icons/full-16.svg`,
        l10nID: `${config.addonRef}-itemPaneSection-fullHeight`,
        onClick: onUpdateHeight,
      },
    ],
  });
  if (key) paneKey = key;
}

async function openWindowPanel() {
  window.alert("Not implemented yet, please wait for the next update.");
  return;
  // if (addon.data.panel.windowPanel && !addon.data.panel.windowPanel.closed) {
  //   addon.data.panel.windowPanel.close();
  // }
  // const dialogData = {
  //   loadLock: Zotero.Promise.defer(),
  // };
  // const win: Window = ztoolkit.getGlobal("openDialog")(
  //   `chrome://${config.addonRef}/content/standalone.xhtml`,
  //   `${config.addonRef}-standalone`,
  //   `chrome,extrachrome,menubar,resizable=yes,scrollbars,status,dialog=no,${
  //     getPref("keepWindowTop") ? ",alwaysRaised=yes" : ""
  //   }`,
  //   dialogData,
  // );
  // await dialogData.loadLock.promise;
  // // onInit(win.document.querySelector("#panel-container") as XUL.Box);
  // buildExtraPanel(win.document.querySelector("#extra-container") as XUL.Box);
  // addon.data.panel.windowPanel = win;
}

export function updateReaderTabPanels() {
  // ztoolkit.ReaderTabPanel.changeTabPanel(addon.data.panel.tabOptionId, {
  //   selectPanel: getPref("autoFocus") as boolean,
  // });
  Object.values(addon.data.panel.activePanels).forEach((refresh: any) =>
    refresh(),
  );
  // if (addon.data.panel.windowPanel && !addon.data.panel.windowPanel.closed) {
  //   updateExtraPanel(addon.data.panel.windowPanel.document);
  // }
  // updateTextAreasSize(true);
}

function onInit({
  body,
  refresh,
}: _ZoteroTypes.ItemPaneManager.SectionInitHookArgs) {
  const paneUID = Zotero_Tabs.selectedID;
  body.dataset.paneUid = paneUID;
  addon.data.panel.activePanels[paneUID] = refresh;
}

function onInitUI({ body }: { body: HTMLElement }) {
  if (body.dataset.rendered) return;
  body.dataset.rendered = "true";
  const paneUID = body.dataset.paneUid;
  const makeClass = (type: string) => `${paneUID}-${type}`;

  body.style.display = "flex";
  body.style.flexDirection = "column";
  body.style.gap = "6px";
  body.style.setProperty("height", "var(--details-height, 450px)");

  ztoolkit.UI.appendElement(
    {
      tag: "fragment",
      children: [
        {
          tag: "hbox",
          classList: [makeClass("engine")],
          attributes: {
            flex: "0",
            align: "center",
          },
          children: [
            {
              tag: "menulist",
              classList: [makeClass("services")],
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
                label: getString("readerpanel-translate-button-label"),
                tooltiptext: `(${getString("ctrl")} + T)`,
                flex: "1",
              },
              styles: {
                minWidth: "auto",
              },
              listeners: [
                {
                  type: "click",
                  listener: (ev: Event) => {
                    if (!getLastTranslateTask()) {
                      addTranslateTask(
                        (
                          body.querySelector(
                            `.${makeClass(
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
          classList: [makeClass("lang")],
          attributes: {
            flex: "0",
            align: "center",
          },
          children: [
            {
              tag: "menulist",
              classList: [makeClass("langfrom")],
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
                    const itemID = body.dataset.itemID;
                    itemID &&
                      (addon.data.translate.cachedSourceLanguage[
                        Number(itemID)
                      ] = newValue);
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
              tag: "toolbarbutton",
              styles: {
                width: "24px",
                height: "24px",
                fill: "var(--fill-secondary)",
                stroke: "var(--fill-secondary)",
                listStyleImage: `url(chrome://${config.addonRef}/content/icons/swap.svg)`,
              },
              attributes: {
                style: `width: 24px; height: 24px; fill: var(--fill-secondary); stroke: var(--fill-secondary); -moz-context-properties: fill,fill-opacity,stroke,stroke-opacity; list-style-image: url(chrome://${config.addonRef}/content/icons/swap.svg)`,
                tooltiptext: "Swap languages",
              },
              listeners: [
                {
                  type: "command",
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
              classList: [makeClass("langto")],
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
          tag: "div",
          styles: {
            borderTop: "var(--material-border)",
          },
        },
        {
          tag: "editable-text",
          namespace: "xul",
          classList: [makeClass("rawtext")],
          attributes: {
            multiline: "true",
            placeholder: "Select or type to translate",
          },
          styles: {
            minHeight: "100px",
            flex: "1",
          },
          listeners: [
            {
              type: "change",
              listener: (ev) => {
                const task = getLastTranslateTask({
                  id: body.getAttribute("translate-task-id") || "",
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
        {
          tag: "div",
          styles: {
            borderTop: "var(--material-border)",
          },
        },
        {
          tag: "editable-text",
          namespace: "xul",
          classList: [makeClass("resulttext")],
          attributes: {
            multiline: "true",
            placeholder: "Translate result",
          },
          styles: {
            minHeight: "100px",
            flex: "1",
          },
          listeners: [
            {
              type: "change",
              listener: (ev) => {
                const task = getLastTranslateTask({
                  id: body.getAttribute("translate-task-id") || "",
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
        {
          tag: "div",
          styles: {
            borderTop: "var(--material-border)",
          },
        },
        {
          tag: "div",
          styles: {
            display: "grid",
            gridTemplateColumns: "max-content 1fr",
            columnGap: "8px",
            rowGap: "2px",
            width: "inherit",
          },
          children: [
            {
              tag: "div",
              classList: [makeClass("auto")],
              styles: {
                display: "grid",
                gridTemplateColumns: "subgrid",
                gridColumn: "span 2",
              },
              children: [
                {
                  tag: "div",
                  styles: {
                    display: "flex",
                    justifyContent: "center",
                    flexDirection: "column",
                    color: "var(--fill-secondary)",
                  },
                  properties: {
                    innerHTML: getString("readerpanel-auto-description-label"),
                  },
                },
                {
                  tag: "div",
                  styles: {
                    display: "flex",
                    flexDirection: "row",
                  },
                  children: [
                    {
                      tag: "checkbox",
                      classList: [makeClass("autotrans")],
                      attributes: {
                        label: getString("readerpanel-auto-selection-label"),
                        native: "true",
                      },
                      listeners: [
                        {
                          type: "command",
                          listener: (e: Event) => {
                            setPref(
                              "enableAuto",
                              (e.target as XUL.Checkbox).checked,
                            );
                            addon.hooks.onReaderTabPanelRefresh();
                          },
                        },
                      ],
                    },
                    {
                      tag: "checkbox",
                      classList: [makeClass("autoannot")],
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
              ],
            },
            {
              tag: "div",
              classList: [makeClass("concat")],
              styles: {
                display: "grid",
                gridTemplateColumns: "subgrid",
                gridColumn: "span 2",
              },
              children: [
                {
                  tag: "div",
                  styles: {
                    display: "flex",
                    justifyContent: "center",
                    flexDirection: "column",
                    color: "var(--fill-secondary)",
                  },
                  properties: {
                    innerHTML: getString("readerpanel-concat-enable-label"),
                  },
                },
                {
                  tag: "div",
                  styles: {
                    display: "flex",
                    flexDirection: "row",
                  },
                  children: [
                    {
                      tag: "checkbox",
                      classList: [makeClass("concat")],
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
                      styles: {
                        minWidth: "auto",
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
              ],
            },
            {
              tag: "div",
              classList: [makeClass("copy")],
              styles: {
                display: "grid",
                gridTemplateColumns: "subgrid",
                gridColumn: "span 2",
              },
              children: [
                {
                  tag: "div",
                  styles: {
                    display: "flex",
                    justifyContent: "center",
                    flexDirection: "column",
                    color: "var(--fill-secondary)",
                  },
                  properties: {
                    innerHTML: getString("readerpanel-copy-description-label"),
                  },
                },
                {
                  tag: "div",
                  styles: {
                    display: "flex",
                    flexDirection: "row",
                  },
                  children: [
                    {
                      tag: "button",
                      namespace: "xul",
                      attributes: {
                        label: getString("readerpanel-copy-raw-label"),
                        flex: "1",
                      },
                      styles: {
                        minWidth: "auto",
                      },
                      listeners: [
                        {
                          type: "click",
                          listener: (e: Event) => {
                            const task = getLastTranslateTask({
                              id: body.getAttribute("translate-task-id") || "",
                            });
                            if (!task) {
                              return;
                            }
                            new ztoolkit.Clipboard()
                              .addText(task.raw, "text/plain")
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
                      styles: {
                        minWidth: "auto",
                      },
                      listeners: [
                        {
                          type: "click",
                          listener: (e: Event) => {
                            const task = getLastTranslateTask({
                              id: body.getAttribute("translate-task-id") || "",
                            });
                            if (!task) {
                              return;
                            }
                            new ztoolkit.Clipboard()
                              .addText(task.result, "text/plain")
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
                      styles: {
                        minWidth: "auto",
                      },
                      listeners: [
                        {
                          type: "click",
                          listener: (e: Event) => {
                            const task = getLastTranslateTask({
                              id: body.getAttribute("translate-task-id") || "",
                            });
                            if (!task) {
                              return;
                            }
                            new ztoolkit.Clipboard()
                              .addText(
                                `${task.raw}\n----\n${task.result}`,
                                "text/plain",
                              )
                              .copy();
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          tag: "button",
          namespace: "xul",
          attributes: {
            label: getString("readerpanel-openwindow-open-label"),
            flex: "1",
          },
          styles: {
            minWidth: "auto",
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
      enableElementRecord: false,
    },
    body,
  );
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

function onItemChange({
  tabType,
  item,
  body,
  setEnabled,
}: _ZoteroTypes.ItemPaneManager.SectionHookArgs) {
  if (tabType !== "reader") {
    setEnabled(false);
  }
  body.dataset.itemID = String(item?.id);
  return true;
}

function onRender({
  body,
  item,
}: _ZoteroTypes.ItemPaneManager.SectionHookArgs) {
  onInitUI({ body });
  onUpdateHeight({ body });

  const makeClass = (type: string) => `${body.dataset.paneUid}-${type}`;
  const updateHidden = (type: string, pref: string) => {
    const elem = body.querySelector(`.${makeClass(type)}`) as XUL.Box;
    elem.hidden = !getPref(pref) as boolean;
  };
  const setCheckBox = (type: string, checked: boolean) => {
    const elem = body.querySelector(`.${makeClass(type)}`) as XUL.Checkbox;
    elem.checked = checked;
  };
  const setValue = (type: string, value: string) => {
    const elem = body.querySelector(`.${makeClass(type)}`) as XUL.Textbox;
    elem.value = value;
  };
  const setTextBoxStyle = (type: string) => {
    const elem = body.querySelector(`.${makeClass(type)}`) as XUL.Textbox;
    elem.style.fontSize = `${getPref("fontSize")}px`;
    elem.style.lineHeight = getPref("lineHeight") as string;
  };

  updateHidden("engine", "showSidebarEngine");
  updateHidden("lang", "showSidebarLanguage");
  updateHidden("auto", "showSidebarSettings");
  updateHidden("concat", "showSidebarConcat");
  updateHidden("rawtext", "showSidebarRaw");
  updateHidden("copy", "showSidebarCopy");

  setValue("services", getPref("translateSource") as string);

  const { fromLanguage, toLanguage } = autoDetectLanguage(item);
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
  body.setAttribute("translate-task-id", lastTask.id);
  const reverseRawResult = getPref("rawResultOrder");
  setValue("rawtext", reverseRawResult ? lastTask.result : lastTask.raw);
  setValue("resulttext", reverseRawResult ? lastTask.raw : lastTask.result);
  setTextBoxStyle("rawtext");
  setTextBoxStyle("resulttext");
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

function onDestroy(options: any) {
  const { body } = options;
  const paneUID = body.dataset.paneUid;
  delete addon.data.panel.activePanels[paneUID];
}

function onUpdateHeight({ body }: { body: HTMLElement }) {
  const details = body.closest("item-details");
  const head = body.closest("item-pane-custom-section")?.querySelector(".head");
  const heightKey = "--details-height";

  body?.style.setProperty(
    heightKey,
    `${details!.querySelector(".zotero-view-item")!.clientHeight - head!.clientHeight - 8}px`,
  );
  // @ts-ignore
  details.scrollToPane(paneKey);
}
