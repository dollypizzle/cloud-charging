'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const redis = require('redis');
const { authorizeRequest, getCharges, testFunction } = require('./utils');
const KEY = `account1/balance`;

async function chargeRedis(redisClient, key, charges) {
  let isAuthorized = false;
  let remainingBalance = 0;
  let error = '';
  let isCharged = false;

  try {
    isCharged = await new Promise((resolve, reject) => {
      redisClient.watch(KEY, function (watchError) {
        if (watchError) {
          return reject(watchError);
        }

        redisClient.get(KEY, function (getError, result) {
          if (getError) {
            return reject(getError);
          }

          remainingBalance = parseInt(result);
          isAuthorized = authorizeRequest(remainingBalance, charges);

          if (!isAuthorized) {
            return reject('Insufficient funds!!!');
          }

          redisClient
            .multi()
            .decrby(KEY, charges)
            .exec(async function (execError, results) {
              if (execError) {
                return reject(execError);
              }

              if (results === null) {
                return reject('Race');
              } else {
                remainingBalance = parseInt(results[0]);
                return resolve(results.length > 0);
              }
            });
        });
      });
    });
  } catch (err) {
    isAuthorized = false;
    redisClient.unwatch();
    error = err;
    // console.error(`Error => ${error}`);
  }
  return { error, isAuthorized, isCharged, remainingBalance };
}

exports.chargeRequestRedis = async function (input) {
  const start = Date.now();

  const redisClient = await getRedisClient();

  let charges = getCharges();
  let error = '';
  let isAuthorized = false;
  let isCharged = false;
  let remainingBalance = 0;

  while (!isCharged && (error === '' || error === 'Race')) {
    ({ error, isAuthorized, isCharged, remainingBalance } = await chargeRedis(
      redisClient,
      KEY,
      charges
    ));
  }

  if (!isAuthorized) {
    charges = 0;
  }

  await disconnectRedis(redisClient);

  return {
    isAuthorized,
    charges,
    remainingBalance,
    latency: Date.now() - start,
  };
};
async function getRedisClient() {
  return new Promise((resolve, reject) => {
    try {
      const client = new redis.RedisClient({
        host: process.env.ENDPOINT,
        port: parseInt(process.env.PORT || '6379'),
      });
      client.on('ready', () => {
        // console.log('redis client ready');
        resolve(client);
      });
    } catch (error) {
      reject(error);
    }
  });
}
async function disconnectRedis(client) {
  return new Promise((resolve, reject) => {
    client.quit((error, res) => {
      if (error) {
        reject(error);
      } else if (res === 'OK') {
        // console.log('redis client disconnected');
        resolve(res);
      } else {
        reject('unknown error closing redis connection.');
      }
    });
  });
}

if (require.main === module) {
  (async () => {
    await testFunction(
      'https://wpg8jzmsd4.execute-api.us-east-1.amazonaws.com/prod/charge-request-redis'
      // exports.chargeRequestRedis
    );
  })();
}
