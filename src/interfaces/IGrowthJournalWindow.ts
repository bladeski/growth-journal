export interface IGrowthJournalWindow extends Window {
  __deferredPwaPrompt?: BeforeInstallPromptEvent;
  exportGrowthDb?: () => Promise<void>;
  importGrowthDb?: (jsonOrFile: Record<string, unknown[]> | File) => Promise<void>;
}
