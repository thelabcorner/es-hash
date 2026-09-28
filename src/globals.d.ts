// ExtendScript globals referenced by the side-effect-only JSX facade.
declare var $: {
  version: string;
  hiresTimer: number;
  global: any;
  evalFile(path: string, timeout?: number): any;
};
