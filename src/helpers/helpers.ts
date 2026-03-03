import { I18n, t } from '../i18n/i18n.ts';
import { ISectionTemplate } from '../models/ISectionTemplate.ts';
import { Question } from '../models/Question.ts';
import {
  JournalDayTemplates,
  GenericMap,
  ValueChallengePair,
  TemplateQuestion,
  TemplateSection,
} from '../models/index.ts';
import DataService from '../services/data.service.ts';

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

function normalizeQuestion(i18n: I18n, q: TemplateQuestion): Question {
  switch (q.kind) {
    case 'text':
      return {
        id: q.id,
        kind: 'text',
        prompt: t(i18n, q.promptKey),
        required: q.required,
        placeholder: q.placeholderKey ? t(i18n, q.placeholderKey) : undefined,
        helpText: q.helpTextKey ? t(i18n, q.helpTextKey) : undefined,
      };

    case 'select':
    case 'single-select':
      return {
        id: q.id,
        kind: 'single-select',
        prompt: t(i18n, q.promptKey),
        required: q.required,
        helpText: q.helpTextKey ? t(i18n, q.helpTextKey) : undefined,
        options: (q.options ?? []).map((o) => ({
          id: o.value,
          label: t(i18n, o.labelKey),
          value: o.value,
        })),
      };

    case 'rich-text':
      return {
        id: q.id,
        kind: 'rich-text',
        prompt: t(i18n, q.promptKey),
        required: q.required,
        placeholder: q.placeholderKey ? t(i18n, q.placeholderKey) : undefined,
        helpText: q.helpTextKey ? t(i18n, q.helpTextKey) : undefined,
      };

    default:
      return {
        id: q.id,
        kind: 'text',
        prompt: t(i18n, q.promptKey),
        required: q.required,
        placeholder: q.placeholderKey ? t(i18n, q.placeholderKey) : undefined,
        helpText: q.helpTextKey ? t(i18n, q.helpTextKey) : undefined,
      };
  }
}

function toSectionTemplate(i18n: I18n, section: TemplateSection): ISectionTemplate {
  const base: ISectionTemplate = {
    id: section.id,
    kind: section.kind as ISectionTemplate['kind'],
    title: t(i18n, section.titleKey),
    description: section.descriptionKey ? t(i18n, section.descriptionKey) : '',
    version: section.version,
    questions: section.questions.map((q) => normalizeQuestion(i18n, q)),
  };

  if (section.value != null) base.value = t(i18n, section.value);
  if (section.challenge != null) base.challenge = t(i18n, section.challenge);
  return base;
}

/**
 * Build the four day section templates from JSON and resolve their strings
 * using the provided runtime i18n (so `q.*` keys become real translated text).
 */
export async function getJournalDayTemplates(
  i18n: I18n,
  existingValueChallenge?: ValueChallengePair,
  allowedValues?: readonly string[],
): Promise<{ templates: JournalDayTemplates; valueChallenge: ValueChallengePair } | null> {
  const dataService = DataService.getInstance();
  const tplFile = await dataService.getTemplateFile();
  const valueChallengeMap = await dataService.getValueChallengeMap();
  if (!tplFile || !valueChallengeMap) return null;
  const valueChallenge =
    existingValueChallenge ?? pickRandomValueChallenge(valueChallengeMap, allowedValues);

  const morningRaw = tplFile['morning'];
  const middayRaw = tplFile['midday'];
  const eveningRaw = tplFile['evening'];
  const accountabilityRaw = tplFile['accountability'];

  if (!morningRaw || !middayRaw || !eveningRaw || !accountabilityRaw) return null;

  const logRaw = tplFile['journal-entry'];
  if (!logRaw) return null;

  const morningValue = morningRaw.value ?? valueChallenge.value;
  const morningChallenge = morningRaw.challenge ?? valueChallenge.challenge;

  const morningTpl = toSectionTemplate(i18n, {
    ...morningRaw,
    value: morningValue,
    challenge: morningChallenge,
  });
  const middayTpl = toSectionTemplate(i18n, middayRaw);
  const eveningTpl = toSectionTemplate(i18n, eveningRaw);
  const accountabilityTpl = toSectionTemplate(i18n, accountabilityRaw);
  const logTpl = toSectionTemplate(i18n, logRaw);

  return {
    templates: {
      morning: morningTpl,
      midday: middayTpl,
      evening: eveningTpl,
      accountability: accountabilityTpl,
      log: logTpl,
    },
    valueChallenge,
  };
}

export async function getValueChallengePairs(i18n: I18n): Promise<ValueChallengePair[]> {
  const dataService = DataService.getInstance();
  const areaValueMap = await dataService.getValueChallengeMap();
  const pairs: ValueChallengePair[] = [];
  for (const [area, values] of Object.entries(areaValueMap)) {
    const areaLabel = t(i18n, area);
    for (const value of values) {
      const valueLabel = t(i18n, value);
      pairs.push({ value: valueLabel, challenge: areaLabel });
    }
  }
  return pairs;
}

export async function getAreaValuePairs(i18n: I18n): Promise<{ area: string; values: string[] }[]> {
  const dataService = DataService.getInstance();
  const areaValueMap = await dataService.getAreaValueMap();
  const pairs: { area: string; values: string[] }[] = [];
  for (const [area, values] of Object.entries(areaValueMap)) {
    const areaLabel = t(i18n, area);
    const valueLabels = values.map((v) => t(i18n, v));
    pairs.push({ area: areaLabel, values: valueLabels });
  }
  return pairs;
}

export async function getGrowthAreas(i18n: I18n): Promise<Array<{ id: string; label: string }>> {
  const dataService = DataService.getInstance();
  const areaValueMap = await dataService.getAreaValueMap();
  const keys = Object.keys(areaValueMap) as (keyof typeof areaValueMap)[];
  return keys.map((key) => ({
    id: key,
    label: t(i18n, key),
  }));
}

// ── UI-label helpers ──────────────────────────────────────────────────
// Keep translation concerns out of components: each function returns a
// plain object whose keys match the {{handlebars}} props in the
// corresponding Pug template.

function tr(i18n: I18n, key: string, fallback: string): string {
  const translated = t(i18n, key);
  return translated === key ? fallback : translated;
}

export interface AppLabels {
  loadingText: string;
  loadingAriaLabel: string;
  appTitle: string;
  logoAlt: string;
  dateNavAriaLabel: string;
  prevDayAriaLabel: string;
  nextDayAriaLabel: string;
  dateLabel: string;
  selectDateAriaLabel: string;
  settingsLabel: string;
  openSettingsAriaLabel: string;
  closeSettingsAriaLabel: string;
  growthAreaLabel: string;
  selectGrowthAreaAriaLabel: string;
}

export function getAppLabels(i18n: I18n): AppLabels {
  return {
    loadingText: tr(i18n, 'app.loading', 'Loading\u2026'),
    loadingAriaLabel: tr(i18n, 'app.loadingAria', 'Loading journal'),
    appTitle: tr(i18n, 'app.title', 'Growth Journal'),
    logoAlt: tr(i18n, 'app.logoAlt', 'Growth Journal Logo. A stylised image of a sprout.'),
    dateNavAriaLabel: tr(i18n, 'app.dateNavAria', 'Date navigation'),
    prevDayAriaLabel: tr(i18n, 'app.prevDayAria', 'Previous day'),
    nextDayAriaLabel: tr(i18n, 'app.nextDayAria', 'Next day'),
    dateLabel: tr(i18n, 'app.dateLabel', 'Date:'),
    selectDateAriaLabel: tr(i18n, 'app.selectDateAria', 'Select journal date'),
    settingsLabel: tr(i18n, 'app.settings', 'Settings'),
    openSettingsAriaLabel: tr(i18n, 'app.openSettingsAria', 'Open settings'),
    closeSettingsAriaLabel: tr(i18n, 'app.closeSettingsAria', 'Close settings'),
    growthAreaLabel: tr(i18n, 'app.growthAreaLabel', 'Growth Area:'),
    selectGrowthAreaAriaLabel: tr(i18n, 'app.selectGrowthAreaAria', 'Select growth area'),
  };
}

export interface DayLabels {
  focusAriaLabel: string;
  questionsAriaLabel: string;
  valueLabelPrefix: string;
  challengeLabelPrefix: string;
}

export function getDayLabels(i18n: I18n): DayLabels {
  return {
    focusAriaLabel: tr(i18n, 'journal.day.focusAria', "Today's focus"),
    questionsAriaLabel: tr(i18n, 'journal.day.questionsAria', 'Daily reflection questions'),
    valueLabelPrefix: tr(i18n, 'journal.day.valueLabel', 'Value:'),
    challengeLabelPrefix: tr(i18n, 'journal.day.challengeLabel', 'Challenge:'),
  };
}

/** Build the `entryAriaLabel` that includes the date. */
export function getDayEntryAriaLabel(i18n: I18n, date: string): string {
  return `${tr(i18n, 'journal.day.entryAria', 'Journal entry for')} ${date}`;
}
