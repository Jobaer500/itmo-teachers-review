import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'itmo_super_secret_admin_key_2026';

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) { res.status(403).json({ error: 'Invalid token' }); }
};

// --- PUBLIC API ---
app.get('/api/teachers', async (req, res) => {
  try {
    const { rows: teachers } = await db.execute('SELECT * FROM teachers');
    const { rows: allReviews } = await db.execute('SELECT * FROM reviews ORDER BY id DESC');
    
    const reviewsByTeacher = {};
    allReviews.forEach(r => {
      if (!reviewsByTeacher[r.teacher_id]) reviewsByTeacher[r.teacher_id] = [];
      reviewsByTeacher[r.teacher_id].push({
        id: Number(r.id), author: r.author, date: r.date, rating: r.rating, text: r.text,
        tags: JSON.parse(r.tags || '[]'), likes: r.likes, dislikes: r.dislikes
      });
    });

    const formatted = teachers.map(t => ({
      id: t.id, name: { ru: t.name_ru, en: t.name_en }, department: { ru: t.department_ru, en: t.department_en },
      image: t.image_url, email: t.email, phone: t.phone, profileUrl: t.profile_url,
      courses: { ru: ['Информатика', 'Практика'], en: ['Computer Science', 'Practice'] },
      reviews: reviewsByTeacher[t.id] || []
    }));
    res.json(formatted);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch teachers' }); }
});

app.get('/api/settings', async (req, res) => {
  try {
    const { rows: settings } = await db.execute('SELECT * FROM settings');
    const formatted = {};
    settings.forEach(s => formatted[s.key] = s.value === 'true');
    res.json(formatted);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/teachers/:id/reviews', async (req, res) => {
  const teacherId = req.params.id;
  const { rating, text, tags } = req.body;
  const token = req.headers.authorization?.split(' ')[1];
  let userId = null;
  let authorName = req.body.author || 'Anonymous';

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if(decoded.role === 'student') { userId = decoded.id; authorName = decoded.username; }
    } catch(e) {}
  }

  if (!userId) {
     const { rows } = await db.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: ['guest_reviews_enabled'] });
     if (rows.length > 0 && rows[0].value === 'false') return res.status(403).json({ error: 'Guest reviews disabled' });
  }

  try {
    const date = new Date().toLocaleDateString('ru-RU');
    const ip = req.ip || req.connection.remoteAddress;
    const info = await db.execute({
      sql: `INSERT INTO reviews (teacher_id, user_id, author, date, rating, text, tags, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [teacherId, userId, authorName, date, rating, text || '', JSON.stringify(tags || []), ip]
    });
    
    if (userId) {
      await db.execute({ sql: 'INSERT INTO notifications (user_id, message, created_at) VALUES (?, ?, ?)', args: [userId, `Вы успешно оставили отзыв!`, new Date().toISOString()] });
    }
    res.json({ success: true, reviewId: Number(info.lastInsertRowid) });
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

// --- STUDENT API ---
app.post('/api/users/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hash = bcrypt.hashSync(password, 10);
    const date = new Date().toISOString();
    const defaultAvatar = `https://api.dicebear.com/9.x/notionists/svg?seed=${username}&backgroundColor=e0f2fe`;
    
    // Check if user exists
    const { rows: existing } = await db.execute({ sql: 'SELECT id FROM users WHERE username = ?', args: [username] });
    if (existing.length > 0) return res.status(400).json({ error: 'Username already exists' });

    const info = await db.execute({ sql: 'INSERT INTO users (username, password_hash, avatar, created_at) VALUES (?, ?, ?, ?)', args: [username, hash, defaultAvatar, date] });
    const newId = Number(info.lastInsertRowid);
    
    await db.execute({ sql: 'INSERT INTO notifications (user_id, message, created_at) VALUES (?, ?, ?)', args: [newId, `Welcome to ITMO Reviews, ${username}!`, date] });
    const token = jwt.sign({ id: newId, username, role: 'student' }, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ success: true, token, user: { id: newId, username, avatar: defaultAvatar } });
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/users/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const { rows } = await db.execute({ sql: 'SELECT * FROM users WHERE username = ?', args: [username] });
    if (rows.length === 0 || !bcrypt.compareSync(password, rows[0].password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];
    const token = jwt.sign({ id: user.id, username: user.username, role: 'student' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user: { id: user.id, username: user.username, avatar: user.avatar } });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/users/profile', verifyToken, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403);
  try {
    const { rows: userRows } = await db.execute({ sql: 'SELECT id, username, avatar, created_at FROM users WHERE id = ?', args: [req.user.id] });
    const { rows: reviews } = await db.execute({ sql: `SELECT r.*, t.name_ru as teacher_name FROM reviews r JOIN teachers t ON r.teacher_id = t.id WHERE r.user_id = ? ORDER BY r.id DESC`, args: [req.user.id] });
    reviews.forEach(r => r.tags = JSON.parse(r.tags || '[]'));
    const { rows: notifications } = await db.execute({ sql: 'SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC', args: [req.user.id] });
    res.json({ user: userRows[0], reviews, notifications });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// --- ADMIN API ---
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const { rows } = await db.execute({ sql: 'SELECT * FROM admins WHERE username = ?', args: [username] });
    if (rows.length === 0 || !bcrypt.compareSync(password, rows[0].password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
    const admin = rows[0];
    const token = jwt.sign({ id: admin.id, username: admin.username, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, token });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/admin/stats', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403);
  try {
    const { rows: tRows } = await db.execute('SELECT COUNT(*) as count FROM teachers');
    const { rows: rRows } = await db.execute('SELECT COUNT(*) as count FROM reviews');
    const { rows: uRows } = await db.execute('SELECT COUNT(*) as count FROM users');
    const { rows: recRows } = await db.execute({ sql: 'SELECT COUNT(*) as count FROM reviews WHERE date = ?', args: [new Date().toLocaleDateString('ru-RU')] });
    const { rows: avgRows } = await db.execute('SELECT AVG(rating) as avg FROM reviews');
    const { rows: latestReviews } = await db.execute(`SELECT r.*, t.name_ru as teacher_name FROM reviews r JOIN teachers t ON r.teacher_id = t.id ORDER BY r.id DESC LIMIT 10`);
    
    res.json({ 
      totalTeachers: tRows[0].count, totalReviews: rRows[0].count, totalUsers: uRows[0].count, 
      recentReviews: recRows[0].count, avgRating: avgRows[0].avg ? Number(avgRows[0].avg).toFixed(1) : 0, latestReviews 
    });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/admin/settings', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403);
  try {
    await db.execute({ sql: 'UPDATE settings SET value = ? WHERE key = ?', args: [String(req.body.value), req.body.key] });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/admin/change-password', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403);
  const { oldPassword, newPassword } = req.body;
  try {
    const { rows } = await db.execute({ sql: 'SELECT * FROM admins WHERE id = ?', args: [req.user.id] });
    if (rows.length === 0 || !bcrypt.compareSync(oldPassword, rows[0].password_hash)) return res.status(400).json({ error: 'Incorrect old password' });
    const hash = bcrypt.hashSync(newPassword, 10);
    await db.execute({ sql: 'UPDATE admins SET password_hash = ? WHERE id = ?', args: [hash, req.user.id] });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/admin/users', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403);
  try {
    const { rows: users } = await db.execute(`SELECT u.id, u.username, u.avatar, u.created_at, COUNT(r.id) as review_count FROM users u LEFT JOIN reviews r ON u.id = r.user_id GROUP BY u.id ORDER BY u.id DESC`);
    res.json(users);
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.delete('/api/admin/reviews/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403);
  try { await db.execute({ sql: 'DELETE FROM reviews WHERE id = ?', args: [req.params.id] }); res.json({ success: true }); } 
  catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.delete('/api/admin/users/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403);
  try {
    await db.execute({ sql: 'DELETE FROM reviews WHERE user_id = ?', args: [req.params.id] });
    await db.execute({ sql: 'DELETE FROM notifications WHERE user_id = ?', args: [req.params.id] });
    await db.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [req.params.id] });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.delete('/api/admin/teachers/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403);
  try {
    await db.execute({ sql: 'DELETE FROM reviews WHERE teacher_id = ?', args: [req.params.id] });
    await db.execute({ sql: 'DELETE FROM teachers WHERE id = ?', args: [req.params.id] });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

// আপনার ফাইলের শেষে গিয়ে এটি বসান:
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API Server is successfully running on port ${PORT}`);
});