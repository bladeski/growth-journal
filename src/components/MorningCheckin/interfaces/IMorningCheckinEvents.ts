import { IMorningCheckinData } from '../../../interfaces/index.ts';

export type IMorningCheckinEvents = {
  submit: IMorningCheckinData;
  cancel: void;
};
