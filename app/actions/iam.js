'use strict';
const dispatcher = thorin.dispatcher;

/**
 * Returns the IAM user/role/access permissions
 * First, it checks the cache. If not present, will request it from UNLOQ via the API call
 * Next, it will verify the permissions the user has (if any) and return accordingly.
 * ARGUMENTS for IAM VERIFICATION:
 *  - access_id - the access we want to read against
 *  - user_id - the user we want to check
 *  - category - if specified, the category code we want to check against.
 *  - action - if specified, the action we want to check (CRUD action)
 *  - entity_type - if specified, the specific entity within the permission list that we want to check.
 *  - entity_id - if specified, the specific entity id within the permission list that we want to check.
 */
dispatcher
  .addAction('iam.verify')
  .authorize('auth.check')
  .alias('POST', '/iam/verify')
  .debug(false)
  .input({
    access_id: dispatcher.validate('STRING').error('DATA.INVALID', 'Missing access information'),
    role_id: dispatcher.validate('STRING').default(null),
    user_id: dispatcher.validate('STRING').default(null),
    category: dispatcher.validate('STRING').default(null),
    action: dispatcher.validate('ARRAY', {type: 'string', max: 4}).default(null),
    entity_type: dispatcher.validate('STRING').default(null),
    entity_id: dispatcher.validate('STRING').default(null)
  })
  .use((intentObj, next) => {
    let input = intentObj.input(),
      unloqLib = thorin.lib('unloq'),
      cacheLib = thorin.lib('cache'),
      result = {
        match: false
      },
      calls = [];

    let data = {
      access_id: input.access_id
    };
    if (input.role_id) {
      if (input.user_id) delete input.user_id;
      data.role_id = input.role_id;
    } else if (input.user_id) {
      if (input.role_id) delete input.role_id;
      data.user_id = input.user_id;
    } else {
      return next(thorin.error('DATA.INVALID', 'Either role_id or user_id must be specified'));
    }
    let entities = [],
      fromCache = false;

    calls.push(() => {
      return cacheLib.hit(data).then((items) => {
        if (items != null) {
          entities = items;
          fromCache = true;
        }
      });
    });

    calls.push(() => {
      if (fromCache) return;
      data.profile_id = input.user_id;
      delete data.user_id;
      return unloqLib.dispatch('api.application.iam.access.build', data).then((res) => {
        entities = res.result;
        data.user_id = data.profile_id;
        delete data.profile_id;
      });
    });

    /* IF the caller wants us to verify the code of the action, or the entity, we do so here. */
    calls.push(() => {
      if (fromCache) return;
      cacheLib.save(data, entities);
    });

    calls.push(() => {
      /* IF the user requested a role_id, we simply result the entities */
      if (input.role_id) {
        result = entities;
        return;
      }
      // IF we have no category, we do not know what to match.
      if (!input.category || entities.length === 0) return;
      // We now proceed to check the permissions against any input data.
      let validActions = [];
      if (input.action instanceof Array) {
        for (let i = 0; i < input.action.length; i++) {
          let tmp = input.action[i];
          tmp = tmp.toUpperCase();
          if (['CREATE', 'READ', 'UPDATE', 'DELETE'].indexOf(tmp) !== -1) {
            validActions.push(tmp);
          }
        }
      }
      if (validActions.length > 0) {
        input.action = validActions;
      } else {
        input.action = null;
      }
      result = unloqLib.matchPermission(entities, input);
    });

    thorin.series(calls, (e) => {
      if (e) return next(e);
      intentObj.result(result);
      next();
    });
  });

/**
 * Simple access granting for users
 * */
dispatcher
  .addAction('iam.grant')
  .authorize('auth.check')
  .alias('POST', '/iam/grant')
  .input({
    access_id: dispatcher.validate('STRING').error('DATA.INVALID', 'Missing access information'),
    user_id: dispatcher.validate('STRING').error('DATA.INVALID', 'Missing user information'),
    role_id: dispatcher.validate('STRING').default(null),
    role: dispatcher.validate('STRING').default(null)
  })
  .use((intentObj, next) => {
    let calls = [],
      result = {},
      unloqLib = thorin.lib('unloq'),
      cacheLib = thorin.lib('cache'),
      input = intentObj.input();

    /* We require either a role_id or a role (which is the role code) */
    if (input.role_id == null && input.role == null) {
      return next(thorin.error('DATA.INVALID', 'Missing role information'));
    }
    if (input.role) {
      input.role_code = input.role;
      delete input.role;
    }
    /*
     * Dispatch this action to UNLOQ.
     * */
    calls.push(() => {
      let data = {
        access_id: input.access_id,
        profile_id: input.user_id
      };
      if (input.role_code) {
        data.role_code = input.role_code;
      } else {
        data.role_id = input.role_id;
      }
      return unloqLib.dispatch('api.application.iam.access.grant', data).then((res) => {
        result = res.result || {};
      });
    });

    /* next, invalidate the local cache. */
    calls.push(() => {
      cacheLib.invalidate({
        access_id: input.access_id,
        user_id: input.user_id
      });
    });

    thorin.series(calls, (e) => {
      if (e) {
        return next(e);
      }
      intentObj.result(result);
      next();
    });
  });

/**
 * Simple access revoking for users
 * */
dispatcher
  .addAction('iam.revoke')
  .authorize('auth.check')
  .alias('POST', '/iam/revoke')
  .input({
    access_id: dispatcher.validate('STRING').error('DATA.INVALID', 'Missing access information'),
    user_id: dispatcher.validate('STRING').error('DATA.INVALID', 'Missing user information'),
    role_id: dispatcher.validate('STRING').default(null),
    role: dispatcher.validate('STRING').default(null)
  })
  .use((intentObj, next) => {
    let calls = [],
      result = {},
      unloqLib = thorin.lib('unloq'),
      cacheLib = thorin.lib('cache'),
      input = intentObj.input();

    /* We require either a role_id or a role (which is the role code) */
    if (input.role_id == null && input.role == null) {
      return next(thorin.error('DATA.INVALID', 'Missing role information'));
    }
    if (input.role) {
      input.role_code = input.role;
      delete input.role;
    }
    /*
     * Dispatch this action to UNLOQ.
     * */
    calls.push(() => {
      let data = {
        access_id: input.access_id,
        profile_id: input.user_id
      };
      if (input.role_code) {
        data.role_code = input.role_code;
      } else {
        data.role_id = input.role_id;
      }
      return unloqLib.dispatch('api.application.iam.access.revoke', data).then((res) => {
        result = res.result || {};
      });
    });

    /* next, invalidate the local cache. */
    calls.push(() => {
      cacheLib.invalidate({
        access_id: input.access_id,
        user_id: input.user_id
      });
    });

    thorin.series(calls, (e) => {
      if (e) {
        return next(e);
      }
      intentObj.result(result);
      next();
    });
  });
