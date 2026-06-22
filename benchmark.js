import { getLatestDate } from './apps/report-api/utils/controllerHelpers.js';

const mockFirestore = {
  collection: (col) => ({
    orderBy: () => ({
      limit: () => ({
        get: async () => {
          // simulate network delay
          await new Promise(resolve => setTimeout(resolve, 50));
          return {
            empty: false,
            docs: [{ data: () => ({ date: '2023-10-01' }) }]
          };
        }
      })
    })
  })
};

async function runBenchmark() {
  const iterations = 100;
  console.log(`Running benchmark with ${iterations} iterations...`);

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    await getLatestDate(mockFirestore, 'technologies');
  }
  const end = performance.now();

  console.log(`Total time: ${(end - start).toFixed(2)} ms`);
  console.log(`Average time per call: ${((end - start) / iterations).toFixed(2)} ms`);
}

runBenchmark();
