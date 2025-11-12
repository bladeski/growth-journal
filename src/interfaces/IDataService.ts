import { IDashboardAnalytics } from './IDashboardAnalytics';
import { IEveningCheckinData } from './IEveningCheckinData';
import { IEveningQuestionsData } from './IEveningQuestionsData';
import { IGrowthIntentionData } from './IGrowthIntentionData';
import { IMiddayCheckinData } from './IMiddayCheckinData';
import { IMiddayQuestionsData } from './IMiddayQuestionsData';
import { IMonthlyReflectionData } from './IMonthlyReflectionData';
import { IMorningCheckinData } from './IMorningCheckinData';
import { IWeeklyReviewData } from './IWeeklyReviewData';

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
