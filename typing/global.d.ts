declare const _globalThis: {
  [key: string]: any;
  Zotero: _ZoteroTypes.Zotero;
  ZoteroPane: _ZoteroTypes.ZoteroPane;
  Zotero_Tabs: typeof Zotero_Tabs;
  ZoteroContextPane: typeof ZoteroContextPane;
  window: Window;
  document: Document;
  crypto: Crypto;
  TextEncoder: typeof TextEncoder;
  ztoolkit: typeof ztoolkit;
  addon: typeof addon;
};

declare const ztoolkit: import("../src/addon").ZToolkit;

declare const rootURI: string;

declare const addon: import("../src/addon").default;

declare const __env__: "production" | "development";
