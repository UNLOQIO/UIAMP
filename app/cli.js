'use strict';
const path = require('path');
const APP_ROOT = path.normalize(__dirname + '/../');
try {
  process.chdir(APP_ROOT);
} catch (e) {
}
global.THORIN_AUTOLOAD = false;
const thorin = require('thorin');
/**
 * UIAMP Command-line-interface
 */
thorin.run(() => {
  const APP_SECRET = thorin.config('settings.secret');
  if (!APP_SECRET) {
    log.error(`Application does not have settings.secret set. Skipping`);
    return setTimeout(() => process.exit(0), 10);
  }
  if (APP_SECRET.length < 32) {
    log.error(`Application secret must have at least 32 characters.`);
    return setTimeout(() => process.exit(0), 10);
  }
  const key = require('./lib/key');
  const token = key.generateKey();
  log.info("API KEY: ");
  console.log(token);
  setTimeout(() => process.exit(0), 10);
});

