export type ResponseValue =
  | { kind: 'text'; value: string }
  | { kind: 'long-text'; value: string }
  | { kind: 'number'; value: number }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'single-select'; value: string } // option id
  | { kind: 'multi-select'; value: string[] } // option ids
  | { kind: 'rating'; value: number };
