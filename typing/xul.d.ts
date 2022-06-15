declare namespace XUL {
  class Element extends HTMLElement {
    public tagName?: string;
    public hidden?: boolean;
    public disabled?: boolean;
    public value?: string;
    public width?: number;
    public height?: number;
    public getAttribute?(name: string): string;
    public setAttribute?(name: string, value: any): void;
  }

  class Label extends Element {
    public value: string;
  }

  class Textbox extends XUL.Element {
    public value?: string;
    public readonly?: boolean;
  }

  class Checkbox extends XUL.Element {
    public checked?: boolean;
  }

  class Menuitem extends XUL.Element {
    public value: string;
    public label: string;
  }

  class ProgressMeter extends XUL.Element {
    public value: string | number;
  }

  class Menupopup extends XUL.Element {}

  class Menulist extends XUL.Element {
    public firstChild?: Menupopup | ChildNode;
    public selectedItem?: Menuitem;
    public value?: string;
    public itemCount?: number;
    public selectedIndex?: number;
    public getItemAtIndex?: (i: number) => XUL.Menuitem;
  }

  class ItemElement extends XUL.Element {
    public item?: ZoteroItem;
  }

  class Box extends XUL.Element {
    public maxHeight?: number;
    public minHeight?: number;
    public maxWidth?: number;
    public minWidth?: number;
  }

  class Button extends XUL.Element {
    public checked?: boolean;
    public type?: string;
    public tooltiptext?: string;
  }
}

declare class ClassList {
  public add(classname: string): void;
  public remove(classname: string): void;
  public contains(classname: string): boolean;
}

declare class XULEvent extends Event {
  public target: XUL.Element;
}
