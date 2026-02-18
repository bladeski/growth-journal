import { IJournalEntry } from '../models/index.ts';
import { createJournalEntry, upsertResponse } from '../models/logic.ts';
import { SectionKind } from '../models/SectionKind.ts';
import { StoragePort, createStorage } from '../storage/index.ts';
import { ResponseValue } from '../models/index.ts';

// const byKind = {
//   'morning-intention': MorningTemplateV1,
//   'midday-checkin': MiddayTemplateV1,
//   'evening-reflection': EveningTemplateV1,
//   accountability: AccountabilityTemplateV1,
// } as const;

export class JournalService {
  private storage!: StoragePort;
  private ready: Promise<void>;

  constructor() {
    this.ready = (async () => {
      this.storage = await createStorage();
    })();
  }

  async ensureDay(dateISO: string): Promise<IJournalEntry> {
    await this.ready;
    const existing = await this.storage.getEntry(dateISO);
    if (existing) return existing;

    const entry = createJournalEntry(dateISO);
    // Optionally pre-initialize sections
    // entry.morningIntention = emptySectionState(MorningTemplateV1);
    // entry.middayCheckin = emptySectionState(MiddayTemplateV1);
    // entry.eveningReflection = emptySectionState(EveningTemplateV1);
    // entry.accountability = emptySectionState(AccountabilityTemplateV1);
    await this.save(entry);
    return entry;
  }

  async save(entry: IJournalEntry): Promise<void> {
    await this.ready;
    entry.updatedAt = new Date().toISOString();
    await this.storage.saveEntry(entry);
  }

  async applyAnswer(
    entry: IJournalEntry,
    detail: { sectionKind: SectionKind; questionId: string; value: ResponseValue },
  ): Promise<IJournalEntry> {
    await this.ready;
    const copy: IJournalEntry = JSON.parse(JSON.stringify(entry));
    const key =
      detail.sectionKind === 'morning-reset'
        ? 'morningIntention'
        : detail.sectionKind === 'midday-checkin'
          ? 'middayCheckin'
          : detail.sectionKind === 'evening-reflection'
            ? 'eveningReflection'
            : 'accountability';

    // const tpl = byKind[detail.sectionKind];
    // copy[key] = copy[key] ?? emptySectionState(tpl);
    copy[key] = upsertResponse(copy[key]!, {
      questionId: detail.questionId,
      response: detail.value,
    });
    copy.updatedAt = new Date().toISOString();
    await this.storage.saveEntry(copy);
    return copy;
  }

  // Extra convenience queries
  async listDates(): Promise<string[]> {
    await this.ready;
    return this.storage.listDates();
  }

  async entriesSince(updatedAtISO: string) {
    await this.ready;
    return this.storage.sinceUpdated(updatedAtISO);
  }

  async entriesInRange(startISO: string, endISO: string) {
    await this.ready;
    return this.storage.byDateRange(startISO, endISO);
  }

  async entriesByTag(tag: string) {
    await this.ready;
    return this.storage.byTag(tag);
  }
}
