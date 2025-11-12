import { BaseComponent } from '../BaseComponent';
import template from 'bundle-text:./ReflectionTips.pug';
import styles from 'bundle-text:./ReflectionTips.css';
import { ReflectionTipsEvents, ReflectionTipsProps } from '../../models';

export class ReflectionTips extends BaseComponent<ReflectionTipsProps, ReflectionTipsEvents> {
  static observedAttributes = ['data-prop:title'];

  constructor() {
    const templateFn = () => template;
    super(templateFn, { title: 'Reflection Tips' }, [styles]);
  }
}

customElements.define('reflection-tips', ReflectionTips);
