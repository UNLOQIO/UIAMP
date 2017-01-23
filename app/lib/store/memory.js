'use strict';
/**
 * Created by Adrian on 23-Jan-17.
 */

const data = Symbol(),
  config = Symbol(),
  timer = Symbol();

class MemoryStore {

  constructor(opt) {
    this[data] = {};
    this[config] = opt;
  }

  getItemTs() {
    let now = Date.now();
    now += this[config].ttl;
    return now;
  }

  run(done) {
    done();
    this[timer] = setInterval(() => {
      let accessIds = Object.keys(this[data]),
        expire = Date.now();
      for (let i = 0, len = accessIds.length; i < len; i++) {
        let accessId = accessIds[i],
          item = this[data][accessId];
        if (item.ts <= expire) {
          delete this[data][accessId];
        }
      }
    }, this[config].ttl);
  }

  /*
   * HITS the cache for the given input
   * */
  hit(input) {
    let result = null;
    if (typeof this[data][input.access_id] === 'object') {
      if (input.role_id && typeof this[data][input.access_id]['ROLES'][input.role_id] !== 'undefined') {
        result = this[data][input.access_id]['ROLES'][input.role_id];
        this[data][input.access_id].ts = this.getItemTs();
      } else {
        if (input.user_id && typeof this[data][input.access_id]['USERS'][input.user_id] !== 'undefined') {
          result = this[data][input.access_id]['USERS'][input.user_id];
          this[data][input.access_id].ts = this.getItemTs();
        }
      }
    }
    return Promise.resolve(result);
  }

  /*
   * Saves input to cache.
   * */
  save(input, entities) {
    if (typeof this[data][input.access_id] === 'undefined') {
      this[data][input.access_id] = {
        ROLES: {},
        USERS: {}
      };
    }
    this[data][input.access_id].ts = this.getItemTs();
    if (input.role_id) {
      this[data][input.access_id]['ROLES'][input.role_id] = entities;
    } else {
      this[data][input.access_id]['USERS'][input.user_id] = entities;
    }
  }

  /*
   * Invalidates the cache.
   * */
  invalidate(input) {
    /* CHECK if we invalidate only a role */
    if (typeof this[data][input.access_id] === 'undefined') return; // already invalidated.
    if (typeof input.role_id === 'undefined' && typeof input.user_id === 'undefined') {
      // invalidate all access.
      delete this[data][input.access_id];
      return;
    }
    if (input.role_id) {
      if (typeof this[data][input.access_id]['ROLES'][input.role_id] !== 'undefined') {
        delete this[data][input.access_id]['ROLES'][input.role_id];
      }
      return;
    }
    if (input.user_id) {
      if (typeof this[data][input.access_id]['USERS'][input.user_id] !== 'undefined') {
        delete this[data][input.access_id]['USERS'][input.user_id];
      }
    }
  }
}

module.exports.Store = MemoryStore;
