import api from "./api";
import hooks from "./hooks";
import { TranslateTask } from "./utils/task";
import { TranslationServices } from "./modules/services";
import { createZToolkit } from "./utils/ztoolkit";

class Addon {
  public data: {
    alive: boolean;
    // Env type, see build.js
    env: "development" | "production";
    ztoolkit: ZToolkit;
    locale: {
      current?: any;
    };
    prefs: {
      window: Window | null;
    };
    panel: {
      tabOptionId: string;
      activePanels: HTMLElement[];
      windowPanel: Window | null;
    };
    popup: {
      currentPopup: HTMLDivElement | null;
      observers: WeakRef<MutationObserver>[];
    };
    translate: {
      concatKey: boolean;
      concatCheckbox: boolean;
      queue: TranslateTask[];
      maximumQueueLength: number;
      batchTaskDelay: number;
      services: TranslationServices;
    };
  };
  // Lifecycle hooks
  public hooks: typeof hooks;
  // APIs
  public api: typeof api;

  constructor() {
    this.data = {
      alive: true,
      env: __env__,
      ztoolkit: createZToolkit(),
      locale: {},
      prefs: { window: null },
      panel: { tabOptionId: "", activePanels: [], windowPanel: null },
      popup: { currentPopup: null, observers: [] },
      translate: {
        concatKey: false,
        concatCheckbox: false,
        queue: [],
        maximumQueueLength: 100,
        batchTaskDelay: 1000,
        services: new TranslationServices(),
      },
    };
    this.hooks = hooks;
    this.api = api;
  }
}

export default Addon;
