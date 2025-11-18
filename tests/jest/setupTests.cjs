/* eslint-disable */
// CommonJS test setup shim for environments where Jest does not treat .ts setup files as ESM.
// This assigns TextEncoder/TextDecoder into the global scope for jsdom tests.
const util = require('util');
if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = util.TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = util.TextDecoder;
}
