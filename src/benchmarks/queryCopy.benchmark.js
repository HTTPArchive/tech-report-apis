// Basic benchmark comparing forEach + push vs docs.map
function runBenchmark() {
  // Mock a firestore snapshot with 1000 docs
  const numDocs = 1000;
  const mockDocs = Array.from({ length: numDocs }).map((_, i) => ({
    data: () => ({ id: i, value: `test-${i}` })
  }));

  const mockSnapshot = {
    docs: mockDocs,
    forEach: (cb) => mockDocs.forEach(cb)
  };

  const iterations = 10000;

  // Test 1: forEach + push
  console.log("Running forEach + push baseline...");
  const start1 = performance.now();
  for (let i = 0; i < iterations; i++) {
    let data = [];
    mockSnapshot.forEach(doc => {
      data.push(doc.data());
    });
  }
  const end1 = performance.now();
  const time1 = end1 - start1;
  console.log(`forEach + push took: ${time1.toFixed(2)}ms`);

  // Test 2: docs.map
  console.log("Running docs.map optimization...");
  const start2 = performance.now();
  for (let i = 0; i < iterations; i++) {
    let data = mockSnapshot.docs.map(doc => doc.data());
  }
  const end2 = performance.now();
  const time2 = end2 - start2;
  console.log(`docs.map took: ${time2.toFixed(2)}ms`);

  const improvement = ((time1 - time2) / time1) * 100;
  console.log(`\nImprovement: ${improvement.toFixed(2)}%`);
}

runBenchmark();
