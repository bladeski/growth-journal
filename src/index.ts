import { LoggingService } from '@bladeski/logger/dist/LoggingService.js';
import type { PWAManager } from './utils/PwaManager.ts';
import { ILoggingConfigurationOptions } from '@bladeski/logger/dist/interfaces/index.js';

let logger: ReturnType<typeof LoggingService.getInstance>;
let appInitialized = false;
let pwaManager: PWAManager | null = null;
let startupLogged = false;

const g = globalThis as typeof globalThis & {
  __gj_app_initialized?: boolean;
  __gj_logging_initialized?: boolean;
  __gj_logger?: ReturnType<typeof LoggingService.getInstance>;
  __gj_startup_logged?: boolean;
};

function setupWelcomeMessage() {
  const welcomeSection = document.querySelector('.welcome-section');
  if (welcomeSection) {
    const statusMessage = document.createElement('p');
    statusMessage.className = 'pwa-status';

    if (pwaManager?.getOnlineStatus()) {
      statusMessage.textContent = '✅ Ready to capture your growth journey!';
    } else {
      statusMessage.textContent = '📱 Offline mode - but you can use me as normal!';
    }

    welcomeSection.appendChild(statusMessage);
  }
}

// App initialization
async function initializeApp() {
  if (appInitialized || g.__gj_app_initialized) return;
  appInitialized = true;
  g.__gj_app_initialized = true;
  if (!g.__gj_logging_initialized) {
    const options: ILoggingConfigurationOptions = {
      applicationName: 'growth-journal',
      enableConsoleCore: true,
      enableLocalStorageCore: true,
      maxLogs: 500,
    };
    LoggingService.initialize(options);
    g.__gj_logging_initialized = true;
  }
  logger = g.__gj_logger ?? LoggingService.getInstance();
  g.__gj_logger = logger;

  // Register web components (side-effect import) after logging init
  await import('./components/index.ts');

  // Initialize PWA functionality after logging init
  const pwaModule = await import('./utils/PwaManager.ts');
  const PWAManagerCtor = pwaModule.PWAManager;
  pwaManager = new PWAManagerCtor();

  if (!startupLogged && !g.__gj_startup_logged) {
    logger.info('🌱 Growth Journal is starting...');
    startupLogged = true;
    g.__gj_startup_logged = true;
  }

  // Check if running as PWA
  if (PWAManagerCtor.isPWA()) {
    logger.info('Running as PWA');
    document.body.classList.add('pwa-mode');
  }

  // Initialize any additional app features here
  setupWelcomeMessage();
}
// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);
