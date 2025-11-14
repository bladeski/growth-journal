import { BaseComponent } from '../Base/BaseComponent.ts';
import styles from 'bundle-text:./CheckinHeader.css';
import templateHtml from 'bundle-text:./CheckinHeader.pug';
import { ICheckinHeaderProps } from './interfaces/ICheckinHeaderProps.ts';
import { ICheckinHeaderEvents } from './interfaces/ICheckinHeaderEvents.ts';

export class CheckinHeader extends BaseComponent<ICheckinHeaderProps, ICheckinHeaderEvents> {
  static observedAttributes = [
    'data-prop:title',
    'data-prop:description',
    'data-prop:show-daily-focus',
    'data-prop:core-value',
    'data-prop:intention',
    'data-prop:metadata',
  ];

  constructor() {
    super(
      () => templateHtml,
      {
        title: '',
        description: '',
        showDailyFocus: false,
        coreValue: '',
        intention: '',
        metadata: '',
      },
      [styles],
    );
  }

  cancel(): void {
    this.emit('cancel', undefined);
  }

  // Public method to update header content
  updateHeader(props: Partial<ICheckinHeaderProps>): void {
    Object.assign(this.props, props);
    this.render();
    this.updateVisibility();
  }

  render(): void {
    super.render();
    this.updateMetadataHTML();
    this.updateVisibility();
  }

  private updateMetadataHTML(): void {
    if (!this.shadowRoot) return;

    const metadataContainer = this.shadowRoot.querySelector('.metadata-container') as HTMLElement;
    if (metadataContainer && this.props.metadata) {
      metadataContainer.innerHTML = this.props.metadata;
    }
  }

  private updateVisibility(): void {
    if (!this.shadowRoot) return;

    // Hide daily-focus if both coreValue and intention are empty
    const dailyFocus = this.shadowRoot.querySelector('.daily-focus') as HTMLElement;
    if (dailyFocus) {
      const hasContent =
        !!(this.props.coreValue && this.props.coreValue.trim()) ||
        !!(this.props.intention && this.props.intention.trim());
      dailyFocus.style.display = hasContent ? 'flex' : 'none';
    }

    // Hide individual core-value and intention paragraphs if empty
    const coreValueP = this.shadowRoot.querySelector('.core-value') as HTMLElement;
    if (coreValueP) {
      coreValueP.style.display =
        this.props.coreValue && this.props.coreValue.trim() ? 'inline-flex' : 'none';
    }

    const intentionP = this.shadowRoot.querySelector('.intention') as HTMLElement;
    if (intentionP) {
      intentionP.style.display =
        this.props.intention && this.props.intention.trim() ? 'inline-flex' : 'none';
    }

    // Hide metadata container if empty
    const metadataContainer = this.shadowRoot.querySelector('.metadata-container') as HTMLElement;
    if (metadataContainer) {
      metadataContainer.style.display =
        this.props.metadata && this.props.metadata.trim() ? 'block' : 'none';
    }
  }
}

customElements.define('checkin-header', CheckinHeader);
