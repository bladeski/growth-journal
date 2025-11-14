import { IPropTypes } from '../../Base/interfaces/IPropTypes.ts';

export interface IPersonalGrowthProps extends IPropTypes {
  date?: string;
  // Intention/morning fields
  core_value?: string;
  intention?: string;
  focus?: string;
  affirmation?: string;
  // Midday/evening helper fields
  defensive_moment?: string;
  initial_thought?: string;
  healthier_reframe?: string;
  what_went_well?: string;
  defensive_moments?: string;
  empathy_practice?: string;
  small_win?: string;
}
