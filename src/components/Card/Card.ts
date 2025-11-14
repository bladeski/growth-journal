import { BaseComponent } from '../Base/BaseComponent.ts';
import template from 'bundle-text:./Card.pug';
import styles from 'bundle-text:./Card.css';
import { ICardProps } from './interfaces/ICardProps.ts';
import { ICardEvents } from './interfaces/ICardEvents.ts';

export class Card extends BaseComponent<ICardProps, ICardEvents> {
  static observedAttributes = ['data-prop:variant'];

  constructor() {
    const templateFn = () => template;
    super(templateFn, { variant: 'default' }, [styles]);
  }
}

customElements.define('card-component', Card);
