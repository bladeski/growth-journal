import type { IPropTypes } from '../../Base/interfaces/IPropTypes.ts';

export interface IMessageComponentProps extends IPropTypes {
  message?: string;
  type?: 'info' | 'success' | 'error' | 'warning';
  role?: string;
  ariaLive?: string;
}
