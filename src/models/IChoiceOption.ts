import { MsgKey } from '../i18n/i18n.ts';

export interface IChoiceOption {
  id: string; // stable ID (not label)
  labelKey: MsgKey; // human-readable
  value?: string; // optional machine value (defaults to id if absent)
}
