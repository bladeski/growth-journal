import { BaseComponent } from '../Base/BaseComponent.ts';
import type { IMessageComponentProps } from './interfaces/IMessageComponentProps.ts';
import type { IMessageComponentEvents } from './interfaces/IMessageComponentEvents.ts';
import styles from 'bundle-text:./MessageComponent.css';
import templateHtml from 'bundle-text:./MessageComponent.pug';

export class MessageComponent extends BaseComponent<
  IMessageComponentProps,
  IMessageComponentEvents
> {
  static observedAttributes = [
    'data-prop:message',
    'data-prop:type',
    'data-prop:role',
    'data-prop:aria-live'
  ];

  constructor() {
    super(
      () => templateHtml,
      {
        message: '',
        type: 'info',
        role: '',
        ariaLive: ''
      },
      [styles]
    );
  }

  // Public method to update message content
  updateMessage(message: string, type?: 'success' | 'error' | 'warning' | 'info'): void {
    this.props.message = message;
    if (type) this.props.type = type;
    this.render();
  }

  render(): void {
    super.render();
    this.updateDisplay();
  }

  private updateDisplay(): void {
    if (!this.shadowRoot) return;

    const container = this.shadowRoot.querySelector('.message-container') as HTMLElement;
    if (!container) return;

    // Set the message content
    container.innerHTML = this.props.message || '';

    // Update type class
    container.className = 'message-container';
    if (this.props.type) {
      container.classList.add(this.props.type);
    }

    // Hide if no message
    if (!this.props.message || this.props.message.trim() === '') {
      container.classList.add('hidden');
    }

    // Set ARIA attributes
    if (this.props.role) {
      container.setAttribute('role', this.props.role);
    }
    if (this.props.ariaLive) {
      container.setAttribute('aria-live', this.props.ariaLive);
    }
    if (this.props.role === 'alert') {
      container.setAttribute('aria-atomic', 'true');
    }
  }
}

customElements.define('message-component', MessageComponent);
