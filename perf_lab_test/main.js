const axios = require('axios');

const ENDPOINTS = {
  A: 'https://prod-gw-2vzgiib6.ue.gateway.dev/v1/cwv?technology=WordPress,Shopify,Wix,Joomla,Drupal,Squarespace,PrestaShop,Webflow,1C-Bitrix,Tilda&geo=United%20States%20of%20America&rank=Top%20100k&start=latest',
  B: 'https://reports-dev-2vzgiib6.uc.gateway.dev/v1/cwv?technology=WordPress,Shopify,Wix,Joomla,Drupal,Squarespace,PrestaShop,Webflow,1C-Bitrix,Tilda&geo=United%20States%20of%20America&rank=Top%20100k&start=latest'
};

const NUM_REQUESTS = 100;
const CONCURRENCY = 10;
const MAX_JITTER_MS = 100;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(name, url) {
  const jitter = Math.floor(Math.random() * MAX_JITTER_MS);
  await sleep(jitter);

  const fullUrl = `${url}?nocache=${Math.random().toString(36).substring(2)}`;

  const start = process.hrtime.bigint();
  try {
    const res = await axios.get(fullUrl, {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    const end = process.hrtime.bigint();
    if (res.status === 200) {
      return { name, duration: Number(end - start) / 1e6 }; // ms
    } else {
      return { name, error: `Status: ${res.status}` };
    }
  } catch (e) {
    return { name, error: e.message };
  }
}

async function benchmarkAlternating() {
  const results = {
    A: { durations: [], errors: [] },
    B: { durations: [], errors: [] }
  };

  const endpointNames = Object.keys(ENDPOINTS);

  for (let i = 0; i < NUM_REQUESTS; i += CONCURRENCY) {
    const batch = [];

    for (let j = 0; j < CONCURRENCY; j++) {
      const name = endpointNames[(i + j) % endpointNames.length];
      const url = ENDPOINTS[name];
      batch.push(makeRequest(name, url));
    }

    const responses = await Promise.all(batch);

    for (const res of responses) {
      if (res.duration !== undefined) {
        results[res.name].durations.push(res.duration);
      } else {
        results[res.name].errors.push(res.error);
      }
    }
  }

  return results;
}

function printStats(name, durations, errors) {
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const p90 = (arr) => {
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.9)];
  };

  console.log(`\n🔍 Results for ${name} (${ENDPOINTS[name]})`);
  console.log(`✅ Successful responses: ${durations.length}`);
  console.log(`❌ Errors: ${errors.length}`);
  if (durations.length) {
    console.log(`📈 Avg latency: ${avg(durations).toFixed(2)} ms`);
    console.log(`🚀 Fastest: ${Math.min(...durations).toFixed(2)} ms`);
    console.log(`🐢 Slowest: ${Math.max(...durations).toFixed(2)} ms`);
    console.log(`📊 P90 latency: ${p90(durations).toFixed(2)} ms`);
  }
}

async function main() {
  const results = await benchmarkAlternating();
  for (const name of Object.keys(ENDPOINTS)) {
    const { durations, errors } = results[name];
    printStats(name, durations, errors);
  }
}

main();
