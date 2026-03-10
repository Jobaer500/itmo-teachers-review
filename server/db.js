import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

// Connect to Turso Cloud (বা লোকাল যদি লিংক না থাকে)
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:./itmo_reviews.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const initDb = async () => {
  try {
    await db.executeMultiple(`
      CREATE TABLE IF NOT EXISTS teachers (id TEXT PRIMARY KEY, name_ru TEXT, name_en TEXT, department_ru TEXT, department_en TEXT, image_url TEXT, email TEXT, phone TEXT, profile_url TEXT);
      CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password_hash TEXT, avatar TEXT DEFAULT '', created_at TEXT);
      CREATE TABLE IF NOT EXISTS reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, teacher_id TEXT, user_id INTEGER, author TEXT, date TEXT, rating INTEGER, text TEXT, tags TEXT, likes INTEGER DEFAULT 0, dislikes INTEGER DEFAULT 0, is_reported INTEGER DEFAULT 0, ip_address TEXT, FOREIGN KEY(teacher_id) REFERENCES teachers(id), FOREIGN KEY(user_id) REFERENCES users(id));
      CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, message TEXT, is_read INTEGER DEFAULT 0, created_at TEXT, FOREIGN KEY(user_id) REFERENCES users(id));
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
      CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password_hash TEXT);
    `);
    await db.execute({ sql: 'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', args: ['guest_reviews_enabled', 'true'] });
    console.log('✅ Turso Cloud Database Setup Complete!');
  } catch (error) {
    console.error('❌ Database Initialization Error:', error);
  }
};

initDb();

export default db;