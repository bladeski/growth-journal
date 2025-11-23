import { QuestionsDataParser } from '../../../src/utils/QuestionsDataParser';

describe('QuestionsDataParser', () => {
  test('parses top-level known keys', () => {
    const input = { what_went_well: 'Good', intention: 'Focus' };
    const res = QuestionsDataParser.parse(input);
    expect(res.what_went_well).toBe('Good');
    expect(res.intention).toBe('Focus');
  });

  test('parses questions object and nested questions', () => {
    const input = { questions: { a: 'A', questions: { b: 'B', c: 'C' } } } as any;
    const res = QuestionsDataParser.parse(input);
    expect(res.a).toBe('A');
    expect(res.b).toBe('B');
    expect(res.c).toBe('C');
  });

  test('parses data array of question items', () => {
    const input = { data: [{ key: 'k1', question: 'Q1' }, { key: 'k2', question: 'Q2' }] };
    const res = QuestionsDataParser.parse(input);
    expect(res.k1).toBe('Q1');
    expect(res.k2).toBe('Q2');
  });

  test('parses data object with question field objects', () => {
    const input = { data: { x: { question: 'XQ' }, y: 'YQ', z: null } } as any;
    const res = QuestionsDataParser.parse(input);
    expect(res.x).toBe('XQ');
    expect(res.y).toBe('YQ');
    expect(res.z).toBeUndefined();
  });

  test('get returns default when missing', () => {
    expect(QuestionsDataParser.get({}, 'missing', 'def')).toBe('def');
  });

  test('getMultiple returns defaults for missing keys', () => {
    const input = { questions: { a: 'A' } };
    const res = QuestionsDataParser.getMultiple(input, ['a', 'b'], { b: 'B' });
    expect(res.a).toBe('A');
    expect(res.b).toBe('B');
  });
});