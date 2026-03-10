import db from './db.js';
import bcrypt from 'bcryptjs';

try {
  const hash = bcrypt.hashSync('password123', 10);
  
  // আগের কোনো অ্যাডমিন থাকলে তা মুছে ফেলা
  db.prepare('DELETE FROM admins WHERE username = ?').run('admin');
  
  // নতুন করে অ্যাডমিন তৈরি করা
  db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run('admin', hash);
  
  console.log('✅ Admin credentials successfully reset!');
  console.log('👉 Username: admin');
  console.log('👉 Password: password123');
} catch (error) {
  console.error('❌ Error resetting admin:', error);
}