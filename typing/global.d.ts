declare interface DirectoryIterator {
  forEach(handler: any): Promise<void>;
  close(): void;
  next: () => any;
}
declare interface DirectoryIteratorConstructable {
  new (path: string): DirectoryIterator; // eslint-disable-line @typescript-eslint/prefer-function-type
}

declare namespace OS {
  namespace File {
    type Entry = {
      isDir: boolean;
      size: number;
      path: string;
      unixMode?: number;
    };
    type FileInfo = {
      isDir: boolean;
      size: number;
      unixMode?: number;
      lastModificationDate: Date;
    };
  }
}
declare const OS: {
  // https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/OSFile.jsm/OS.File_for_the_main_thread
  File: {
    exists: (path: string) => boolean | Promise<boolean>;
    read: (
      path: string | BufferSource,
      options?: { encoding: string }
    ) =>
      | string
      | Promise<string>
      | Uint8Array
      | Promise<Uint8Array>
      | Promise<BufferSource>;
    move: (from: string, to: string) => void | Promise<void>;
    remove: (
      path: string,
      options?: { ignoreAbsent: boolean }
    ) => Promise<void>;
    writeAtomic: (
      path: string,
      data: Uint8Array | string,
      options?: { tmpPath?: string; encoding?: string }
    ) => void | Promise<void>;
    makeDir: (
      path: string,
      options?: { ignoreExisting?: boolean }
    ) => void | Promise<void>;
    stat: (path: string) => OS.File.FileInfo | Promise<OS.File.FileInfo>;
    copy: (
      src: string,
      tgt: string,
      options?: { noOverwrite?: boolean }
    ) => void;
    removeDir: (
      path: string,
      options?: { ignoreAbsent?: boolean; ignorePermissions?: boolean }
    ) => void;

    DirectoryIterator: DirectoryIteratorConstructable;
  };

  // https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/OSFile.jsm/OS.Path
  Path: {
    join: (...args: string[]) => string;
    dirname: (path: string) => string;
    basename: (path: string) => string;
    normalize: (path: string) => string;
    split: (path: string) => {
      absolute: boolean;
      components: string[];
      winDrive?: string;
    };
    toFileURI: (path: string) => string;
  };
};

declare interface ZoteroItem {
  id: number;
  isRegularItem: () => boolean;
  isNote: () => boolean;
  isAttachment: () => boolean;
  isAnnotation?: () => boolean;
  itemTypeID: number;
  libraryID: number;
  parentID: number;
  parentItem: ZoteroItem;
  key: string;
  getField: (
    name: string,
    unformatted?: boolean,
    includeBaseMapped?: boolean
  ) => any;
  setField: (name: string, value: string | number) => void;
  getCreators: () => {
    firstName?: string;
    lastName: string;
    fieldMode: number;
    creatorTypeID: number;
  }[];
  getCreatorsJSON: () => {
    firstName?: string;
    lastName?: string;
    name?: string;
    creatorType: string;
  }[];
  getNotes: () => ZoteroItem[];
  getCollections: () => number[];
  getAttachments: () => ZoteroItem[];
  getTags: () => { tag: string; type: number }[];
  annotationType?: string;
  annotationComment?: string;
  annotationText?: string;
  saveTx: () => Promise<void>;
}

// https://stackoverflow.com/questions/39040108/import-class-in-definition-file-d-ts
declare const Zotero: {
  [attr: string]: any;
  debug: (args: any) => void;
  Prefs: {
    get: (key: string) => any;
    set: (key: string, value: any) => any;
  };
  Reader: Reader;
  ZoteroPDFTranslate: import("../src/PDFtranslate");
};

declare const ZoteroPane: {
  [attr: string]: any;
  canEdit: () => boolean;
  displayCannotEditLibraryMessage: () => void;
  getSelectedCollection: (arg: boolean) => ZoteroCollection;
  getSelectedItems: () => Array<ZoteroItem>;
};

declare class ZoteroCollection {
  getChildItems: (arg1: boolean, arg2: boolean) => Array<ZoteroItem>;
}

declare const Components: any;
declare const Services: any;

declare class Reader {
  [attr: string]: any;
  _readers: Array<ReaderObj>;
  getByTabID: (tabID: string) => ReaderObj;
}

declare class ReaderObj {
  [attr: string]: any;
  itemID: number;
  _iframeWindow: Window;
}

declare class Annotation {
  text: string;
}

declare const Zotero_Tabs: {
  _tabs: Array<any>;
  selectedID: string;
  deck: HTMLElement;
};

declare const openWindowByType: (
  uri: string,
  type: string,
  features: string
) => Window;

declare class Shortcut {
  id: string;
  func: any;
  modifiers: string;
  key: string;
  keycode?: string;
}
