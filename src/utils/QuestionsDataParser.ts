// Local lightweight type for parsed question array items. The project doesn't export
// a shared IGrowthQuestionData type, so keep this internal and resilient to shapes.
interface LocalQuestionItem {
  key?: string;
  question?: string;
}
import { LoggingService } from '@bladeski/logger';

const logger = LoggingService.getInstance();

/**
 * QuestionsDataParser - Utility for parsing complex questions API responses
 *
 * Handles various API response shapes that can come from the backend:
 * - { questions: { key: value } }
 * - { data: { questions: { key: value } } }
 * - { data: [{ key: string, question: string }] }
 * - { data: { key: value } }
 */
export class QuestionsDataParser {
  /**
   * Parse questions from API response
   *
   * @param questionsData - Raw API response
   * @returns Object with question values by key
   */
  static parse(questionsData: unknown): Record<string, string> {
    const result: Record<string, string> = {};

    // If top-level object contains known question keys, treat as valid
    const knownKeys = [
      'what_went_well',
      'defensive_moments',
      'empathy_practice',
      'small_win',
      'core_value',
      'intention',
    ];
    if (questionsData && typeof questionsData === 'object' && !Array.isArray(questionsData)) {
      const qd = questionsData as Record<string, unknown>;
      let found = false;
      for (const key of knownKeys) {
        if (typeof qd[key] === 'string') {
          result[key] = qd[key] as string;
          found = true;
        }
      }
      if (found) return result;
    }

    // Try direct questions object first
    const qObj = questionsData as Record<string, unknown> | undefined;
    const questions =
      qObj?.questions || (qObj?.data as Record<string, unknown> | undefined)?.questions;
    if (questions && typeof questions === 'object') {
      // Extract all string fields from the questions object
      const qs = questions as Record<string, unknown>;
      Object.keys(qs).forEach((key) => {
        const val = qs[key];
        if (typeof val === 'string') {
          result[key] = val;
        }
      });

      // If questions has a nested questions object, merge those too
      const nested = (qs.questions as Record<string, unknown> | undefined) || undefined;
      if (nested && typeof nested === 'object') {
        Object.keys(nested).forEach((key) => {
          const val = nested[key];
          if (typeof val === 'string') {
            result[key] = val;
          }
        });
      }

      if (Object.keys(result).length > 0) return result;
    }

    // Fallback: try to extract from data property
    const qData = (questionsData as Record<string, unknown> | undefined)?.data;
    if (!qData) {
      logger.warning('No questions data found', { questionsData });
      return result;
    }
    if (Array.isArray(qData)) {
      const qArr = qData as LocalQuestionItem[];
      qArr.forEach((item) => {
        if (item.key && item.question) {
          result[item.key] = item.question;
        }
      });
      return result;
    }

    if (typeof qData === 'object') {
      const qd = qData as Record<string, unknown>;
      Object.keys(qd).forEach((key) => {
        const val = qd[key];
        if (val === undefined || val === null) return;
        if (typeof val === 'string') {
          result[key] = val;
        } else if (
          typeof val === 'object' &&
          val &&
          'question' in (val as Record<string, unknown>)
        ) {
          const v = val as Record<string, unknown>;
          if (typeof v.question === 'string') result[key] = v.question;
        }
      });
      return result;
    }

    logger.warning('Unexpected questions data shape', { questionsData });
    return result;
  }

  /**
   * Get a specific question value from parsed data
   *
   * @param questionsData - Raw API response
   * @param key - Question key to retrieve
   * @param defaultValue - Default value if key not found
   * @returns Question text or default value
   */
  static get(questionsData: unknown, key: string, defaultValue: string = ''): string {
    const parsed = this.parse(questionsData);
    return parsed[key] || defaultValue;
  }

  /**
   * Get multiple questions from parsed data
   *
   * @param questionsData - Raw API response
   * @param keys - Array of question keys to retrieve
   * @param defaults - Default values for each key
   * @returns Object with question values
   */
  static getMultiple(
    questionsData: unknown,
    keys: string[],
    defaults: Record<string, string> = {},
  ): Record<string, string> {
    const parsed = this.parse(questionsData);
    const result: Record<string, string> = {};

    keys.forEach((key) => {
      result[key] = parsed[key] || defaults[key] || '';
    });

    return result;
  }
}
