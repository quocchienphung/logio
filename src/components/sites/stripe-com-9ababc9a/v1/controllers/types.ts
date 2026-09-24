/** A port of one legacy data-js-controller: receives its element, returns an optional cleanup. */
export type Controller = (el: HTMLElement) => void | (() => void);
