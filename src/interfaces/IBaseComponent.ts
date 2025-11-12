import { PropTypes } from '../models';

export interface IBaseComponent<TProps extends PropTypes = Record<string, never>, TEvents = unknown>
  extends HTMLElement {
  /** Strongly typed props */
  props: TProps;

  /** Optional ID of a <template> element to render */
  templateId?: string;

  /**
   * Called when the component is added to the DOM.
   */
  connectedCallback(): void;

  /**
   * Called when the component is removed from the DOM.
   */
  disconnectedCallback(): void;

  /**
   * Called when an observed attribute changes.
   */
  attributeChangedCallback(
    name: keyof TProps & string,
    oldValue: string | null,
    newValue: string | null,
  ): void;

  /**
   * Render method for updating the DOM.
   * If `templateId` is set, the base implementation will
   * clone that template into the shadow DOM.
   */
  render(): void;

  /**
   * Dispatch a typed custom event.
   */
  emit<K extends keyof TEvents & string>(eventName: K, detail: TEvents[K]): void;

  /**
   * Automatically binds event listeners from `data-action` attributes
   * in the shadow DOM to methods on the component instance.
   */
  bindActions(): void;
}
