// Minimal mock of @bladeski/logger used by tests.
// Provide a LoggingService with a getInstance() method expected by the codebase.
export const LoggingService = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  getInstance: () => ({
    info: () => {},
    warning: () => {},
    error: () => {},
  }),
};

export default LoggingService;

export function initialize() {
  return undefined;
}
