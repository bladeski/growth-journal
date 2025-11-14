describe('GrowthIntentions seed data', () => {
  test('exports a non-empty array with required fields', async () => {
    const GrowthIntentions = (await import('../../../src/data/GrowthIntentions.ts')).default as unknown[];

    expect(Array.isArray(GrowthIntentions)).toBe(true);
    expect(GrowthIntentions.length).toBeGreaterThan(0);

    const sample = GrowthIntentions[0] as Record<string, unknown>;
    expect(sample).toHaveProperty('core_value');
    expect(sample).toHaveProperty('intention');
    expect(sample).toHaveProperty('evening_questions');

    const eq = sample.evening_questions as unknown as Record<string, unknown>;
    expect(eq.small_win || eq.small_wins || eq.what_went_well).toBeTruthy();
  });
});
