export interface IChoiceOption {
  id: string; // stable ID (not label)
  label: string; // human-readable
  value?: string; // optional machine value (defaults to id if absent)
}
