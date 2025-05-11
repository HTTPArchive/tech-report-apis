const express = require('express');
const cors = require('cors');
const { Firestore } = require('@google-cloud/firestore');

// Import routes
const technologiesRoutes = require('./routes/technologies');
const categoriesRoutes = require('./routes/categories');
const adoptionRoutes = require('./routes/adoption');
const cwvtechRoutes = require('./routes/cwvtech');
const lighthouseRoutes = require('./routes/lighthouse');
const pageWeightRoutes = require('./routes/pageWeight');
const ranksRoutes = require('./routes/ranks');
const geosRoutes = require('./routes/geos');

// Initialize Firebase
const firestore = new Firestore({
  projectId: process.env.PROJECT,
  databaseId: process.env.DATABASE
});

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: 'GET, OPTIONS',
  allowedHeaders: 'Content-Type, Timing-Allow-Origin',
  maxAge: 86400
}));

// Explicitly handle OPTIONS requests for CORS preflight
app.options('*', cors());

app.use(express.json());

// Set common response headers
app.use((req, res, next) => {
  res.set({
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=21600',
    'Timing-Allow-Origin': '*'
  });
  next();
});

// Define routes
app.use('/v1/technologies', technologiesRoutes);
app.use('/v1/categories', categoriesRoutes);
app.use('/v1/adoption', adoptionRoutes);
app.use('/v1/cwv', cwvtechRoutes);
app.use('/v1/lighthouse', lighthouseRoutes);
app.use('/v1/page-weight', pageWeightRoutes);
app.use('/v1/ranks', ranksRoutes);
app.use('/v1/geos', geosRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).send(JSON.stringify({ status: 'ok' }));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(400).send(JSON.stringify({
    errors: [{ error: err.message || 'Unknown error occurred' }]
  }));
});

// Export the app for Cloud Functions Framework
exports.app = app;
