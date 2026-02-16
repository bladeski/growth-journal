import {
  IBooleanQuestion,
  IMultiSelectQuestion,
  INumberQuestion,
  IRatingQuestion,
  ISingleSelectQuestion,
  ITextQuestion,
} from './index.ts';

export type Question =
  | ITextQuestion
  | INumberQuestion
  | IBooleanQuestion
  | ISingleSelectQuestion
  | IMultiSelectQuestion
  | IRatingQuestion;
