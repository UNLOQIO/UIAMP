'use strict';
/**
 * Home API endpoint
 */
const dispatcher = thorin.dispatcher,
  formlet = thorin.store('formlet');

dispatcher
  .addAction('home.index')
  .alias('GET', '/')
  .alias('GET', '/api')
  .alias('GET', '/ping')
  .debug(false)
  .aliasOnly();

