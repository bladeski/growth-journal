import { LoggingService } from '@bladeski/logger';
import './components/index';
import { PWAManager } from './utils/pwa';
import GrowthIntentions from './data/GrowthIntentions';
import IndexedDbDataService from './data/IndexedDbDataService';
import { ILoggingConfigurationOptions } from '@bladeski/logger/dist/interfaces';

// Initialize PWA functionality
const pwaManager = new PWAManager();

// App initialization
function initializeApp() {
  const options: ILoggingConfigurationOptions = {
    applicationName: 'growth-journal',
    enableConsoleCore: true,
    enableLocalStorageCore: true,
  };
  LoggingService.initialize(options);
  const logger = LoggingService.getInstance();

  logger.info('🌱 Growth Journal is starting...');

  // Check if running as PWA
  if (PWAManager.isPWA()) {
    logger.info('Running as PWA');
    document.body.classList.add('pwa-mode');
  }

  // Initialize any additional app features here
  setupWelcomeMessage();

  const app = new GrowthJournalApp();

  // Make app globally available for debugging
  (window as unknown as { app?: GrowthJournalApp }).app = app;
}

function setupWelcomeMessage() {
  const welcomeSection = document.querySelector('.welcome-section');
  if (welcomeSection) {
    const statusMessage = document.createElement('p');
    statusMessage.className = 'pwa-status';

    if (pwaManager.getOnlineStatus()) {
      statusMessage.textContent = '✅ Ready to capture your growth journey!';
    } else {
      statusMessage.textContent = '📱 Offline mode - your entries will sync later';
    }

    welcomeSection.appendChild(statusMessage);
  }
}

async function seedIntentionsIfNeeded(): Promise<void> {
  try {
    const key = 'growth-intentions-seeded';
    const seeded = localStorage.getItem(key);
    if (seeded === '1') return;

    // Wait for service worker to be ready so messages will be handled
    if ('serviceWorker' in navigator) {
      await navigator.serviceWorker.ready;
    }

    const svc = new IndexedDbDataService();
    const ok = await svc.setGrowthIntentions(GrowthIntentions);
    if (ok) {
      try {
        localStorage.setItem(key, '1');
      } catch (e) {
        // ignore storage errors
      }
      console.log('Seeded growth intentions into IndexedDB');
    } else {
      console.warn('Failed to seed growth intentions into IndexedDB');
    }
  } catch (err) {
    // Do not block app startup on seed errors
    // eslint-disable-next-line no-console
    console.warn('Seeding growth intentions failed', err);
  }
}

class GrowthJournalApp {
  private dashboard: HTMLElement | null;
  private appRoot: HTMLElement | null;
  // Components will be created dynamically when needed and removed when hidden
  private morningCheckin: HTMLElement | null = null;
  private middayCheckin: HTMLElement | null = null;
  private eveningCheckin: HTMLElement | null = null;
  private weeklyReview: HTMLElement | null = null;
  private monthlyReflection: HTMLElement | null = null;
  private personalGrowth: HTMLElement | null = null;
  private currentView:
    | 'dashboard'
    | 'morning'
    | 'midday'
    | 'evening'
    | 'weekly'
    | 'monthly'
    | 'growth' = 'dashboard';
  private navigationHistory: Array<
    'dashboard' | 'morning' | 'midday' | 'evening' | 'weekly' | 'monthly' | 'growth'
  > = [];
  private logger: LoggingService = LoggingService.getInstance();

  constructor() {
    this.appRoot = document.getElementById('app');
    this.dashboard = document.getElementById('dashboard');

    this.setupEventListeners();
    this.showDashboard();
  }

  private setupEventListeners(): void {
    // Dashboard events
    if (this.dashboard) {
      this.dashboard.addEventListener('newMorningCheckin', () => this.showMorningCheckin());
      this.dashboard.addEventListener('newMiddayCheckin', () => this.showMiddayCheckin());
      this.dashboard.addEventListener('newEveningCheckin', () => this.showEveningCheckin());
      this.dashboard.addEventListener('newWeeklyReview', () => this.showWeeklyReview());
      this.dashboard.addEventListener('newMonthlyReflection', () => this.showMonthlyReflection());
      this.dashboard.addEventListener('newWeeklyCheckin', () => this.showWeeklyReview());
      this.dashboard.addEventListener('newMonthlyCheckin', () => this.showMonthlyReflection());
      this.dashboard.addEventListener('newPersonalGrowth', () => this.showPersonalGrowth());
      this.dashboard.addEventListener('openPersonalGrowth', () => this.showPersonalGrowth());
      this.dashboard.addEventListener('viewAnalytics', () => {
        this.logger.info('Analytics view requested');
        alert('Analytics feature coming soon!');
      });
    }

    // Check-in and review completion events
    document.addEventListener('checkin-completed', (event: Event) => {
      const e = event as CustomEvent<{ type: string; data: unknown }>;
      this.logger.info(`${e.detail.type} check-in completed`, { data: e.detail.data });
      this.showDashboard();
      this.tryRefresh(this.dashboard);
    });

    document.addEventListener('review-completed', (event: Event) => {
      const e = event as CustomEvent<{ type: string; data: unknown }>;
      this.logger.info(`${e.detail.type} review completed`, { data: e.detail.data });
      this.showDashboard();
      this.tryRefresh(this.dashboard);
    });

    document.addEventListener('reflection-completed', (event: Event) => {
      const e = event as CustomEvent<{ type: string; data: unknown }>;
      this.logger.info(`${e.detail.type} reflection completed`, { data: e.detail.data });
      this.showDashboard();
      this.tryRefresh(this.dashboard);
    });

    document.addEventListener('navigate-back', () => {
      this.showDashboard();
    });

    // Component-specific events are attached when components are created dynamically
  }

  // Type guard for elements exposing setDate(date: string)
  private isDateSettable(el: unknown): el is { setDate: (d: string) => void } {
    if (typeof el !== 'object' || el === null) return false;
    const maybe = el as Record<string, unknown>;
    return 'setDate' in maybe && typeof maybe['setDate'] === 'function';
  }

  private isRefreshable(el: unknown): el is { refresh: () => void } {
    if (typeof el !== 'object' || el === null) return false;
    const maybe = el as Record<string, unknown>;
    return 'refresh' in maybe && typeof maybe['refresh'] === 'function';
  }

  private tryRefresh(el: unknown): void {
    if (this.isRefreshable(el)) {
      try {
        el.refresh();
      } catch (e) {
        this.logger.warning('Failed to refresh dashboard element', { error: e });
      }
    }
  }

  private hideAllViews(): void {
    // Hide dashboard visually
    if (this.dashboard) this.dashboard.style.display = 'none';

    // Remove any dynamically created components from the DOM
    this.removeComponent(this.morningCheckin);
    this.morningCheckin = null;
    this.removeComponent(this.middayCheckin);
    this.middayCheckin = null;
    this.removeComponent(this.eveningCheckin);
    this.eveningCheckin = null;
    this.removeComponent(this.weeklyReview);
    this.weeklyReview = null;
    this.removeComponent(this.monthlyReflection);
    this.monthlyReflection = null;
    this.removeComponent(this.personalGrowth);
    this.personalGrowth = null;
  }

  private createAndAppend(tagName: string, id?: string): HTMLElement {
    const el = document.createElement(tagName) as HTMLElement;
    if (id) el.id = id;
    if (this.appRoot) this.appRoot.appendChild(el);
    return el;
  }

  private removeComponent(el: HTMLElement | null): void {
    if (!el) return;
    if (el.parentElement) el.parentElement.removeChild(el);
  }

  private showDashboard(): void {
    this.navigationHistory = []; // Clear history when going to dashboard
    this.currentView = 'dashboard';
    this.hideAllViews();
    if (this.dashboard) {
      this.dashboard.style.display = 'block';
    }
  }

  private showMorningCheckin(date?: string, skipHistory = false): void {
    // Guard against duplicate rapid calls that would push history twice
    if (this.currentView === 'morning') {
      this.logger.info('Ignoring duplicate showMorningCheckin call while already on morning view');
      return;
    }
    if (!skipHistory) {
      this.logger.info('Pushing to history before showing morning checkin', {
        current: this.currentView,
        historyLength: this.navigationHistory.length,
      });
      this.navigationHistory.push(this.currentView);
    }
    this.currentView = 'morning';
    this.hideAllViews();
    if (!this.morningCheckin) {
      this.morningCheckin = this.createAndAppend('morning-checkin', 'morning-checkin');
      // attach events
      this.morningCheckin.addEventListener('submit', (event: Event) => {
        const e = event as CustomEvent<unknown>;
        this.logger.info('Morning checkin submitted', { data: e.detail });
        this.goBack();
        this.tryRefresh(this.dashboard);
      });
      this.morningCheckin.addEventListener('cancel', () => {
        this.logger.info('Morning checkin cancel event received');
        this.goBack();
      });
    }
    this.morningCheckin.style.display = 'block';
    if (date && this.isDateSettable(this.morningCheckin)) {
      this.morningCheckin.setDate(date);
    }
  }

  private showMiddayCheckin(date?: string, skipHistory = false): void {
    if (!skipHistory) {
      this.navigationHistory.push(this.currentView);
    }
    this.currentView = 'midday';
    this.hideAllViews();
    if (!this.middayCheckin) {
      this.middayCheckin = this.createAndAppend('midday-checkin', 'midday-checkin');
      this.middayCheckin.addEventListener('submit', (event: Event) => {
        const e = event as CustomEvent<unknown>;
        this.logger.info('Midday checkin submitted', { data: e.detail });
        this.goBack();
        this.tryRefresh(this.dashboard);
      });
      this.middayCheckin.addEventListener('cancel', () => this.goBack());
    }
    this.middayCheckin.style.display = 'block';
    if (date && this.isDateSettable(this.middayCheckin)) {
      this.middayCheckin.setDate(date);
    }
  }

  private showEveningCheckin(date?: string, skipHistory = false): void {
    if (!skipHistory) {
      this.navigationHistory.push(this.currentView);
    }
    this.currentView = 'evening';
    this.hideAllViews();
    if (!this.eveningCheckin) {
      this.eveningCheckin = this.createAndAppend('evening-checkin', 'evening-checkin');
      this.eveningCheckin.addEventListener('submit', (event: Event) => {
        const e = event as CustomEvent<unknown>;
        this.logger.info('Evening checkin submitted', { data: e.detail });
        this.goBack();
        this.tryRefresh(this.dashboard);
      });
      this.eveningCheckin.addEventListener('cancel', () => this.goBack());
    }
    this.eveningCheckin.style.display = 'block';
    if (date && this.isDateSettable(this.eveningCheckin)) {
      this.eveningCheckin.setDate(date);
    }
  }

  private showWeeklyReview(skipHistory = false): void {
    if (!skipHistory) {
      this.navigationHistory.push(this.currentView);
    }
    this.currentView = 'weekly';
    this.hideAllViews();
    if (!this.weeklyReview) {
      this.weeklyReview = this.createAndAppend('weekly-review', 'weekly-review');
      this.weeklyReview.addEventListener('submit', (event: Event) => {
        const e = event as CustomEvent<unknown>;
        this.logger.info('Weekly review submitted', { data: e.detail });
        this.showDashboard();
        this.tryRefresh(this.dashboard);
      });
      this.weeklyReview.addEventListener('cancel', () => this.showDashboard());
    }
    this.weeklyReview.style.display = 'block';
  }

  private showMonthlyReflection(skipHistory = false): void {
    if (!skipHistory) {
      this.navigationHistory.push(this.currentView);
    }
    this.currentView = 'monthly';
    this.hideAllViews();
    if (!this.monthlyReflection) {
      this.monthlyReflection = this.createAndAppend('monthly-reflection', 'monthly-reflection');
      this.monthlyReflection.addEventListener('submit', (event: Event) => {
        const e = event as CustomEvent<unknown>;
        this.logger.info('Monthly reflection submitted', { data: e.detail });
        this.showDashboard();
        this.tryRefresh(this.dashboard);
      });
      this.monthlyReflection.addEventListener('cancel', () => this.showDashboard());
    }
    this.monthlyReflection.style.display = 'block';
  }

  private showPersonalGrowth(skipHistory = false): void {
    if (!skipHistory) {
      this.navigationHistory.push(this.currentView);
    }
    this.currentView = 'growth';
    this.hideAllViews();
    if (!this.personalGrowth) {
      this.personalGrowth = this.createAndAppend('personal-growth', 'personal-growth');
      this.personalGrowth.addEventListener('submit', (event: Event) => {
        const e = event as CustomEvent<unknown>;
        this.logger.info('Personal growth entry submitted', { data: e.detail });
        this.showDashboard();
        this.tryRefresh(this.dashboard);
      });
      this.personalGrowth.addEventListener('cancel', () => this.showDashboard());

      // Handle edit events
      this.personalGrowth.addEventListener('editMorning', (event: Event) => {
        const e = event as CustomEvent<{ date: string }>;
        this.logger.info('Edit morning checkin requested', { date: e.detail.date });
        this.showMorningCheckin(e.detail.date);
      });

      this.personalGrowth.addEventListener('editMidday', (event: Event) => {
        const e = event as CustomEvent<{ date: string }>;
        this.logger.info('Edit midday checkin requested', { date: e.detail.date });
        this.showMiddayCheckin(e.detail.date);
      });

      this.personalGrowth.addEventListener('editEvening', (event: Event) => {
        const e = event as CustomEvent<{ date: string }>;
        this.logger.info('Edit evening checkin requested', { date: e.detail.date });
        this.showEveningCheckin(e.detail.date);
      });
    }
    this.personalGrowth.style.display = 'block';
  }

  private goBack(): void {
    const previousView = this.navigationHistory.pop();
    this.logger.info('Going back', {
      previousView,
      currentView: this.currentView,
      remainingHistory: this.navigationHistory.length,
    });

    if (!previousView) {
      // No history, go to dashboard
      this.logger.info('No history, going to dashboard');
      this.showDashboard();
      return;
    }

    // Simply change the view without modifying history — recreate the previous view
    if (!previousView) {
      this.showDashboard();
      return;
    }
    switch (previousView) {
      case 'dashboard':
        this.showDashboard();
        break;
      case 'growth':
        this.showPersonalGrowth(true);
        break;
      case 'morning':
        this.showMorningCheckin(undefined, true);
        break;
      case 'midday':
        this.showMiddayCheckin(undefined, true);
        break;
      case 'evening':
        this.showEveningCheckin(undefined, true);
        break;
      case 'weekly':
        this.showWeeklyReview(true);
        break;
      case 'monthly':
        this.showMonthlyReflection(true);
        break;
      default:
        this.showDashboard();
    }
  }

  // Public method to navigate back to dashboard
  public goToDashboard(): void {
    this.showDashboard();
  }
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);
// Seed growth intentions (non-blocking)
seedIntentionsIfNeeded();
