import { IMonthlyReflectionData } from '../../../interfaces/index.ts';

export type IMonthlyReflectionEvents = {
  submit: IMonthlyReflectionData;
  cancel: void;
};
