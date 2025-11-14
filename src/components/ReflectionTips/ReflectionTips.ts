import { BaseComponent } from '../Base/BaseComponent.ts';
import template from 'bundle-text:./ReflectionTips.pug';
import styles from 'bundle-text:./ReflectionTips.css';
import type { IReflectionTipsProps } from './interfaces/IReflectionTipsProps.ts';
import type { IReflectionTipsEvents } from './interfaces/IReflectionTipsEvents.ts';

export class ReflectionTips extends BaseComponent<IReflectionTipsProps, IReflectionTipsEvents> {
  static observedAttributes = ['data-prop:title'];

  constructor() {
    const templateFn = () => template;
    super(templateFn, { title: 'Reflection Tips' }, [styles]);
  }
}

customElements.define('reflection-tips', ReflectionTips);
