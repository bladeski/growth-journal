// Provide TextEncoder/TextDecoder for jsdom in Node environments
/* eslint-disable @typescript-eslint/no-var-requires */
const util = require('util');
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = util.TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = util.TextDecoder;
}
