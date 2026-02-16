import { MsgKey } from '../i18n/i18n.ts';
import { IChoiceOption } from './IChoiceOption.ts';
import { ResponseValue } from './ResponseValue.ts';

export interface IQuestionBase {
  id: string;
  promptKey: MsgKey; // e.g., 'q.intention.prompt'
  required?: boolean;
  helpTextKey?: MsgKey; // optional help text key
  icon?: string;
  placeholderKey?: MsgKey; // optional placeholder key
}

export interface ITextQuestion extends IQuestionBase {
  kind: 'text' | 'long-text';
  minLength?: number;
  maxLength?: number;
  multiline?: boolean;
}

export interface INumberQuestion extends IQuestionBase {
  kind: 'number';
  min?: number;
  max?: number;
  step?: number;
}

export interface IBooleanQuestion extends IQuestionBase {
  kind: 'boolean';
  trueLabelKey?: MsgKey; // e.g., 'yes'
  falseLabelKey?: MsgKey; // e.g., 'no'
}

export interface ISingleSelectQuestion extends IQuestionBase {
  kind: 'single-select';
  options: IChoiceOption[];
}

export interface IMultiSelectQuestion extends IQuestionBase {
  kind: 'multi-select';
  options: IChoiceOption[];
  maxSelections?: number;
}

export interface IRatingQuestion extends IQuestionBase {
  kind: 'rating';
  scaleMin?: number;
  scaleMax?: number;
  /**
   * Per-value label keys, e.g., {1:'rating.1', 5:'rating.5'}.
   * If not present for a value, show the number.
   */
  labelKeys?: Record<number, MsgKey>;
}

export interface IQuestionResponse {
  questionId: string;
  response?: ResponseValue; // undefined => unanswered
  updatedAt?: string; // ISO timestamp
}
