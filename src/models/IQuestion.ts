import { IChoiceOption } from './IChoiceOption.ts';
import { ResponseValue } from './ResponseValue.ts';

export interface IQuestionBase {
  id: string;
  prompt: string; // e.g., 'q.intention.prompt'
  required?: boolean;
  helpText?: string; // optional help text key
  icon?: string;
  placeholder?: string; // optional placeholder key
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
  trueLabel?: string; // e.g., 'yes'
  falseLabel?: string; // e.g., 'no'
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
   * Per-value labels, e.g., {1:'rating.1', 5:'rating.5'}.
   * If not present for a value, show the number.
   */
  labels?: Record<number, string>;
}

export interface IRichTextQuestion extends IQuestionBase {
  kind: 'rich-text';
}

export interface IQuestionResponse {
  questionId: string;
  response?: ResponseValue; // undefined => unanswered
  updatedAt?: string; // ISO timestamp
}
