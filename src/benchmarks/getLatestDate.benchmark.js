import { getLatestDate } from '../utils/controllerHelpers.js';

// Mock Firestore
class MockQuery {
  constructor(collectionName, executionTimeMs) {
    this.collectionName = collectionName;
    this.executionTimeMs = executionTimeMs;
  }

  orderBy() { return this; }
  limit() { return this; }

  async get() {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, this.executionTimeMs));

    return {
      empty: false,
      docs: [{
        data: () => ({ date: '2023-10-01' })
      }]
    };
  }
}

class MockFirestore {
  constructor(executionTimeMs = 50) {
    this.executionTimeMs = executionTimeMs;
    this.queryCount = 0;
  }

  collection(name) {
    this.queryCount++;
    return new MockQuery(name, this.executionTimeMs);
  }
}

async function runBenchmark() {
  console.log('--- Benchmarking getLatestDate ---');

  const firestore = new MockFirestore(50); // 50ms per query
  const collection = 'test_collection';
  const iterations = 100;

  console.log(`Running ${iterations} iterations (simulating 50ms DB latency)...`);

  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    await getLatestDate(firestore, collection);
  }

  const end = performance.now();
  const totalTime = end - start;

  console.log(`Total time: ${totalTime.toFixed(2)}ms`);
  console.log(`Average time per call: ${(totalTime / iterations).toFixed(2)}ms`);
  console.log(`Total Firestore queries: ${firestore.queryCount}`);
}

runBenchmark().catch(console.error);
