describe('GrowthIntentions seed data', () => {
  test('exports a non-empty array with required fields', async () => {
    // dynamic import to avoid ts-jest ESM type resolution issues
    const GrowthIntentions = (await import('../GrowthIntentions')).default as unknown[];

    expect(Array.isArray(GrowthIntentions)).toBe(true);
    expect(GrowthIntentions.length).toBeGreaterThan(0);

    const sample = GrowthIntentions[0] as Record<string, unknown>;
    expect(sample).toHaveProperty('core_value');
    expect(sample).toHaveProperty('intention');
    expect(sample).toHaveProperty('evening_questions');

    // evening_questions should include at least one of the legacy or canonical small win fields
    const eq = sample.evening_questions as unknown as Record<string, unknown>;
    expect(eq.small_win || eq.small_wins || eq.what_went_well).toBeTruthy();
  });
});
