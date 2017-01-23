'use strict';
/**
 * The redis store uses redis as a cache system
 * The redis store will use hashes of {accessId}:{user/role} {id}=entities
 */
const client = Symbol(),
  config = Symbol(),
  expires = Symbol();

class RedisStore {

  constructor(opt) {
    this[client] = null;
    this[config] = opt;
    this.ttl = opt.ttl / 1000;
    this[expires] = {}; // a hash of timers with EXPORE throttle limit
  }

  getHashField(accessId, type) {
    return this[client].key(`access:${accessId}:${type}`);
  }

  run(done) {
    thorin.addStore(require('thorin-store-redis'), 'cache');
    this[client] = thorin.store('cache');
    this[client].init(this[config]);
    this[client].run(done);
  }

  /*
   * HIT the cache for the given input.
   * */
  hit(input) {
    if (!this[client] || !this[client].isConnected()) return Promise.resolve(null);
    return new Promise((resolve) => {
      let type = (input.role_id ? 'role' : 'user'),
        hashKey = this.getHashField(input.access_id, type),
        hashField = (type === 'role' ? input.role_id : input.user_id);
      this[client].exec('HGET', hashKey, hashField, (err, res) => {
        if (err) {
          return resolve(null);
        }
        if (res == null) return resolve(res);
        try {
          res = JSON.parse(res);
        } catch (e) {
          return resolve(null);
        }
        this.expire(hashKey);
        resolve(res);
      });
    });
  }

  expire(hashKey) {
    if (this[expires][hashKey]) return;
    if (!this[client] || !this[client].isConnected()) return;
    let ttl = this[config].ttl,
      redisTtl = this.ttl;
    this[expires][hashKey] = setTimeout(() => {
      delete this[expires][hashKey];
    }, ttl / 2);
    this[client].exec('EXPIRE', hashKey, redisTtl, (err) => {
      if (err) {
        logger.warn(`Could not perform exprie on key ${hashKey}`);
      }
    });
  }

  /*
   * SAVE the given data to cache, with the given input.
   * */
  save(input, entities) {
    if (!this[client] || !this[client].isConnected()) return;
    let type = (input.role_id ? 'role' : 'user'),
      hashKey = this.getHashField(input.access_id, type),
      hashField = (type === 'role' ? input.role_id : input.user_id),
      hashValue;
    try {
      hashValue = JSON.stringify(entities);
    } catch (e) {
      return;
    }
    this[client].exec('HSET', hashKey, hashField, hashValue, (err) => {
      if (err) {
        logger.warn(`Could not save IAM to redis.`);
      }
      this.expire(hashKey);
    });
  }

  /*
   * Invalidates the cache
   * */
  invalidate(input) {
    if (!this[client] || !this[client].isConnected()) return;
    // IF we do not have role/user, we invalidate entire access.
    let multi = this[client].multi();
    if (typeof input.user_id === 'undefined' && typeof input.role_id === 'undefined') {
      multi
        .exec('DEL', this.getHashField(input.access_id, 'user'))
        .exec('DEL', this.getHashField(input.access_id, 'role'));
    } else if (input.user_id) {
      multi.exec('HDEL', this.getHashField(input.access_id, 'user'), input.user_id);
    } else if (input.role_id) {
      multi.exec('HDEL', this.getHashField(input.access_id, 'role'), input.role_id);
    }
    multi.commit((err) => {
      if (err) {
        logger.warn(`Could not invalidate cache for`, input);
      }
    });
  }

}
module.exports.Store = RedisStore;
