import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@libsql/client';

dotenv.config();

const app = express();
// Railway dynamically assigns a port, or falls back to 5000
const PORT = process.env.PORT || 5000;

// Middleware to allow Vercel to talk to Railway without getting blocked
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.use(express.json());

// Connect to Turso Database
const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// 1. Health Check Route (Visit the Railway URL directly to see this)
app.get('/', (req, res) => {
  res.send('🚀 ITMO Teachers Review Backend is LIVE and working perfectly!');
});

// 2. Fetch Teachers Route
app.get('/api/teachers', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM teachers');
    res.json(result.rows);
  } catch (error) {
    console.error('Database Error:', error);
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

// Start the Server (0.0.0.0 is required for Railway)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API Server is running on port ${PORT}`);
});