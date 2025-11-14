import { IMiddayCheckinData } from '../../../interfaces/index.ts';

export type IMiddayCheckinEvents = {
  submit: IMiddayCheckinData;
  cancel: void;
};
