import { I18n, t } from '../i18n/i18n.ts';
import { ISectionTemplate } from '../models/ISectionTemplate.ts';
import { Question } from '../models/Question.ts';
import {
  JournalDayTemplates,
  SectionTemplateWithMeta,
  TemplateFile,
  TemplateQuestion,
  GenericMap,
  ValueChallengePair,
  TemplateSection,
} from '../models/index.ts';

import TemplateData from '../data/templates/template.json' with { type: 'json' };
import ValueChallengeMap from '../data/maps/value-challenge-map.json' with { type: 'json' };
import AreaValueMap from '../data/maps/area-value-map.json' with { type: 'json' };

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function pickRandomValueChallenge(
  map: GenericMap,
  allowedValues?: readonly string[],
): ValueChallengePair {
  const values = Object.keys(map);
  const candidates =
    allowedValues && allowedValues.length
      ? values.filter((v) => allowedValues.includes(v))
      : values;
  if (candidates.length === 0) return { value: 'val-integrity', challenge: 'ch-integrity-1' };
  const value = pickRandom(candidates);
  const challenges = map[value] ?? [];
  const challenge = challenges.length ? pickRandom(challenges) : 'ch-integrity-1';
  return { value, challenge };
}

function normalizeQuestion(q: TemplateQuestion): Question {
  switch (q.kind) {
    case 'text':
      return {
        id: q.id,
        kind: 'text',
        promptKey: q.promptKey,
        required: q.required,
        placeholderKey: q.placeholderKey,
        helpTextKey: q.helpTextKey,
      };

    // template.json uses `select`, app model uses `single-select`
    case 'select':
    case 'single-select':
      return {
        id: q.id,
        kind: 'single-select',
        promptKey: q.promptKey,
        required: q.required,
        helpTextKey: q.helpTextKey,
        options: (q.options ?? []).map((o) => ({
          id: o.value,
          labelKey: o.labelKey,
          value: o.value,
        })),
      };

    default:
      // Fall back to a text question to avoid hard crashes in the UI
      return {
        id: q.id,
        kind: 'text',
        promptKey: q.promptKey,
        required: q.required,
        placeholderKey: q.placeholderKey,
        helpTextKey: q.helpTextKey,
      };
  }
}

function toSectionTemplate(section: TemplateSection): SectionTemplateWithMeta {
  const base: SectionTemplateWithMeta = {
    id: section.id,
    kind: section.kind as ISectionTemplate['kind'],
    titleKey: section.titleKey,
    descriptionKey: section.descriptionKey,
    version: section.version,
    questions: section.questions.map(normalizeQuestion),
  };

  if (section.value != null) base.value = section.value;
  if (section.challenge != null) base.challenge = section.challenge;
  return base;
}

function resolveQuestionStrings(i18n: I18n, q: Question): Question {
  switch (q.kind) {
    case 'text':
    case 'long-text':
      return {
        ...q,
        promptKey: t(i18n, q.promptKey),
        placeholderKey: q.placeholderKey ? t(i18n, q.placeholderKey) : undefined,
        helpTextKey: q.helpTextKey ? t(i18n, q.helpTextKey) : undefined,
      };

    case 'number':
      return {
        ...q,
        promptKey: t(i18n, q.promptKey),
        helpTextKey: q.helpTextKey ? t(i18n, q.helpTextKey) : undefined,
      };

    case 'boolean':
      return {
        ...q,
        promptKey: t(i18n, q.promptKey),
        helpTextKey: q.helpTextKey ? t(i18n, q.helpTextKey) : undefined,
        trueLabelKey: q.trueLabelKey ? t(i18n, q.trueLabelKey) : undefined,
        falseLabelKey: q.falseLabelKey ? t(i18n, q.falseLabelKey) : undefined,
      };

    case 'single-select':
    case 'multi-select':
      return {
        ...q,
        promptKey: t(i18n, q.promptKey),
        helpTextKey: q.helpTextKey ? t(i18n, q.helpTextKey) : undefined,
        options: q.options.map((o) => ({
          ...o,
          labelKey: t(i18n, o.labelKey),
        })),
      };

    case 'rating': {
      const nextLabelKeys: Record<number, string> | undefined = q.labelKeys
        ? (Object.fromEntries(
            Object.entries(q.labelKeys).map(([k, v]) => [Number(k), t(i18n, v)]),
          ) as Record<number, string>)
        : undefined;

      return {
        ...q,
        promptKey: t(i18n, q.promptKey),
        helpTextKey: q.helpTextKey ? t(i18n, q.helpTextKey) : undefined,
        labelKeys: nextLabelKeys,
      };
    }
  }
}

function resolveTemplateStrings(i18n: I18n, tpl: SectionTemplateWithMeta): SectionTemplateWithMeta {
  return {
    ...tpl,
    titleKey: t(i18n, tpl.titleKey),
    descriptionKey: tpl.descriptionKey ? t(i18n, tpl.descriptionKey) : undefined,
    value: tpl.value != null ? t(i18n, tpl.value) : undefined,
    challenge: tpl.challenge != null ? t(i18n, tpl.challenge) : undefined,
    questions: tpl.questions.map((q) => resolveQuestionStrings(i18n, q)),
  };
}

/**
 * Build the four day section templates from JSON and resolve their strings
 * using the provided runtime i18n (so `q.*` keys become real translated text).
 */
export function getJournalDayTemplates(
  i18n: I18n,
  existingValueChallenge?: ValueChallengePair,
  allowedValues?: readonly string[],
): { templates: JournalDayTemplates; valueChallenge: ValueChallengePair } | null {
  const tplFile = TemplateData as unknown as TemplateFile;
  const valueChallenge =
    existingValueChallenge ??
    pickRandomValueChallenge(ValueChallengeMap as unknown as GenericMap, allowedValues);

  const { value, challenge } = valueChallenge;

  const morningRaw = tplFile['morning'];
  const middayRaw = tplFile['midday'];
  const eveningRaw = tplFile['evening'];
  const accountabilityRaw = tplFile['accountability'];

  if (!morningRaw || !middayRaw || !eveningRaw || !accountabilityRaw) return null;

  const morningValue = morningRaw.value === '{{ value }}' ? value : morningRaw.value;
  const morningChallenge =
    morningRaw.challenge === '{{ challenge }}' ? challenge : morningRaw.challenge;

  const morningTpl = resolveTemplateStrings(
    i18n,
    toSectionTemplate({
      ...(morningRaw as TemplateSection),
      value: morningValue,
      challenge: morningChallenge,
    }),
  );
  const middayTpl = resolveTemplateStrings(i18n, toSectionTemplate(middayRaw as TemplateSection));
  const eveningTpl = resolveTemplateStrings(i18n, toSectionTemplate(eveningRaw as TemplateSection));
  const accountabilityTpl = resolveTemplateStrings(
    i18n,
    toSectionTemplate(accountabilityRaw as TemplateSection),
  );

  return {
    templates: {
      morning: morningTpl,
      midday: middayTpl,
      evening: eveningTpl,
      accountability: accountabilityTpl,
    },
    valueChallenge,
  };
}

export function getGrowthAreas(i18n: I18n): Array<{ id: string; label: string }> {
  const keys = Object.keys(AreaValueMap) as (keyof typeof AreaValueMap)[];
  return keys.map((key) => ({
    id: key,
    label: t(i18n, key),
  }));
}
