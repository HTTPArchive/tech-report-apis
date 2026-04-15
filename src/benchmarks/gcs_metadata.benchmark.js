import { performance } from 'perf_hooks';

// Simulate GCS file mock
class MockFile {
    constructor(exists) {
        this._exists = exists;
    }

    async exists() {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 50));
        return [this._exists];
    }

    async getMetadata() {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 50));
        if (!this._exists) {
            const error = new Error('Not Found');
            error.code = 404;
            throw error;
        }
        return [{ contentType: 'application/json', size: 1234 }];
    }
}

async function runBenchmark() {
    console.log('--- GCS Metadata Optimization Benchmark ---');
    console.log('Simulating network delay of 50ms per GCS request\\n');

    const iterations = 100;
    console.log(`Running ${iterations} iterations for each scenario...\\n`);

    // --- Scenario 1: File Exists ---
    console.log('SCENARIO 1: File Exists');
    const existingFile = new MockFile(true);

    // Old approach (exists() + getMetadata())
    let startOldExists = performance.now();
    for (let i = 0; i < iterations; i++) {
        const [exists] = await existingFile.exists();
        if (exists) {
            await existingFile.getMetadata();
        }
    }
    let endOldExists = performance.now();
    let oldExistsTime = endOldExists - startOldExists;

    // New approach (try-catch getMetadata())
    let startNewExists = performance.now();
    for (let i = 0; i < iterations; i++) {
        try {
            await existingFile.getMetadata();
        } catch (error) {
            if (error.code !== 404) throw error;
        }
    }
    let endNewExists = performance.now();
    let newExistsTime = endNewExists - startNewExists;

    console.log(`Old Approach (exists + getMetadata): ${oldExistsTime.toFixed(2)}ms`);
    console.log(`New Approach (getMetadata only):    ${newExistsTime.toFixed(2)}ms`);
    console.log(`Improvement:                        ${((oldExistsTime - newExistsTime) / oldExistsTime * 100).toFixed(2)}% faster\\n`);

    // --- Scenario 2: File Does Not Exist ---
    console.log('SCENARIO 2: File Does Not Exist');
    const missingFile = new MockFile(false);

    // Old approach (exists() + getMetadata())
    let startOldMissing = performance.now();
    for (let i = 0; i < iterations; i++) {
        const [exists] = await missingFile.exists();
        if (exists) {
            await missingFile.getMetadata();
        }
    }
    let endOldMissing = performance.now();
    let oldMissingTime = endOldMissing - startOldMissing;

    // New approach (try-catch getMetadata())
    let startNewMissing = performance.now();
    for (let i = 0; i < iterations; i++) {
        try {
            await missingFile.getMetadata();
        } catch (error) {
            if (error.code !== 404) throw error;
        }
    }
    let endNewMissing = performance.now();
    let newMissingTime = endNewMissing - startNewMissing;

    console.log(`Old Approach (exists only):         ${oldMissingTime.toFixed(2)}ms`);
    console.log(`New Approach (getMetadata only):    ${newMissingTime.toFixed(2)}ms`);
    console.log(`Difference:                         ${((oldMissingTime - newMissingTime) / oldMissingTime * 100).toFixed(2)}% (Expected to be ~0% as both make 1 network call)\\n`);
}

runBenchmark().catch(console.error);
