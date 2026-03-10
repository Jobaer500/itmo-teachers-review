import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.join(__dirname, '../src/itmo_teachers_all_departments.json');

const seed = async () => {
  try {
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const teachers = JSON.parse(rawData);

    const transliterate = (text) => {
      if (!text) return '';
      const map = { 'А':'A', 'Б':'B', 'В':'V', 'Г':'G', 'Д':'D', 'Е':'E', 'Ё':'Yo', 'Ж':'Zh', 'З':'Z', 'И':'I', 'Й':'Y', 'К':'K', 'Л':'L', 'М':'M', 'Н':'N', 'О':'O', 'П':'P', 'Р':'R', 'С':'S', 'Т':'T', 'У':'U', 'Ф':'F', 'Х':'Kh', 'Ц':'Ts', 'Ч':'Ch', 'Ш':'Sh', 'Щ':'Shch', 'Ъ':'', 'Ы':'Y', 'Ь':'', 'Э':'E', 'Ю':'Yu', 'Я':'Ya', 'а':'a', 'б':'b', 'в':'v', 'г':'g', 'д':'d', 'е':'e', 'ё':'yo', 'ж':'zh', 'з':'z', 'и':'i', 'й':'y', 'к':'k', 'л':'l', 'м':'m', 'н':'n', 'о':'o', 'п':'p', 'р':'r', 'с':'s', 'т':'t', 'у':'u', 'ф':'f', 'х':'kh', 'ц':'ts', 'ч':'ch', 'ш':'sh', 'щ':'shch', 'ъ':'', 'ы':'y', 'ь':'', 'э':'e', 'ю':'yu', 'я':'ya' };
      let translated = text.split('').map(char => map[char] !== undefined ? map[char] : char).join('');
      return translated.replace(/[ьЬъЪ]/g, ''); 
    };

    console.log('⏳ Uploading teachers to Cloud Database... Please wait.');
    for (const t of teachers) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO teachers (id, name_ru, name_en, department_ru, department_en, image_url, email, phone, profile_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [String(t.isu_id), t.name, transliterate(t.name), 'Университет ИТМО', 'ITMO University', t.image_url, t.email, t.phone, t.profile_url]
      });
    }
    console.log(`✅ ${teachers.length} Teachers uploaded successfully!`);

    const { rows } = await db.execute({ sql: 'SELECT id FROM admins WHERE username = ?', args: ['admin'] });
    if (rows.length === 0) {
      const hash = bcrypt.hashSync('password123', 10);
      await db.execute({ sql: 'INSERT INTO admins (username, password_hash) VALUES (?, ?)', args: ['admin', hash] });
      console.log('✅ Admin account created (User: admin, Pass: password123)');
    } else {
      console.log('⚡ Admin account already exists.');
    }
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
};

seed();