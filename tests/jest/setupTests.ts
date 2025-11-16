// Provide TextEncoder/TextDecoder for jsdom in Node environments
import { TextEncoder, TextDecoder } from 'util';

declare global {
  // extend globalThis for test environment
  interface TestGlobals {
    TextEncoder?: typeof TextEncoder;
    TextDecoder?: typeof TextDecoder;
  }
}

const g = globalThis as unknown as TestGlobals;
if (typeof g.TextEncoder === 'undefined') g.TextEncoder = TextEncoder;
if (typeof g.TextDecoder === 'undefined') g.TextDecoder = TextDecoder;
