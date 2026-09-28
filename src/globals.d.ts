// ExtendScript globals referenced by the side-effect-only JSX facade.
declare var $: {
  version: string;
  fileName: string;
  hiresTimer: number;
  global: any;
  evalFile(path: string, timeout?: number): any;
};
declare var ExternalObject: any;
declare var File: any;
declare var Folder: any;
