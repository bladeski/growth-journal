import { IPropTypes } from '../../Base/interfaces/IPropTypes.ts';

export interface ICheckinHeaderProps extends IPropTypes {
  title?: string;
  description?: string;
  showDailyFocus?: boolean;
  coreValue?: string;
  intention?: string;
  metadata?: string;
}
