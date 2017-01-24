'use strict';
const dispatcher = thorin.dispatcher;

/**
 * Simple permission granting for users
 * */
dispatcher
  .addAction('permission.grant')
  .authorize('auth.check')
  .alias('POST', '/permission/grant')
  .input({
    create: dispatcher.validate('BOOLEAN').default(null),
    read: dispatcher.validate('BOOLEAN').default(null),
    update: dispatcher.validate('BOOLEAN').default(null),
    delete: dispatcher.validate('BOOLEAN').default(null),
    access_id: dispatcher.validate('STRING').error('DATA.INVALID', 'Missing access information'),
    category: dispatcher.validate('STRING').default(null),
    category_id: dispatcher.validate('STRING').default(null),
    role: dispatcher.validate('STRING').default(null),
    role_id: dispatcher.validate('STRING').default(null),
    user_id: dispatcher.validate('STRING').default(null),
    entity_id: dispatcher.validate('STRING').default(null),
    entity_type: dispatcher.validate('STRING').default(null)
  })
  .use((intentObj, next) => {
    let calls = [],
      result = {},
      unloqLib = thorin.lib('unloq'),
      cacheLib = thorin.lib('cache'),
      input = intentObj.input();

    /* We require either a role_id or a role (which is the role code) */
    if (input.category_id == null && input.category == null) {
      return next(thorin.error('DATA.INVALID', 'Missing category information'));
    }
    if (input.role) {
      delete input.role_id;
    }
    if (input.category) {
      delete input.category_id;
    }
    if (!input.user_id) {
      /*
       * Dispatch the PERMISSION.SAVE action to UNLOQ, if we do not have any user_id
       * */
      calls.push(() => {
        return unloqLib.dispatch('api.application.iam.permission.save', input).then((res) => {
          result = res.result || {};
        });
      });
    } else {
      /*
       * Dispatch the CATEGORY_USER SAVE action to UNLOQ, if we have any user_id
       * */
      calls.push(() => {
        input.profile_id = input.user_id;
        delete input.user_id;
        return unloqLib.dispatch('api.application.iam.category.user.save', input).then((res) => {
          result = res.result || {};
          input.user_id = input.profile_id;
        });
      });
    }

    /* next, invalidate the local cache. */
    calls.push(() => {
      let data = {
        access_id: input.access_id
      };
      if (input.user_id) {
        data.user_id = input.user_id
      }
      cacheLib.invalidate(data);
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
 * Simple permission revocation for users
 * */
dispatcher
  .addAction('permission.revoke')
  .authorize('auth.check')
  .alias('POST', '/permission/revoke')
  .input({
    access_id: dispatcher.validate('STRING').error('DATA.INVALID', 'Missing access information'),
    category: dispatcher.validate('STRING').default(null),
    category_id: dispatcher.validate('STRING').default(null),
    role: dispatcher.validate('STRING').default(null),
    role_id: dispatcher.validate('STRING').default(null),
    user_id: dispatcher.validate('STRING').default(null),
    entity_id: dispatcher.validate('STRING').default(null),
    entity_type: dispatcher.validate('STRING').default(null)
  })
  .use((intentObj, next) => {
    let calls = [],
      result = {},
      unloqLib = thorin.lib('unloq'),
      cacheLib = thorin.lib('cache'),
      input = intentObj.input();

    /* We require either a role_id or a role (which is the role code) */
    if (input.category_id == null && input.category == null) {
      return next(thorin.error('DATA.INVALID', 'Missing category information'));
    }
    if (input.role) {
      delete input.role_id;
    }
    if (input.category) {
      delete input.category_id;
    }

    let permObj,
      userCategObj;
    if (!input.user_id) {
      /* read permission */
      calls.push(() => {
        return unloqLib.dispatch('api.application.iam.permission.filter', input).then((res) => {
          permObj = res.result;
        });
      });
    } else {
      /* read userCateg */
      calls.push(() => {
        input.profile_id = input.user_id;
        delete input.user_id;
        return unloqLib.dispatch('api.application.iam.category.user.filter', input).then((res) => {
          userCategObj = res.result;
          input.user_id = input.profile_id;
        });
      });
    }

    /* DELETE permission */
    calls.push(() => {
      if (!permObj) return;
      return unloqLib.dispatch('api.application.iam.permission.delete', {
        id: permObj.id
      }).then((res) => {
        result = res.result || {};
      });

    });

    /* DELETE categoryUser */
    calls.push(() => {
      if (!userCategObj) return;
      return unloqLib.dispatch('api.application.iam.category.user.delete', {
        category_id: userCategObj.category_id,
        id: userCategObj.id
      }).then((res) => {
        result = res.result || {};
      });
    });

    /* INVALIDATE cache */
    calls.push(() => {
      let data = {
        access_id: input.access_id
      };
      if (userCategObj) {
        data.user_id = input.user_id
      }
      cacheLib.invalidate(data);
    });

    thorin.series(calls, (e) => {
      if (e) {
        return next(e);
      }
      intentObj.result(result);
      next();
    });
  });

