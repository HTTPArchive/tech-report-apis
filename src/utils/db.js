const { Firestore } = require('@google-cloud/firestore');

// Initialize Firestore
const firestore = new Firestore({
  projectId: process.env.PROJECT,
  databaseId: process.env.DATABASE
});

module.exports = firestore;
