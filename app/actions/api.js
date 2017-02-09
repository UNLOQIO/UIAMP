'use strict';
/**
 * API custom actions
 */
const dispatcher = thorin.dispatcher;

dispatcher
  .addAction('api.custom')
  .authorize('auth.check')
  .alias('POST', '/custom')
  .input({
    action: dispatcher.validate('STRING').error('DATA.INVALID', 'Missing action name'),
    payload: dispatcher.validate('OBJECT').error('DATA.INVALID', 'Missing action payload')
  })
  .use((intentObj, next) => {
    let calls = [],
      result = {},
      action = intentObj.input('action'),
      payload = intentObj.input('payload'),
      unloqLib = thorin.lib('unloq');

    /* Dispatch a custom action */
    calls.push(() => {
      return unloqLib.dispatch(action, payload).then((res) => {
        result = res;
      });
    });

    thorin.series(calls, (e) => {
      if (e) return next(e);
      intentObj.result(result);
      next();
    });
  });
