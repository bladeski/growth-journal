import IndexedDbDataService from '../IndexedDbDataService';
import type { IEveningCheckinData } from '../../interfaces';

export type NormalizeOptions = {
  daysBack?: number; // how many days back to scan (default 3650)
  dryRun?: boolean; // if true, do not write changes
  startDate?: string; // ISO date to start from (overrides daysBack)
};

export async function normalizeReflections(options: NormalizeOptions = {}) {
  const idb = new IndexedDbDataService();
  const daysBack = options.daysBack ?? 3650; // default ~10 years
  const dryRun = !!options.dryRun;

  const toISO = (d: Date) => d.toISOString().slice(0, 10);

  const dates: string[] = [];
  if (options.startDate) {
    dates.push(options.startDate);
  } else {
    const today = new Date();
    for (let i = 0; i < daysBack; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dates.push(toISO(d));
    }
  }

  let checked = 0;
  let updated = 0;
  const changes: Array<{
    date: string;
    before: Partial<IEveningCheckinData>;
    after: Partial<IEveningCheckinData>;
  }> = [];

  for (const date of dates) {
    // eslint-disable-next-line no-await-in-loop
    const rec = await idb.getEveningReflection(date);
    if (!rec) continue;
    checked++;
    const before: Partial<IEveningCheckinData> = {
      ...(rec as IEveningCheckinData),
    };
    const after: Partial<IEveningCheckinData> = {
      ...(rec as IEveningCheckinData),
    };

    // Normalize small_win -> small_wins
    // Some legacy records used `small_win` (singular). Promote it to `small_wins` if empty.
    // Keep both if you need to preserve the original key; here we move the value and remove the old key.
    // NOTE: setEveningReflection uses the same keying strategy so overwriting will update the same record.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyRec: any = after as any;
    if (anyRec.small_win && !anyRec.small_wins) {
      anyRec.small_wins = anyRec.small_win;
      delete anyRec.small_win;
    }

    // Normalize reflection_text -> what_went_well when missing
    if (anyRec.reflection_text && !anyRec.what_went_well) {
      anyRec.what_went_well = anyRec.reflection_text;
      delete anyRec.reflection_text;
    }

    // Keep `insights` and `behaviour_change_notes` as separate optional fields if present.

    // If anything changed, persist (unless dryRun)
    const changed = JSON.stringify(before) !== JSON.stringify(anyRec);
    if (changed) {
      updated++;
      changes.push({ date, before, after: anyRec });
      if (!dryRun) {
        // eslint-disable-next-line no-await-in-loop
        // cast to IEveningCheckinData; IndexedDbDataService will accept it
        await idb.setEveningReflection(anyRec as IEveningCheckinData);
      }
    }
  }

  return {
    checked,
    updated,
    dryRun,
    changes,
  } as const;
}

export default normalizeReflections;
