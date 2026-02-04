// Re-export the package's compiled entry to force Parcel to include the
// prebuilt UMD/ES output instead of pulling in source files which may be
// code-split into chunks that the Service Worker cannot resolve at runtime.
export { LoggingService } from '@bladeski/logger/dist/index.js';
