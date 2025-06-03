const { Firestore } = require('@google-cloud/firestore');

// Initialize Firestore with basic optimizations
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

module.exports = firestore;
