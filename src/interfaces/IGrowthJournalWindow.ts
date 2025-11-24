export interface IGrowthJournalWindow extends Window {
  __deferredPwaPrompt?: BeforeInstallPromptEvent;
  __gj_theme_pref?: string;
  exportGrowthDb?: () => Promise<void>;
  importGrowthDb?: (jsonOrFile: Record<string, unknown[]> | File) => Promise<void>;
}
