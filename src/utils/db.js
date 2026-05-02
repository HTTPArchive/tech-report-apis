import { Firestore } from '@google-cloud/firestore';
import { BigQuery } from '@google-cloud/bigquery';
import pg from 'pg';
const { Pool } = pg;

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

// Initialize BigQuery client
const bigquery = new BigQuery({
  projectId: process.env.PROJECT
});

export { bigquery };

// Initialize AlloyDB connection pool
// Cluster ID: default, Version: PostgreSQL 17, Location: us-central1 (Iowa)
const alloydb = new Pool({
  user: process.env.ALLOYDB_USER,
  database: process.env.ALLOYDB_DB || 'postgres',
  // No password — AlloyDB Auth Proxy's --auto-iam-authn injects the OAuth token
  // automatically when the client sends no password. Passing any non-empty
  // password string bypasses token injection and causes auth_failed in Cloud Run.
  host: process.env.ALLOYDB_HOST || '127.0.0.1', // Use private IP within VPC or 127.0.0.1 if using Auth Proxy
  port: process.env.ALLOYDB_PORT || 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased to allow Proxy to generate tokens and connect
});

export { alloydb };
