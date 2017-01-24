'use strict';
/**
 * Websocket HTTP Authorization handler
 */

const dispatcher = thorin.dispatcher,
  logger = thorin.logger('socket'),
  key = require('../lib/key');

const AUTH_ERROR = thorin.error('AUTH.REQUIRED', 'Invalid or missing authorization token', 401);

let CONNECTED = 0;
/**
 * Handle the socket connection event.
 * */
dispatcher
  .addAction('ws#socket.connect')
  .use((intentObj, next) => {
    const accessToken = intentObj.authorization,
      isValid = key.verify(accessToken);
    if (!isValid) {
      return next(AUTH_ERROR);
    }
    CONNECTED++;
    logger.trace(`Client connected.`);
    next();
  });


/**
 * Handle the disconnect connection event
 * */
dispatcher
  .addAction('ws#socket.disconnect')
  .use((intentObj, next) => {
    CONNECTED--;
    logger.trace(`Client disconnected`);
    next();
  });

dispatcher
  .addAuthorization('auth.check')
  .use((intentObj, next) => {
    // IF coming from ws, already authorized.
    if (intentObj.transport === 'ws') {
      return next();
    }
    const accessToken = intentObj.authorization,
      isValid = key.verify(accessToken);
    if (!isValid) {
      return next(AUTH_ERROR);
    }
    next();
  });


