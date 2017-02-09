'use strict';
const path = require('path');
/**
 * Application-specific configuration
 */
const UNLOQ_EVENTS = process.env.UNLOQ_EVENTS || "https://events.unloq.io",
  UNLOQ_GATEWAY = process.env.UNLOQ_GATEWAY || "https://api.unloq.io";

module.exports = {
  "settings": {
    "secret": process.env.APP_SECRET || "YOUR_APPLICATION_SECRET_FOR_GENERATING_API_KEYS",
    "unloq": {
      "key": process.env.UNLOQ_KEY || '',
      "events": UNLOQ_EVENTS,  // The UNLOQ Events gateway we are going to work with for cache invalidations.
      "gateway": UNLOQ_GATEWAY // The UNLOQ API Gateway we are going to work with
    },
    "cache": {
      "type": "memory", // first, memory
      "ttl": 10,  // the number of seconds the cache is kept before invalidating.
      // REDIS-specific configuration
      "namespace": "uiampc:",
      "host": 'localhost',
      "debug": false,
      "port": 6379
    }
  },
  "transport.http": {
    "port": process.env.PORT || 6801,
    "actionName": "api" // listen to POST /api with {"type": "actionType", "payload": {}}
  },
  "transport.ws": {
    "debug": true
  }
};

