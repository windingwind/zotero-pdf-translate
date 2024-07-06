import { getLocaleID, getString } from "../utils/locale";
import { config } from "../../package.json";
import { SERVICES } from "../utils/config";
import { getPref, setPref } from "../utils/prefs";
import { getLastTranslateTask } from "../utils/task";
import { TranslatorPanel } from "../elements/panel";
import { isWindowAlive } from "../utils/window";

let paneKey = "";

export function registerReaderTabPanel() {
  const key = Zotero.ItemPaneManager.registerSection({
    paneID: "translate",
    pluginID: config.addonID,
    header: {
      l10nID: getLocaleID("itemPaneSection-header"),
      icon: `chrome://${config.addonRef}/content/icons/section-16.svg`,
    },
    sidenav: {
      l10nID: getLocaleID("itemPaneSection-sidenav"),
      icon: `chrome://${config.addonRef}/content/icons/section-20.svg`,
    },
    bodyXHTML: "<translator-plugin-panel />",
    onInit,
    onDestroy,
    onRender: ({ body, item }) => {
      const panel = body.querySelector(
        "translator-plugin-panel",
      ) as TranslatorPanel;
      panel.item = item;
      panel.render();
      onUpdateHeight({ body });
    },
    onItemChange,
    sectionButtons: [
      {
        type: "openStandalone",
        icon: "chrome://zotero/skin/16/universal/open-link.svg",
        l10nID: getLocaleID("itemPaneSection-openStandalone"),
        onClick: ({ event }) => {
          openWindowPanel();
        },
      },
      {
        type: "fullHeight",
        icon: `chrome://${config.addonRef}/content/icons/full-16.svg`,
        l10nID: getLocaleID("itemPaneSection-fullHeight"),
        onClick: ({ body }) => {
          const details = body.closest("item-details");
          onUpdateHeight({ body });
          // @ts-ignore
          details.scrollToPane(paneKey);
        },
      },
    ],
  });
  if (key) paneKey = key;
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
  buildExtraPanel(win.document.querySelector("#extra-container") as XUL.Box);
  updateExtraPanel(win.document);
  addon.data.panel.windowPanel = win;
}

export function updateReaderTabPanels() {
  Object.values(addon.data.panel.activePanels).forEach((refresh: any) =>
    refresh(),
  );
  const win = addon.data.panel.windowPanel;
  if (win && isWindowAlive(win)) {
    updateExtraPanel(win.document);
  }
}

function onInit({
  body,
  refresh,
}: _ZoteroTypes.ItemPaneManager.SectionInitHookArgs) {
  const paneUID = Zotero_Tabs.selectedID;
  body.dataset.paneUid = paneUID;
  addon.data.panel.activePanels[paneUID] = refresh;
}

function buildExtraPanel(panel: XUL.Box) {
  ztoolkit.UI.appendElement(
    {
      tag: "hbox",
      id: "extraTools",
      attributes: {
        align: "center",
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
    return;
  }
  ztoolkit.UI.appendElement(
    {
      tag: "div",
      styles: {
        borderTop: "var(--material-border)",
      },
    },
    panel,
  );
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
                    fontSize: `${getPref("fontSize")}px`,
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

function updateExtraPanel(container: HTMLElement | Document) {
  let lastTask = getLastTranslateTask();
  const panel = container.querySelector(
    "translator-plugin-panel",
  ) as TranslatorPanel;
  if (panel) {
    panel.item = Zotero.Items.get(lastTask?.itemId || -1);
    panel.render();
  }

  const extraTasks = lastTask?.extraTasks;
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
}
