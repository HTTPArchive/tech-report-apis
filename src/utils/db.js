import { Firestore } from '@google-cloud/firestore';

// Initialize Firestore with basic optimizations (default connection using env variables)
const firestore = new Firestore({
  projectId: process.env.PROJECT,
  databaseId: process.env.DATABASE,
  settings: {
    // Enable connection pooling
    maxIdleChannels: 10,
    // Enable keepalive to reduce connection overhead
    keepaliveTime: 30000,
    keepaliveTimeout: 5000,
    keepalivePermitWithoutCalls: true
  }
});

// Initialize production Firestore connection with hardcoded database
const firestoreOld = new Firestore({
  projectId: process.env.PROJECT,
  databaseId: 'tech-report-apis-prod',
  settings: {
    // Enable connection pooling
    maxIdleChannels: 10,
    // Enable keepalive to reduce connection overhead
    keepaliveTime: 30000,
    keepaliveTimeout: 5000,
    keepalivePermitWithoutCalls: true
  }
});

// Export both connections - maintain backward compatibility
export { firestore, firestoreOld };
