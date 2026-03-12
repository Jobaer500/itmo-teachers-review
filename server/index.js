import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// শুধুমাত্র লোকাল কম্পিউটারের জন্য .env ব্যবহার করবে
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'itmo_super_secret_admin_key_2026';

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(express.json());

// Turso Database Connection
const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// ==========================================
// 1. অটোমেটিক ডাটাবেস টেবিল তৈরি (Database Initialization)
// ==========================================
async function initializeDatabase() {
  try {
    await db.execute(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`);
    await db.execute(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, role TEXT, avatar TEXT, review_count INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    await db.execute(`CREATE TABLE IF NOT EXISTS teachers (id TEXT PRIMARY KEY, name TEXT, department TEXT, image TEXT, courses TEXT, email TEXT, phone TEXT, profileUrl TEXT)`);
    await db.execute(`CREATE TABLE IF NOT EXISTS reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, teacher_id TEXT, author TEXT, user_id INTEGER, rating REAL, text TEXT, tags TEXT, likes INTEGER DEFAULT 0, dislikes INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    await db.execute(`CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, message TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);

    // ডিফল্ট Settings যোগ করা
    const settingsCheck = await db.execute(`SELECT * FROM settings WHERE key = 'guest_reviews_enabled'`);
    if (settingsCheck.rows.length === 0) {
      await db.execute(`INSERT INTO settings (key, value) VALUES ('guest_reviews_enabled', 'true')`);
    }

    // ডিফল্ট Admin তৈরি করা (Username: admin, Password: admin2026)
    const adminCheck = await db.execute(`SELECT * FROM users WHERE role = 'admin'`);
    if (adminCheck.rows.length === 0) {
      const hashedPass = await bcrypt.hash('admin2026', 10);
      await db.execute({
        sql: `INSERT INTO users (username, password, role, avatar) VALUES (?, ?, 'admin', 'https://api.dicebear.com/9.x/bottts/svg?seed=admin')`,
        args: ['admin', hashedPass]
      });
    }
    console.log('✅ Database Tables and Default Data Initialized Successfully!');
  } catch (err) {
    console.error('❌ Database Initialization Error:', err);
  }
}
initializeDatabase();

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// ==========================================
// 2. Public API Routes (ওয়েবসাইটের জন্য)
// ==========================================
app.get('/', (req, res) => res.send('🚀 ITMO Teachers Review Backend is LIVE!'));

app.get('/api/settings', async (req, res) => {
  const result = await db.execute(`SELECT value FROM settings WHERE key = 'guest_reviews_enabled'`);
  res.json({ guest_reviews_enabled: result.rows.length > 0 ? result.rows[0].value === 'true' : true });
});

app.get('/api/teachers', async (req, res) => {
  try {
    const teachersRes = await db.execute('SELECT * FROM teachers');
    const reviewsRes = await db.execute('SELECT * FROM reviews');
    
    const teachers = teachersRes.rows.map(t => ({
      id: t.id,
      name: JSON.parse(t.name || '{"ru":"Unknown","en":"Unknown"}'),
      department: JSON.parse(t.department || '{"ru":"N/A","en":"N/A"}'),
      image: t.image,
      courses: JSON.parse(t.courses || '{"ru":[],"en":[]}'),
      email: t.email,
      phone: t.phone,
      profileUrl: t.profileUrl,
      reviews: reviewsRes.rows.filter(r => r.teacher_id === t.id).map(r => ({
        id: r.id,
        author: r.author,
        date: new Date(r.created_at).toLocaleDateString(),
        rating: r.rating,
        text: r.text,
        tags: JSON.parse(r.tags || '[]'),
        likes: r.likes,
        dislikes: r.dislikes
      }))
    }));
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

// ==========================================
// 3. User & Admin Routes
// ==========================================
app.post('/api/users/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const userCheck = await db.execute({ sql: `SELECT * FROM users WHERE username = ?`, args: [username] });
    if (userCheck.rows.length > 0) return res.status(400).json({ error: 'Username already exists' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const avatar = `https://api.dicebear.com/9.x/notionists/svg?seed=${username}`;
    const result = await db.execute({ sql: `INSERT INTO users (username, password, role, avatar) VALUES (?, ?, 'student', ?) RETURNING id`, args: [username, hashedPassword, avatar] });
    
    const token = jwt.sign({ id: result.rows[0].id, username, role: 'student' }, JWT_SECRET);
    res.json({ user: { id: result.rows[0].id, username, avatar }, token });
  } catch (err) { res.status(500).json({ error: 'Registration failed' }); }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await db.execute({ sql: `SELECT * FROM users WHERE username = ?`, args: [username] });
    if (result.rows.length === 0) return res.status(400).json({ error: 'User not found' });
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid password' });
    
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
    res.json({ user: { id: user.id, username: user.username, avatar: user.avatar }, token });
  } catch (err) { res.status(500).json({ error: 'Login failed' }); }
});

app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await db.execute({ sql: `SELECT * FROM users WHERE username = ? AND role = 'admin'`, args: [username] });
    if (result.rows.length === 0) return res.status(400).json({ error: 'Admin not found' });
    
    const validPassword = await bcrypt.compare(password, result.rows[0].password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid password' });
    
    const token = jwt.sign({ id: result.rows[0].id, role: 'admin' }, JWT_SECRET);
    res.json({ token });
  } catch (err) { res.status(500).json({ error: 'Admin login failed' }); }
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API Server is running perfectly on port ${PORT}`);
});