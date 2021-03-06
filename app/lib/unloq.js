'use strict';
const url = require('url'),
  client = Symbol(),
  events = Symbol(),
  UnloqEvents = require('unloq-events'),
  logger = thorin.logger('unloq');
/**
 * The UNLOQ lib will communicate with the UNLOQ gateway for
 * token authorization and verification.
 */
class UnloqAPI {

  constructor() {
    const config = thorin.config('settings.unloq');
    let tmp = url.parse(config.gateway);
    let gateway = tmp.protocol + '//' + tmp.host + '/dispatch';
    this[client] = thorin.fetcher('unloq', gateway, {
      authorization: config.key,
      timeout: 6000
    });
    this[events] = new UnloqEvents({
      key: config.key,
      gateway: config.events
    });
    let secret = thorin.config('settings.secret');
    if (secret && secret.length < 32) {
      logger.warn(`Application secret must have at least 32 characters.`);
    }
  }


  run(done) {
    let calls = [];

    calls.push(() => {
      if (thorin.env === 'development') return;
      return this.dispatch('api.application.apiKey.verify', {});
    });

    /* initiate events */
    calls.push(() => {
      logger.trace(`Connecting to UNLOQ events`);
      return this[events].connect();
    });

    /* Subscribe to our UNLOQ events for various namespace */
    calls.push(() => {
      logger.trace(`Subscribing to cache events`);
      return thorin.lib('cache').subscribe(this[events]);
    });

    thorin.series(calls, done);
  }

  /*
   * Performs an action dispatch to the UNLOQ API
   * */
  dispatch(action, payload, fn) {
    if (typeof fn !== 'function') {
      return this[client].dispatch(action, payload).catch((e) => {
        e.ns = 'UNLOQ';
        throw e;
      });
    }
    this[client].dispatch(action, payload).then((res) => {
      fn(null, res);
    }).catch((e) => {
      e.ns = 'UNLOQ';
      fn(e, null);
    });
  }

  /**
   * Given a list of permission UNLOQ IAMs, it will test to see
   * if the given input is match for any items.
   * The IAM pattern is:
   *  iam:$category:$permission:$userId:$entityField#entityId
   * ARGUMENTS
   *  - items - array of permission strings.
   *  - data.category - the category to match against.
   *  - data.action - any specific actions we want to match against
   *  - data.entity_type - if specified, the entity type we want to match against.
   *  - data.entity_id - if specified, the entity id we want to match against.
   * */
  matchPermission(items, data) {
    let matched = false,
      entityField,
      matchPerm;
    for (let i = 0, len = items.length; i < len; i++) {
      let iam = items[i];
      if (typeof iam !== 'string' || !iam) continue;
      try {
        iam = iam.split(':').splice(1); // remove first iam
      } catch (e) {
        continue;
      }
      // iam[0] - is category
      if (iam[0] !== data.category) {
        // Check if we want pattern matching or not.
        if (data.pattern !== true || typeof data.category !== 'string') continue;
        if (data.category.indexOf(iam[0]) !== 0) continue;
      }
      // check against any given actions.
      if (data.action) {
        let iamAct = this.fromPermissionBinary(iam[1]),
          dataAct = this.fromPermissionAction(data.action);
        if (dataAct.read && !iamAct.read) continue;
        if (dataAct.create && !iamAct.create) continue;
        if (dataAct.update && !iamAct.update) continue;
        if (dataAct.delete && !iamAct.delete) continue;
      }
      // check against any given entities.
      // By default, if the IAM does not have any entity, but we requested an entity, we stop.
      if (data.entity_type) {
        let entity = iam[3];
        if (!entity) continue;
        let tmp = entity.split('#'),
          entityField = tmp[0],
          entityId = tmp[1];
        if (data.entity_type !== entityField) continue;
        if (data.entity_id !== null) {
          if (typeof entityId === 'undefined') continue;
          if (data.entity_id !== entityId) continue;
        }
      }
      // IF we reached this, that means that we've passed all filters.
      matched = true;
      matchPerm = items[i];
      if (iam[3]) { // entity type.
        entityField = iam[3];
      }
      break;
    }
    let res = {
      match: matched
    };
    if (entityField) {  // we have the entityField.
      res.entity_field = entityField;
    }
    if (matched) {
      res.permission = matchPerm;
    }
    return res;
  }

  /**
   * Converts the given permission string to an object with
   * {create:bool,read:bool,update:bool,delete:bool}
   * */
  fromPermissionBinary(str) {
    if (typeof str !== 'string' || !str) str = "0000";
    let obj = {
      create: str.charAt(0) === "1",
      read: str.charAt(1) === "1",
      update: str.charAt(2) === "1",
      delete: str.charAt(3) === "1"
    };
    return obj;
  }

  /**
   * Given an array of permissions with CREATE,READ,UPDATE,DELETE,
   * converts into an object with {create:bool,read:bool,update:bool,delete:bool}
   * */
  fromPermissionAction(arr) {
    let obj = {};
    if (!arr) return obj;
    for (let i = 0, len = arr.length; i < len; i++) {
      if (arr[i] === 'CREATE') {
        obj.create = true;
      } else if (arr[i] === 'READ') {
        obj.read = true;
      } else if (arr[i] === 'UPDATE') {
        obj.update = true;
      } else if (arr[i] === 'DELETE') {
        obj.delete = true;
      }
    }
    return obj;
  }

}

thorin.addLibrary(UnloqAPI, 'unloq');
