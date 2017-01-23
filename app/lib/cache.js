'use strict';
/**
 * The cache library will hold the IAM information for fast access.
 * Currently, the two options are: memory and redis.
 */
const logger = thorin.logger('cache'),
  config = Symbol(),
  store = Symbol(),
  MemoryStore = require('./store/memory').Store,
  RedisStore = require('./store/redis').Store;

class Cache {

  run(done) {
    let opt = thorin.config('settings.cache');
    this[config] = opt;
    opt.ttl = opt.ttl * 1000;
    this.type = opt.type;
    switch (this.type) {
      case "memory":
        this[store] = new MemoryStore(opt);
        break;
      case "redis":
        this[store] = new RedisStore(opt);
        break;
    }
    this[store].run(done);
  }

  /**
   * Reads from cache using the given filters:
   *  - access_id - the access id we want to read.
   *  - role_id (optional) - the role we want to read
   *  - user_id (optional) - the user we want to read
   *  NOTE:
   *  role_id, user_id - at least one if them is required.
   *  RETURNS a promise that will ALWAYS resolve with either NULL or an array of iams.
   * */
  hit(input) {
    return this[store].hit(input);
  }


  /**
   * Cache the given result using the given data (see data structure above)
   * NOTE: does NOT return a promise.
   * */
  save(input, entities) {
    return this[store].save(input, entities);
  }

  /**
   * This will invalidate portions of cache, based on the input.
   * ARGUMENTS:
   * input.access_id = the access to invalidate
   * input.role_id - if specified, invalidate all access roles.
   * input.user_id - if specified, invalidate all users in access.
   * */
  invalidate(input) {
    return this[store].invalidate(input);
  }

  /**
   * Using unloq-events, we will listen for events from UNLOQ to invalidate.
   * */
  subscribe(eventObj) {
    const NS = eventObj.NAMESPACE,
      calls = [],
      self = this;

    function invalidateAccess(event) {
      let data = event.payload,
        accessId = data.access_id || data.id;
      if (!accessId) return;
      self.invalidate({
        access_id: accessId
      });
      logger.trace(`Invalidation for access: ${accessId} created from UNLOQ event: ${event.type}`);
    }

    function invalidateUser(event) {
      let data = event.payload,
        accessId = data.access_id,
        userId = data.profile_id;
      if (!accessId || !userId) return;
      self.invalidate({
        access_id: accessId,
        user_id: userId
      });
      logger.trace(`Invalidation for user ${userId} in access: ${accessId} created from UNLOQ event: ${event.type}`);
    }

    calls.push(() => {
      return eventObj.subscribe(NS.IAM, [
        'access.update', 'access.delete',
        'access.type.update', 'access.type.delete',
        'category.update', 'category.delete',
        'entity.save', 'entity.delete',
        'entity.type.delete',
        'permission.save', 'permission.update', 'permission.delete',
        'role.update', 'role.delete'
      ], invalidateAccess);
    });

    calls.push(() => {
      return eventObj.subscribe(NS.IAM, [
        'access.user.grant', 'access.user.revoke'
      ], invalidateUser);
    })


    return thorin.series(calls);
  }

}

thorin.addLibrary(Cache, 'cache');
