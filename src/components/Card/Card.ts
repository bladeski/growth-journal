import { BaseComponent } from '../BaseComponent';
import template from 'bundle-text:./Card.pug';
import styles from 'bundle-text:./Card.css';
import { CardEvents, CardProps } from '../../models';

export class Card extends BaseComponent<CardProps, CardEvents> {
  static observedAttributes = ['data-prop:variant'];

  constructor() {
    const templateFn = () => template;
    super(templateFn, { variant: 'default' }, [styles]);
  }
}

customElements.define('card-component', Card);
