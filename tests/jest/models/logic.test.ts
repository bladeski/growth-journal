import { emptySectionState, createJournalEntry, upsertResponse } from '../../../src/models/logic.ts';
import { ISectionTemplate, ISectionState, IQuestionResponse } from '../../../src/models/index.ts';

describe('logic.ts', () => {
  describe('emptySectionState', () => {
    test('creates section state from template', () => {
      const template: ISectionTemplate = {
        id: 'tpl-1',
        kind: 'morning-reset',
        titleKey: 'morning-reset-title',
        version: 1,
        questions: [
          { id: 'q1', promptKey: 'Question 1', kind: 'text', required: true },
          { id: 'q2', promptKey: 'Question 2', kind: 'text', required: false },
        ],
      };

      const result = emptySectionState(template);

      expect(result.templateId).toBe('tpl-1');
      expect(result.kind).toBe('morning-reset');
      expect(result.responses).toHaveLength(2);
      expect(result.responses[0].questionId).toBe('q1');
      expect(result.responses[1].questionId).toBe('q2');
    });

    test('creates empty responses array for template with no questions', () => {
      const template: ISectionTemplate = {
        id: 'tpl-empty',
        kind: 'evening-reflection',
        titleKey: 'evening-reflection-title',
        version: 1,
        questions: [],
      };

      const result = emptySectionState(template);

      expect(result.templateId).toBe('tpl-empty');
      expect(result.responses).toHaveLength(0);
    });
  });

  describe('createJournalEntry', () => {
    test('creates journal entry with correct date', () => {
      const dateISO = '2026-02-18T10:30:45.123Z';

      const result = createJournalEntry(dateISO);

      expect(result.date).toBe('2026-02-18');
      expect(result.id).toBeTruthy();
      expect(result.createdAt).toBeTruthy();
      expect(result.updatedAt).toBeTruthy();
    });

    test('truncates date to YYYY-MM-DD format', () => {
      const result1 = createJournalEntry('2026-02-18T00:00:00.000Z');
      const result2 = createJournalEntry('2026-02-18T23:59:59.999Z');

      expect(result1.date).toBe('2026-02-18');
      expect(result2.date).toBe('2026-02-18');
    });

    test('creates entry with timestamps in ISO format', () => {
      const result = createJournalEntry('2026-02-18');

      expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(result.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(result.createdAt).toBe(result.updatedAt);
    });

    test('generates unique IDs for each entry', () => {
      const result1 = createJournalEntry('2026-02-18');
      const result2 = createJournalEntry('2026-02-18');

      expect(result1.id).not.toBe(result2.id);
    });
  });

  describe('upsertResponse', () => {
    test('adds new response when question not found', () => {
      const section: ISectionState = {
        templateId: 'tpl-1',
        kind: 'morning-reset',
        responses: [
          { questionId: 'q1', response: { kind: 'text', value: 'answer1' } },
        ],
      };

      const newResponse: IQuestionResponse = {
        questionId: 'q2',
        response: { kind: 'text', value: 'answer2' },
      };

      const result = upsertResponse(section, newResponse);

      expect(result.responses).toHaveLength(2);
      expect(result.responses[1].questionId).toBe('q2');
      expect(result.responses[1].response).toEqual({ kind: 'text', value: 'answer2' });
      expect(result.responses[1].updatedAt).toBeTruthy();
    });

    test('updates existing response when question found', () => {
      const section: ISectionState = {
        templateId: 'tpl-1',
        kind: 'morning-reset',
        responses: [
          {
            questionId: 'q1',
            response: { kind: 'text', value: 'old answer' },
            updatedAt: '2026-02-17T10:00:00.000Z',
          },
          { questionId: 'q2', response: { kind: 'text', value: 'answer2' } },
        ],
      };

      const newResponse: IQuestionResponse = {
        questionId: 'q1',
        response: { kind: 'text', value: 'new answer' },
      };

      const result = upsertResponse(section, newResponse);

      expect(result.responses).toHaveLength(2);
      expect(result.responses[0].questionId).toBe('q1');
      expect(result.responses[0].response).toEqual({ kind: 'text', value: 'new answer' });
      expect(new Date(result.responses[0].updatedAt || '').getTime()).toBeGreaterThan(
        new Date('2026-02-17T10:00:00.000Z').getTime()
      );
    });

    test('preserves other responses when updating one', () => {
      const section: ISectionState = {
        templateId: 'tpl-1',
        kind: 'morning-reset',
        responses: [
          { questionId: 'q1', response: { kind: 'text', value: 'answer1' } },
          { questionId: 'q2', response: { kind: 'text', value: 'answer2' } },
          { questionId: 'q3', response: { kind: 'text', value: 'answer3' } },
        ],
      };

      const newResponse: IQuestionResponse = {
        questionId: 'q2',
        response: { kind: 'text', value: 'new answer2' },
      };

      const result = upsertResponse(section, newResponse);

      expect(result.responses).toHaveLength(3);
      expect(result.responses[0].response).toEqual({ kind: 'text', value: 'answer1' });
      expect(result.responses[1].response).toEqual({ kind: 'text', value: 'new answer2' });
      expect(result.responses[2].response).toEqual({ kind: 'text', value: 'answer3' });
    });

    test('does not mutate original section', () => {
      const section: ISectionState = {
        templateId: 'tpl-1',
        kind: 'morning-reset',
        responses: [
          { questionId: 'q1', response: { kind: 'text', value: 'answer1' } },
        ],
      };

      const originalLength = section.responses.length;
      const originalResponse = section.responses[0];

      const newResponse: IQuestionResponse = {
        questionId: 'q2',
        response: { kind: 'text', value: 'answer2' },
      };

      const result = upsertResponse(section, newResponse);

      expect(section.responses).toHaveLength(originalLength);
      expect(section.responses[0]).toBe(originalResponse);
      expect(result).not.toBe(section);
      expect(result.responses).toHaveLength(originalLength + 1);
    });

    test('handles updating first response', () => {
      const section: ISectionState = {
        templateId: 'tpl-1',
        kind: 'morning-reset',
        responses: [
          { questionId: 'q1', response: { kind: 'text', value: 'answer1' } },
          { questionId: 'q2', response: { kind: 'text', value: 'answer2' } },
        ],
      };

      const newResponse: IQuestionResponse = {
        questionId: 'q1',
        response: { kind: 'text', value: 'updated1' },
      };

      const result = upsertResponse(section, newResponse);

      expect(result.responses[0].response).toEqual({ kind: 'text', value: 'updated1' });
      expect(result.responses[1].response).toEqual({ kind: 'text', value: 'answer2' });
    });

    test('handles updating last response', () => {
      const section: ISectionState = {
        templateId: 'tpl-1',
        kind: 'morning-reset',
        responses: [
          { questionId: 'q1', response: { kind: 'text', value: 'answer1' } },
          { questionId: 'q2', response: { kind: 'text', value: 'answer2' } },
        ],
      };

      const newResponse: IQuestionResponse = {
        questionId: 'q2',
        response: { kind: 'text', value: 'updated2' },
      };

      const result = upsertResponse(section, newResponse);

      expect(result.responses[0].response).toEqual({ kind: 'text', value: 'answer1' });
      expect(result.responses[1].response).toEqual({ kind: 'text', value: 'updated2' });
    });

    test('preserves section template metadata', () => {
      const section: ISectionState = {
        templateId: 'tpl-unique',
        kind: 'evening-reflection',
        responses: [{ questionId: 'q1', response: { kind: 'text', value: 'answer1' } }],
      };

      const result = upsertResponse(section, {
        questionId: 'q2',
        response: { kind: 'text', value: 'answer2' },
      });

      expect(result.templateId).toBe('tpl-unique');
      expect(result.kind).toBe('evening-reflection');
    });
  });
});
