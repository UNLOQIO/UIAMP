'use strict';
/**
 * API Key generator/checker
 */
const API_KEY_LENGTH = 36,
  SIGNATURE_LENGTH = 64;
const key = {};

/**
 * Generates a UIAMP API Key for other clients.
 * Pattern is:
 * {HMACSHA256(key, APP_SECRET)}{KEY}
 * {64 chars}:{48 chars}
 * */
key.generateKey = function generateKey(key) {
  const secret = thorin.config('settings.secret');
  if (!secret || secret.length < 32) return null;
  key = key || thorin.util.randomString(API_KEY_LENGTH);
  let hmac = thorin.util.hmac(key, secret);
  let token = `${hmac}${key}`;
  return token;
};

/**
 * Verifies an incoming UIAMP API Key from clients.
 * */
key.verify = function verify(key) {
  const secret = thorin.config('settings.secret');
  if (!secret || secret.length < 32) return true;
  if (typeof key !== 'string' || !key) return false;
  if (key.length !== (API_KEY_LENGTH + SIGNATURE_LENGTH))return false;
  let signature = key.substr(0, SIGNATURE_LENGTH),
    token = key.substr(SIGNATURE_LENGTH);
  let hmac = thorin.util.hmac(token, secret);
  return (hmac === signature);
};

module.exports = key;
