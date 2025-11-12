import { PropTypes } from '..';

export interface MessageComponentProps extends PropTypes {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  role?: string;
  ariaLive?: string;
}
