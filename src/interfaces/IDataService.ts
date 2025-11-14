import { IDashboardAnalytics } from './IDashboardAnalytics.ts';
import { IEveningCheckinData } from './IEveningCheckinData.ts';
import { IEveningQuestionsData } from './IEveningQuestionsData.ts';
import { IGrowthIntentionData } from './IGrowthIntentionData.ts';
import { IMiddayCheckinData } from './IMiddayCheckinData.ts';
import { IMiddayQuestionsData } from './IMiddayQuestionsData.ts';
import { IMonthlyReflectionData } from './IMonthlyReflectionData.ts';
import { IMorningCheckinData } from './IMorningCheckinData.ts';
import { IWeeklyReviewData } from './IWeeklyReviewData.ts';

export interface IDataService {
  getDashboardAnalytics(): Promise<IDashboardAnalytics>;

  getGrowthIntentions(): Promise<IGrowthIntentionData[]>;
  setGrowthIntentions(intentions: IGrowthIntentionData[]): Promise<boolean>;

  getGrowthIntention(date: string): Promise<IGrowthIntentionData | null>;

  getMorningIntention(date: string): Promise<IGrowthIntentionData[]>;
  setMorningCheckin(data: IMorningCheckinData): Promise<boolean>;
  getMorningCheckin(date: string): Promise<IMorningCheckinData | null>;

  getMiddayQuestions(date: string): Promise<IMiddayQuestionsData | null>;
  setMiddayCheckin(data: IMiddayCheckinData | Record<string, unknown>): Promise<boolean>;
  getMiddayCheckin(date: string): Promise<IMiddayCheckinData | null>;

  getEveningQuestions(date: string): Promise<IEveningQuestionsData | null>;
  setEveningReflection(data: IEveningCheckinData | Record<string, unknown>): Promise<boolean>;
  getEveningReflection(date: string): Promise<IEveningCheckinData | null>;

  setWeeklyReview(data: IWeeklyReviewData): Promise<boolean>;
  getWeeklyReview(date: string): Promise<IWeeklyReviewData | null>;

  setMonthlyReview(data: IMonthlyReflectionData): Promise<boolean>;
  getMonthlyReview(date: string): Promise<IMonthlyReflectionData | null>;
}
