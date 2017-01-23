'use strict';
/**
 * The Node.js application cache for access & permission checking
 * This is a Thorin.js application that merely proxies requests to the UNLOQ API
 * and caches the response locally.
 * It also has a mechanism for invalidating the cache once it has changed, so it provides near real-time changes.
 * */
const thorin = require('thorin');

thorin
  .addTransport(require('thorin-transport-http'))
  .addTransport(require('thorin-transport-ws'))
  .loadPath('app/lib')

thorin.run((err) => {
  if (err) {
    return thorin.exit(err);
  }
  log.info(`UIAMP Server started`);
});
