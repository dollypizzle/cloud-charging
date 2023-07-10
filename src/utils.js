const memcached = require('memcached');

const DEFAULT_BALANCE = 100;

exports.authorizeRequest = function (remainingBalance, charges) {
  return remainingBalance >= charges;
};

exports.getCharges = function () {
  return DEFAULT_BALANCE / 20;
};

exports.memcachedClient = new memcached(
  `${process.env.ENDPOINT || 'localhost'}:${parseInt(
    process.env.PORT || '11211'
  )}`
);

async function postData(url = '', data = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  return response.json();
}

exports.testFunction = async function (apiUrl, functionToCall) {
  console.log('API:', apiUrl);

  const noOfRequests = 24;
  const requests = [];

  for (let i = 0; i < noOfRequests; i++) {
    if (functionToCall) {
      requests.push(functionToCall());
    } else {
      requests.push(
        postData(apiUrl, {
          serviceType: 'voice',
          unit: 2,
        })
      );
    }
  }

  const responses = await Promise.all(requests);
  let totalLatency = 0;

  responses.forEach(response => (totalLatency += response.latency));
  console.log(responses);
  if (totalLatency > 0) {
    console.log(
      'Average Latency:',
      Math.round(totalLatency / noOfRequests),
      'ms'
    );
  }
};
