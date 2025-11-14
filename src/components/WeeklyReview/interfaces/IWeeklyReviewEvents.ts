import { IWeeklyReviewData } from '../../../interfaces/IWeeklyReviewData.ts';

export type IWeeklyReviewEvents = {
  submit: IWeeklyReviewData;
  cancel: void;
};
