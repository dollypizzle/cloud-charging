'use strict';
if (!process.env.ENDPOINT) {
  require('dotenv').config();
}
Object.defineProperty(exports, '__esModule', { value: true });
const memcached = require('memcached');
const KEY = `account1/balance`;
const DEFAULT_BALANCE = 100;
const MAX_EXPIRATION = 60 * 60 * 24 * 30;
const memcachedClient = new memcached(
  `${process.env.ENDPOINT}:${process.env.MEMCACHED_PORT}`
);

exports.resetMemcached = async function () {
  return new Promise((resolve, reject) => {
    memcachedClient.set(KEY, DEFAULT_BALANCE, MAX_EXPIRATION, err => {
      if (err) {
        reject(err);
      } else {
        resolve(DEFAULT_BALANCE);
      }
    });
  });
};

if (require.main === module) {
  (async () => {
    console.time();
    console.log('Balance:', await exports.resetMemcached());
    console.timeEnd();
  })();
}
