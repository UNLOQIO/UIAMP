'use strict';
const path = require('path');
/**
 * Application-specific configuration
 */
module.exports = {
  "settings": {
    "unloq": {
      "key": process.env.UNLOQ_KEY || '',
      "events": "https://events.unloq.io",  // The UNLOQ Events gateway we are going to work with for cache invalidations.
      "gateway": "https://api.unloq.io" // The UNLOQ API Gateway we are going to work with
    },
    "cache": {
      "type": "memory", // first, memory
      "ttl": 10,  // the number of seconds the cache is kept before invalidating.
      // REDIS-specific configuration
      "namespace": "uiampc:",
      "host": 'localhost',
      "debug": true,
      "port": 6379
    }
  },
  "transport.http": {
    "port": process.env.PORT || 6801,
    "actionName": "api" // listen to POST /api with {"type": "actionType", "payload": {}}
  },
  "transport.ws": {
    "debug": true,
    "options": {
      wsEngine: 'uws' // use uWS server in stead of ws
    }
  }
};
