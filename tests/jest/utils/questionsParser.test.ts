import { QuestionsDataParser } from '../../../src/utils/QuestionsDataParser.ts';

describe('QuestionsDataParser', () => {
  test('parses top-level known keys', () => {
    const input = { small_win: 'Nice', core_value: 'Courage' };
    const res = QuestionsDataParser.parse(input);
    expect(res.small_win).toBe('Nice');
    expect(res.core_value).toBe('Courage');
  });

  test('parses nested questions object', () => {
    const input: Record<string, unknown> = {
      questions: { what_went_well: 'It worked', nested: { question: 'q' } },
    };
    const res = QuestionsDataParser.parse(input);
    expect(res.what_went_well).toBe('It worked');
  });

  test('parses data array fallback', () => {
    const input = { data: [{ key: 'small_win', question: 'Won' }] };
    const res = QuestionsDataParser.parse(input);
    expect(res.small_win).toBe('Won');
  });

  test('get and getMultiple helpers', () => {
    const input = { small_win: 'A', core_value: 'B' };
    expect(QuestionsDataParser.get(input, 'small_win')).toBe('A');
    const multiple = QuestionsDataParser.getMultiple(input, ['small_win', 'core_value']);
    expect(multiple.small_win).toBe('A');
    expect(multiple.core_value).toBe('B');
  });
});
