'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const {
  authorizeRequest,
  getCharges,
  memcachedClient,
  testFunction,
} = require('./utils');
const KEY = `account1/balance`;
const MAX_EXPIRATION = 60 * 60 * 24 * 30;

exports.chargeRequestMemcached = async function (input) {
  const start = Date.now();

  let charges = getCharges();
  let error = '';
  let isAuthorized = false;
  let isCharged = false;
  let remainingBalance = 0;

  while (!isCharged && (error === '' || error === 'Race')) {
    ({ error, isAuthorized, isCharged, remainingBalance } =
      await chargeMemcached(KEY, charges));
  }

  if (!isAuthorized) {
    charges = 0;
  }

  return {
    isAuthorized,
    charges,
    remainingBalance,
    latency: Date.now() - start,
  };
};

async function chargeMemcached(key, charges) {
  let isAuthorized = false;
  let remainingBalance = 0;
  let error = '';
  let isCharged = false;

  try {
    isCharged = await new Promise((resolve, reject) => {
      memcachedClient.gets(key, function (err, data) {
        isAuthorized = authorizeRequest(data[key], charges);
        if (isAuthorized) {
          remainingBalance = data[key] - charges;
        } else {
          return reject('Insufficient funds!!!');
        }
        memcachedClient.cas(
          key,
          remainingBalance,
          data.cas,
          MAX_EXPIRATION,
          function (getsError, result) {
            if (getsError) {
              return reject(getsError);
            }

            if (result) {
              return resolve(result);
            } else {
              return reject('Race');
            }
          }
        );
      });
    });
  } catch (err) {
    isAuthorized = false;
    error = err;
  }
  return { error, isAuthorized, isCharged, remainingBalance };
}

if (require.main === module) {
  (async () => {
    await testFunction(
      'https://94fusa931l.execute-api.us-east-1.amazonaws.com/prod/charge-request-memcached'
      // exports.chargeRequestMemcached
    );
  })();
}
