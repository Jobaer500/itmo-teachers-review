import React, { useState, useMemo, useEffect } from 'react';
import { Search, Star, Globe, GraduationCap, BookOpen, Award, ArrowLeft, ThumbsUp, ThumbsDown, ChevronDown, User, Mail, Phone, ExternalLink, CheckCircle2, AlertCircle, Loader2, Lock, LogOut, Trash2, Users, MessageSquare, Activity, Settings, X, Bell, Calendar, Key, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, Link, useLocation } from 'react-router-dom';

// 💥 লাইভ এবং লোকাল সার্ভারের জন্য ডায়নামিক API Link 💥
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

type Language = 'ru' | 'en';

interface Review { id: number; author: string; date: string; rating: number; text: string; tags: string[]; likes: number; dislikes: number; }
interface Teacher { id: string; name: { ru: string; en: string; }; department: { ru: string; en: string; }; image: string; courses: { ru: string[]; en: string[]; }; reviews: Review[]; email: string; phone: string; profileUrl: string; }

const REVIEW_TAGS = {
  clear: { ru: 'Понятно объясняет', en: 'Clear explanations', type: 'positive' },
  helpful: { ru: 'Всегда поможет', en: 'Helpful & Supportive', type: 'positive' },
  engaging: { ru: 'Интересные лекции', en: 'Engaging lectures', type: 'positive' },
  fair: { ru: 'Справедливые оценки', en: 'Fair grading', type: 'positive' },
  polite: { ru: 'Вежливый и тактичный', en: 'Polite / Good manners', type: 'positive' },
  punctual: { ru: 'Пунктуальный', en: 'Punctual', type: 'positive' },
  strict: { ru: 'Строгое оценивание', en: 'Strict grading', type: 'negative' },
  heavy: { ru: 'Большая нагрузка', en: 'Heavy workload', type: 'negative' },
  unclear: { ru: 'Непонятно объясняет', en: 'Unclear explanations', type: 'negative' },
  tough: { ru: 'Сложные экзамены', en: 'Tough exams', type: 'negative' },
  rude: { ru: 'Грубое отношение', en: 'Rude / Bad manners', type: 'negative' },
  late: { ru: 'Часто опаздывает', en: 'Often late', type: 'negative' },
};

const TRANSLATIONS = {
  ru: {
    title: 'Университет ИТМО', adminTitle: 'Панель администратора', subtitle: 'Отзывы студентов', searchPlaceholder: 'Поиск по имени или номеру ИСУ...',
    reviews: 'отзывов', rating: 'Рейтинг', noResults: 'Преподаватели не найдены', 
    footer: 'ПРОЕКТ ЗАПУЩЕН И УПРАВЛЯЕТСЯ ENTITY', 
    topGood: 'Топ лучших', topBad: 'Топ худших', showMore: 'Показать еще', back: 'Назад', courses: 'Курсы', bio: 'Характеристика преподавателя',
    studentReviews: 'Отзывы студентов', findTeacher: 'Найдите своего преподавателя', contactInfo: 'Контактная информация', viewProfile: 'Официальный профиль',
    isu: 'ИСУ:', unrated: 'Нет оценок', addReview: 'Оставить отзыв', submitReview: 'Отправить', yourName: 'Ваше имя',
    reviewText: 'Поделитесь своим опытом... (Необязательно)', selectTags: 'Выберите характеристики (Обязательно)*:', whatStudentsAppreciate: 'Что студенты ценят:',
    whatStudentsFindChallenging: 'Зоны для улучшения:', noBioYet: 'Пока недостаточно отзывов для формирования характеристики. Будьте первым!',
    tagRequired: 'Пожалуйста, выберите хотя бы одну характеристику.', loading: 'Загрузка данных...', loginBtn: 'Войти', registerBtn: 'Регистрация',
    logoutBtn: 'Выйти', loginTitle: 'С возвращением', registerTitle: 'Создать аккаунт', usernamePlace: 'Имя пользователя', passwordPlace: 'Пароль',
    haveAccount: 'Уже есть аккаунт?', noAccount: 'Нет аккаунта?', guestDisabledMsg: 'Гостевые отзывы отключены. Пожалуйста, зарегистрируйтесь или войдите.',
    myProfile: 'Мой профиль', myReviews: 'Мои отзывы', notifications: 'Уведомления'
  },
  en: {
    title: 'ITMO University', adminTitle: 'ITMO Admin Panel', subtitle: 'Student Reviews', searchPlaceholder: 'Search by name or ISU...',
    reviews: 'reviews', rating: 'Rating', noResults: 'No teachers found', 
    footer: 'THE PROJECT HAS BEEN LAUNCHED AND MANAGED BY ENTITY', 
    topGood: 'Top Rated', topBad: 'Lowest Rated', showMore: 'Show More', back: 'Back', courses: 'Courses', bio: 'Teacher Overview',
    studentReviews: 'Student Reviews', findTeacher: 'Find Your Teacher', contactInfo: 'Contact Information', viewProfile: 'Official Profile',
    isu: 'ISU:', unrated: 'Unrated', addReview: 'Leave a Review', submitReview: 'Submit Review', yourName: 'Your Name',
    reviewText: 'Share your experience... (Optional)', selectTags: 'Select characteristics (Required)*:', whatStudentsAppreciate: 'What students appreciate:',
    whatStudentsFindChallenging: 'Areas of concern:', noBioYet: 'Not enough reviews yet to determine characteristics. Be the first!',
    tagRequired: 'Please select at least one characteristic.', loading: 'Loading data...', loginBtn: 'Log In', registerBtn: 'Register',
    logoutBtn: 'Log Out', loginTitle: 'Welcome Back', registerTitle: 'Create Account', usernamePlace: 'Username', passwordPlace: 'Password',
    haveAccount: 'Already have an account?', noAccount: 'Don\'t have an account?', guestDisabledMsg: 'Guest reviews are turned off. Please register or log in.',
    myProfile: 'My Profile', myReviews: 'My Reviews', notifications: 'Notifications'
  }
};

const getAverageRating = (reviews: Review[]) => {
  if (reviews.length === 0) return 0;
  return Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1));
};
const getTopTags = (reviews: Review[], type: 'positive' | 'negative') => {
  const counts: Record<string, number> = {};
  reviews.forEach(r => r.tags.forEach(tag => { if (REVIEW_TAGS[tag as keyof typeof REVIEW_TAGS]?.type === type) counts[tag] = (counts[tag] || 0) + 1; }));
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 3);
};

const StarRating = ({ rating, size = 16, interactive = false, onChange }: any) => {
  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} size={size} onClick={() => interactive && onChange && onChange(star)} className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''} ${star <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'fill-transparent text-white/30'}`} />
      ))}
      {!interactive && rating > 0 && <span className={`ml-2 font-medium text-white/90 ${size > 16 ? 'text-lg' : 'text-sm'}`}>{rating.toFixed(1)}</span>}
    </div>
  );
};

// ==========================================
// STUDENT AUTH MODAL
// ==========================================
const StudentAuthModal = ({ lang, isOpen, onClose, defaultMessage, onLoginSuccess }: any) => {
  const t = TRANSLATIONS[lang as Language];
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setIsLoading(true);
    try {
      const endpoint = isLogin ? '/api/users/login' : '/api/users/register';
      const res = await fetch(`${API_URL}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      const data = await res.json();
      if (res.ok) { onLoginSuccess(data.user, data.token); setUsername(''); setPassword(''); onClose(); } 
      else { setError(data.error || 'Authentication failed'); }
    } catch (err) { setError('Network error.'); } finally { setIsLoading(false); }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white/10 border border-white/20 p-6 sm:p-8 rounded-3xl w-full max-w-md shadow-2xl relative mx-4">
          <button onClick={onClose} className="absolute top-4 right-4 sm:top-6 sm:right-6 text-white/50 hover:text-white transition-colors"><X size={24} /></button>
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex p-3 bg-blue-500/20 rounded-2xl mb-4 text-blue-400"><User size={32} /></div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">{isLogin ? t.loginTitle : t.registerTitle}</h2>
            {defaultMessage && !error && <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-xl text-blue-200 text-xs sm:text-sm flex items-start text-left"><AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" /><p>{defaultMessage}</p></div>}
            {error && <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 text-xs sm:text-sm flex items-start text-left"><AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" /><p>{error}</p></div>}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" required placeholder={t.usernamePlace} value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 sm:px-5 sm:py-3.5 text-white text-sm sm:text-base focus:outline-none focus:border-blue-500/50" />
            <input type="password" required placeholder={t.passwordPlace} value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 sm:px-5 sm:py-3.5 text-white text-sm sm:text-base focus:outline-none focus:border-blue-500/50" />
            <button disabled={isLoading} type="submit" className="flex justify-center items-center w-full py-3.5 mt-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] disabled:opacity-50">
              {isLoading ? <Loader2 className="animate-spin" /> : (isLogin ? t.loginBtn : t.registerBtn)}
            </button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-white/50 text-xs sm:text-sm">{isLogin ? t.noAccount : t.haveAccount} <button onClick={() => {setIsLogin(!isLogin); setError('');}} className="ml-1 sm:ml-2 text-blue-400 hover:text-blue-300 font-medium">{isLogin ? t.registerBtn : t.loginBtn}</button></p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// ==========================================
// STUDENT PROFILE PAGE
// ==========================================
const StudentProfilePage = ({ lang, token, onLogout }: any) => {
  const t = TRANSLATIONS[lang as Language];
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { navigate('/'); return; }
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_URL}/api/users/profile`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) setProfileData(await res.json()); else { onLogout(); navigate('/'); }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchProfile();
  }, [token]);

  if (loading) return <div className="flex-grow flex items-center justify-center"><Loader2 className="animate-spin text-blue-400" size={48} /></div>;
  if (!profileData) return null;

  return (
    <main className="flex-grow max-w-6xl mx-auto px-4 py-8 sm:py-12 lg:px-8 w-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-md lg:sticky lg:top-28 text-center">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-blue-500/30 mx-auto mb-4 sm:mb-6 bg-white/10 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.2)]">
              <img src={profileData.user.avatar} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{profileData.user.username}</h2>
            <p className="text-white/40 text-xs sm:text-sm mb-6 flex items-center justify-center"><Calendar size={14} className="mr-2" /> Joined {new Date(profileData.user.created_at).toLocaleDateString()}</p>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div className="bg-white/5 p-3 sm:p-4 rounded-2xl border border-white/5">
                <span className="block text-xl sm:text-2xl font-bold text-blue-400">{profileData.reviews.length}</span>
                <span className="text-[10px] sm:text-xs text-white/50">{t.reviews}</span>
              </div>
              <div className="bg-white/5 p-3 sm:p-4 rounded-2xl border border-white/5">
                <span className="block text-xl sm:text-2xl font-bold text-purple-400">{profileData.notifications.length}</span>
                <span className="text-[10px] sm:text-xs text-white/50">Alerts</span>
              </div>
            </div>
            <button onClick={() => { onLogout(); navigate('/'); }} className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl transition-colors font-medium flex items-center justify-center text-sm sm:text-base">
              <LogOut size={18} className="mr-2" /> {t.logoutBtn}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          <div className="bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md p-6 sm:p-8">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center"><Bell className="mr-3 text-purple-400" /> {t.notifications}</h3>
            <div className="space-y-3">
              {profileData.notifications.map((notif: any) => (
                <div key={notif.id} className="p-3 sm:p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-purple-100 flex items-start">
                  <div className="mt-1.5 w-2 h-2 rounded-full bg-purple-400 mr-3 flex-shrink-0"></div>
                  <div><p className="text-xs sm:text-sm font-medium">{notif.message}</p><span className="text-[10px] sm:text-xs text-purple-300/50 mt-1 block">{new Date(notif.created_at).toLocaleString()}</span></div>
                </div>
              ))}
              {profileData.notifications.length === 0 && <p className="text-white/40 italic text-sm">No new notifications.</p>}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md p-6 sm:p-8">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center"><BookOpen className="mr-3 text-blue-400" /> {t.myReviews}</h3>
            <div className="space-y-6">
              {profileData.reviews.length > 0 ? profileData.reviews.map((review: any) => (
                <div key={review.id} className="border-b border-white/5 last:border-0 pb-6 last:pb-0">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2 gap-1 sm:gap-0">
                    <span className="font-bold text-white text-sm sm:text-base cursor-pointer hover:text-blue-400 transition-colors" onClick={() => navigate(`/teacher/${review.teacher_id}`)}>On: {review.teacher_name}</span>
                    <span className="text-xs sm:text-sm text-white/30">{review.date}</span>
                  </div>
                  <div className="mb-3"><StarRating rating={review.rating} size={14} /></div>
                  {review.text && <p className="text-white/70 mb-3 italic text-sm sm:text-base">"{review.text}"</p>}
                  <div className="flex flex-wrap gap-1.5">
                    {review.tags.map((tag: string) => {
                      const isPos = REVIEW_TAGS[tag as keyof typeof REVIEW_TAGS].type === 'positive';
                      return <span key={tag} className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-md border ${isPos ? 'bg-green-500/10 border-green-500/20 text-green-300' : 'bg-red-500/10 border-red-500/20 text-red-300'}`}>{REVIEW_TAGS[tag as keyof typeof REVIEW_TAGS][lang as Language]}</span>;
                    })}
                  </div>
                </div>
              )) : <p className="text-white/40 italic text-sm">You haven't written any reviews yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// ==========================================
// SAAS ADMIN DASHBOARD
// ==========================================
const AdminLogin = ({ onLogin }: { onLogin: (token: string) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      const data = await res.json();
      if (res.ok) onLogin(data.token); else setError(data.error || 'Login failed.');
    } catch (err) { setError('Connection error. Backend is down.'); } finally { setIsLoading(false); }
  };

  return (
    <div className="flex-grow flex items-center justify-center px-4 py-12 w-full">
      <div className="bg-white/5 border border-white/10 p-6 sm:p-8 rounded-3xl backdrop-blur-xl w-full max-w-md shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-500"></div>
        <div className="flex justify-center mb-6"><div className="p-4 bg-white/5 rounded-full border border-white/10"><Lock size={32} className="text-blue-400" /></div></div>
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-white mb-8">Workspace Access</h2>
        {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl mb-6 text-xs sm:text-sm text-center">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <input type="text" placeholder="Admin Username" value={username} onChange={e => setUsername(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 sm:px-5 sm:py-4 text-white focus:outline-none focus:border-blue-500/50" />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 sm:px-5 sm:py-4 text-white focus:outline-none focus:border-blue-500/50" />
          <button type="submit" disabled={isLoading} className="w-full py-3.5 sm:py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] disabled:opacity-50 flex justify-center items-center">
            {isLoading ? <Loader2 className="animate-spin" /> : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  );
};

const AdminDashboard = ({ token, onLogout, fetchGlobalTeachers }: any) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'teachers' | 'users' | 'settings'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [guestEnabled, setGuestEnabled] = useState(true);
  const [passwordForm, setPasswordForm] = useState({ old: '', new: '' });
  const [passMsg, setPassMsg] = useState({ type: '', text: '' });
  const [teachersLocal, setTeachersLocal] = useState<Teacher[]>([]);
  const [teacherSearch, setTeacherSearch] = useState('');

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/stats`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setStats(await res.json()); else onLogout();
      const setRes = await fetch(`${API_URL}/api/settings`);
      if (setRes.ok) { const data = await setRes.json(); setGuestEnabled(data.guest_reviews_enabled); }
    } catch (err) { onLogout(); }
  };

  const fetchUsers = async () => {
    const res = await fetch(`${API_URL}/api/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) setUsers(await res.json());
  };

  const fetchTeachersAdmin = async () => {
    const res = await fetch(`${API_URL}/api/teachers`);
    if (res.ok) setTeachersLocal(await res.json());
  };

  useEffect(() => {
    fetchStats();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'teachers') fetchTeachersAdmin();
  }, [token, activeTab]);

  const handleDeleteReview = async (id: number) => {
    if (!window.confirm('Delete this review forever?')) return;
    const res = await fetch(`${API_URL}/api/admin/reviews/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) { fetchStats(); fetchGlobalTeachers(); }
  };

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm('WARNING: Deleting user will delete all their reviews. Continue?')) return;
    const res = await fetch(`${API_URL}/api/admin/users/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) { fetchUsers(); fetchStats(); fetchGlobalTeachers(); }
  };

  const handleDeleteTeacher = async (id: string) => {
    if (!window.confirm('WARNING: Deleting teacher will remove them and all their reviews. Continue?')) return;
    const res = await fetch(`${API_URL}/api/admin/teachers/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) { fetchTeachersAdmin(); fetchStats(); fetchGlobalTeachers(); }
  };

  const toggleGuestReviews = async () => {
    const res = await fetch(`${API_URL}/api/admin/settings`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ key: 'guest_reviews_enabled', value: !guestEnabled }) });
    if (res.ok) setGuestEnabled(!guestEnabled);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault(); setPassMsg({ type: '', text: '' });
    const res = await fetch(`${API_URL}/api/admin/change-password`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ oldPassword: passwordForm.old, newPassword: passwordForm.new }) });
    if (res.ok) { setPassMsg({ type: 'success', text: 'Password updated!' }); setPasswordForm({ old: '', new: '' }); }
    else { const data = await res.json(); setPassMsg({ type: 'error', text: data.error || 'Failed to update' }); }
  };

  if (!stats) return <div className="flex-grow flex items-center justify-center"><Loader2 className="animate-spin text-blue-400" size={48} /></div>;

  return (
    <main className="flex-grow max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 border-b border-white/10 pb-4 sm:pb-6 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Admin Workspace</h1>
          <p className="text-white/50 text-sm sm:text-base font-light">Monitor and manage ITMO reviews</p>
        </div>
        <button onClick={onLogout} className="flex items-center justify-center space-x-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl transition-colors w-full sm:w-auto">
          <LogOut size={16} /><span>Logout</span>
        </button>
      </div>

      <div className="flex space-x-2 mb-6 sm:mb-8 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        <button onClick={() => setActiveTab('overview')} className={`flex items-center space-x-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl transition-all whitespace-nowrap text-sm sm:text-base ${activeTab === 'overview' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}><LayoutDashboard size={18} /><span>Overview</span></button>
        <button onClick={() => setActiveTab('teachers')} className={`flex items-center space-x-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl transition-all whitespace-nowrap text-sm sm:text-base ${activeTab === 'teachers' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}><GraduationCap size={18} /><span>Teachers</span></button>
        <button onClick={() => setActiveTab('users')} className={`flex items-center space-x-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl transition-all whitespace-nowrap text-sm sm:text-base ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}><Users size={18} /><span>Students</span></button>
        <button onClick={() => setActiveTab('settings')} className={`flex items-center space-x-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl transition-all whitespace-nowrap text-sm sm:text-base ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}><Settings size={18} /><span>Settings</span></button>
      </div>

      {activeTab === 'overview' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            <div className="bg-white/5 border border-white/10 p-4 sm:p-6 rounded-2xl sm:rounded-3xl backdrop-blur-md relative overflow-hidden">
              <div className="flex justify-between items-start mb-2 sm:mb-4"><div className="p-2 sm:p-3 bg-blue-500/20 rounded-xl text-blue-400"><GraduationCap size={20} className="sm:w-6 sm:h-6" /></div></div>
              <h3 className="text-white/60 font-medium text-xs sm:text-sm mb-1">Total Teachers</h3><p className="text-2xl sm:text-4xl font-bold text-white">{stats.totalTeachers}</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-4 sm:p-6 rounded-2xl sm:rounded-3xl backdrop-blur-md relative overflow-hidden">
              <div className="flex justify-between items-start mb-2 sm:mb-4"><div className="p-2 sm:p-3 bg-green-500/20 rounded-xl text-green-400"><Users size={20} className="sm:w-6 sm:h-6" /></div></div>
              <h3 className="text-white/60 font-medium text-xs sm:text-sm mb-1">Registered Users</h3><p className="text-2xl sm:text-4xl font-bold text-white">{stats.totalUsers}</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-4 sm:p-6 rounded-2xl sm:rounded-3xl backdrop-blur-md relative overflow-hidden">
              <div className="flex justify-between items-start mb-2 sm:mb-4"><div className="p-2 sm:p-3 bg-purple-500/20 rounded-xl text-purple-400"><MessageSquare size={20} className="sm:w-6 sm:h-6" /></div></div>
              <h3 className="text-white/60 font-medium text-xs sm:text-sm mb-1">Total Reviews</h3><p className="text-2xl sm:text-4xl font-bold text-white">{stats.totalReviews}</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-4 sm:p-6 rounded-2xl sm:rounded-3xl backdrop-blur-md relative overflow-hidden">
              <div className="flex justify-between items-start mb-2 sm:mb-4"><div className="p-2 sm:p-3 bg-orange-500/20 rounded-xl text-orange-400"><Star size={20} className="sm:w-6 sm:h-6" /></div></div>
              <h3 className="text-white/60 font-medium text-xs sm:text-sm mb-1">Avg Rating</h3><p className="text-2xl sm:text-4xl font-bold text-white">{stats.avgRating}</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl backdrop-blur-md p-4 sm:p-8">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center"><Activity className="mr-3 text-blue-400" size={20} /> Recent Reviews</h2>
            <div className="space-y-3">
              {stats.latestReviews.length > 0 ? stats.latestReviews.map((review: any) => (
                <div key={review.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 bg-white/5 border border-white/5 rounded-2xl gap-3 sm:gap-0">
                  <div>
                    <p className="text-sm text-white/80"><span className="font-bold text-blue-300">{review.author}</span> on <span className="font-bold">{review.teacher_name}</span></p>
                    <p className="text-xs text-white/40 mt-1 truncate max-w-[200px] sm:max-w-md">"{review.text || 'No text'}"</p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end sm:space-x-4 w-full sm:w-auto">
                    <span className="text-yellow-400 font-bold flex items-center text-sm"><Star size={14} className="fill-yellow-400 mr-1"/> {review.rating}</span>
                    <button onClick={() => handleDeleteReview(review.id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
              )) : <p className="text-white/40 italic text-sm">No activity yet.</p>}
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'users' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-8 backdrop-blur-md">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6">Registered Students</h2>
          <div className="space-y-3">
            {users.length > 0 ? users.map((u: any) => (
              <div key={u.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 bg-black/20 border border-white/5 rounded-2xl gap-3 sm:gap-0">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <img src={u.avatar} alt="avatar" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-white/20 object-cover" />
                  <div>
                    <p className="text-white font-bold text-sm sm:text-base">{u.username}</p>
                    <p className="text-[10px] sm:text-xs text-white/40">Joined: {new Date(u.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end sm:space-x-6 w-full sm:w-auto">
                  <span className="text-xs sm:text-sm text-white/60 bg-white/5 px-2 sm:px-3 py-1 rounded-lg">{u.review_count} Reviews</span>
                  <button onClick={() => handleDeleteUser(u.id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>
            )) : <p className="text-white/40 italic text-sm">No users registered.</p>}
          </div>
        </motion.div>
      )}

      {activeTab === 'teachers' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-8 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-0">
            <h2 className="text-lg sm:text-xl font-bold text-white">Teacher Database</h2>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 text-white/40" size={16} />
              <input type="text" placeholder="Search teacher..." value={teacherSearch} onChange={e => setTeacherSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-black/30 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500/50" />
            </div>
          </div>
          <div className="space-y-3">
            {teachersLocal.filter(t => t.name.ru.toLowerCase().includes(teacherSearch.toLowerCase()) || t.name.en.toLowerCase().includes(teacherSearch.toLowerCase())).slice(0, 30).map((t: any) => (
              <div key={t.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 bg-black/20 border border-white/5 rounded-2xl gap-3 sm:gap-0">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <img src={t.image} alt="pic" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-white/20 object-cover" />
                  <div>
                    <p className="text-white font-bold leading-tight text-sm sm:text-base">{t.name.ru}</p>
                    <p className="text-[10px] sm:text-xs text-white/40 font-mono">ISU: {t.id}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end sm:space-x-4 w-full sm:w-auto">
                  <span className="text-xs sm:text-sm text-white/60 bg-white/5 px-2 sm:px-3 py-1 rounded-lg">{t.reviews.length} Reviews</span>
                  <button onClick={() => handleDeleteTeacher(t.id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {activeTab === 'settings' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 backdrop-blur-md h-fit">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center"><Globe className="mr-3 text-blue-400" size={20}/> General Settings</h2>
            <div className="flex justify-between items-center p-4 sm:p-6 bg-black/20 border border-white/5 rounded-2xl">
              <div className="pr-4">
                <p className="text-white font-bold mb-1 text-sm sm:text-base">Guest Reviews</p>
                <p className="text-[10px] sm:text-xs text-white/50">Allow unregistered visitors to leave reviews anonymously.</p>
              </div>
              <button onClick={toggleGuestReviews} className={`relative inline-flex h-7 sm:h-8 w-12 sm:w-14 items-center rounded-full transition-colors duration-300 ease-in-out shrink-0 ${guestEnabled ? 'bg-green-500' : 'bg-gray-600'}`}>
                <span className={`inline-block h-5 sm:h-6 w-5 sm:w-6 transform rounded-full bg-white transition-transform duration-300 ease-in-out ${guestEnabled ? 'translate-x-6 sm:translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 backdrop-blur-md">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center"><Key className="mr-3 text-purple-400" size={20}/> Security</h2>
            {passMsg.text && <div className={`mb-4 p-3 rounded-xl text-xs sm:text-sm ${passMsg.type === 'success' ? 'bg-green-500/20 text-green-200 border border-green-500/30' : 'bg-red-500/20 text-red-200 border border-red-500/30'}`}>{passMsg.text}</div>}
            <form onSubmit={handleChangePassword} className="space-y-3 sm:space-y-4">
              <input type="password" required placeholder="Current Password" value={passwordForm.old} onChange={e => setPasswordForm({...passwordForm, old: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 sm:px-5 sm:py-3.5 text-white text-sm sm:text-base focus:outline-none focus:border-blue-500/50" />
              <input type="password" required placeholder="New Password" value={passwordForm.new} onChange={e => setPasswordForm({...passwordForm, new: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 sm:px-5 sm:py-3.5 text-white text-sm sm:text-base focus:outline-none focus:border-purple-500/50" />
              <button type="submit" className="w-full py-3 sm:py-3.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)] text-sm sm:text-base">Update Password</button>
            </form>
          </div>
        </motion.div>
      )}
    </main>
  );
};

// ==========================================
// PUBLIC PAGES
// ==========================================
const HomePage = ({ lang, teachers }: { lang: Language, teachers: Teacher[] }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'good' | 'bad'>('all');
  const [visibleCount, setVisibleCount] = useState(12);
  const navigate = useNavigate();
  const t = TRANSLATIONS[lang];

  const filteredTeachers = useMemo(() => {
    let result = [...teachers];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((teacher) => {
        return (
          teacher.name.ru.toLowerCase().includes(query) || teacher.name.en.toLowerCase().includes(query) || 
          teacher.department.ru.toLowerCase().includes(query) || teacher.department.en.toLowerCase().includes(query) || 
          teacher.id.toLowerCase().includes(query)
        );
      });
    }
    if (filterType === 'good') result.sort((a, b) => getAverageRating(b.reviews) - getAverageRating(a.reviews));
    else if (filterType === 'bad') result.sort((a, b) => {
      const aRating = getAverageRating(a.reviews) || 99; 
      const bRating = getAverageRating(b.reviews) || 99;
      return aRating - bRating;
    });
    return result;
  }, [searchQuery, filterType, teachers]);

  const displayedTeachers = filteredTeachers.slice(0, visibleCount);

  return (
    <main className="flex-grow w-full">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10">
        <div className="max-w-3xl mx-auto text-center mb-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-white to-blue-200">
              {t.findTeacher}
            </h2>
          </motion.div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-0 mb-8 sm:mb-12">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-2xl">
          <div className="relative group mb-4">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="text-white/40 group-focus-within:text-blue-400 transition-colors" size={18} />
            </div>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t.searchPlaceholder} className="block w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white/10 transition-all duration-300 text-base sm:text-lg shadow-inner" />
          </div>
          <div className="flex justify-center gap-3 sm:gap-4">
            <button onClick={() => { setFilterType(filterType === 'good' ? 'all' : 'good'); setVisibleCount(12); }} className={`flex-1 sm:flex-none flex justify-center items-center space-x-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl border transition-all duration-300 ${filterType === 'good' ? 'bg-green-500/20 border-green-500/50 text-green-200' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}`}>
              <ThumbsUp size={16} /><span className="font-medium text-xs sm:text-sm">{t.topGood}</span>
            </button>
            <button onClick={() => { setFilterType(filterType === 'bad' ? 'all' : 'bad'); setVisibleCount(12); }} className={`flex-1 sm:flex-none flex justify-center items-center space-x-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl border transition-all duration-300 ${filterType === 'bad' ? 'bg-red-500/20 border-red-500/50 text-red-200' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}`}>
              <ThumbsDown size={16} /><span className="font-medium text-xs sm:text-sm">{t.topBad}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <AnimatePresence mode="popLayout">
            {displayedTeachers.map((teacher, index) => {
              const rating = getAverageRating(teacher.reviews);
              return (
                <motion.div key={teacher.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3, delay: index * 0.05 }} onClick={() => navigate(`/teacher/${teacher.id}`)} className="group relative flex flex-col bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-5 sm:p-6 backdrop-blur-md transition-all duration-300 hover:shadow-2xl cursor-pointer">
                  <div className="absolute top-4 sm:top-6 right-4 sm:right-6 p-1.5 sm:p-2 bg-white/5 rounded-lg z-10"><Award className="text-blue-300" size={16} /></div>
                  <div className="flex justify-center mb-4">
                    <div className="relative">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-white/20 group-hover:border-blue-400/50 transition-colors bg-white/10 flex items-center justify-center">
                        <img src={teacher.image} alt={teacher.name[lang]} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className={`absolute bottom-0 right-0 text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-md border border-white/20 ${rating >= 4.0 ? 'bg-green-600' : rating > 0 && rating < 3.0 ? 'bg-red-600' : 'bg-slate-600'}`}>
                        {rating > 0 ? rating : '-'}
                      </div>
                    </div>
                  </div>
                  <div className="mb-4 text-center flex-grow">
                    <h3 className="text-lg sm:text-xl font-bold text-white mb-1 group-hover:text-blue-200 transition-colors line-clamp-2 leading-tight min-h-[48px] sm:min-h-[56px] flex items-center justify-center">{teacher.name[lang]}</h3>
                    <p className="text-[10px] sm:text-xs text-white/40 font-mono mb-1">{t.isu} {teacher.id}</p>
                    <p className="text-xs sm:text-sm text-white/60 font-light leading-relaxed line-clamp-1">{teacher.department[lang]}</p>
                  </div>
                  <div className="mt-auto pt-3 sm:pt-4 border-t border-white/10 flex items-center justify-between">
                    {rating > 0 ? <StarRating rating={rating} size={14} /> : <span className="text-xs sm:text-sm text-white/40">{t.unrated}</span>}
                    <div className="flex items-center text-[10px] sm:text-xs text-white/40"><BookOpen size={10} className="mr-1.5" /> {teacher.reviews.length} {t.reviews}</div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        {displayedTeachers.length < filteredTeachers.length && (
          <div className="flex justify-center mt-8 sm:mt-12 pb-8 sm:pb-12">
            <button onClick={() => setVisibleCount(prev => prev + 12)} className="flex items-center space-x-2 px-6 sm:px-8 py-2.5 sm:py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 transition-colors text-white font-medium text-sm sm:text-base"><span>{t.showMore}</span><ChevronDown size={16} /></button>
          </div>
        )}
      </div>
    </main>
  );
};

const TeacherProfilePage = ({ lang, teachers, setTeachers, guestReviewsEnabled, studentUser, studentToken, openAuthPopup }: any) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const t = TRANSLATIONS[lang as Language];
  const teacher = teachers.find((t: any) => t.id === id);

  const [newReviewText, setNewReviewText] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [guestAuthorName, setGuestAuthorName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!teacher) return <div className="text-center py-20 text-white">Teacher not found</div>;

  const avgRating = getAverageRating(teacher.reviews);
  const topPositiveTags = getTopTags(teacher.reviews, 'positive');
  const topNegativeTags = getTopTags(teacher.reviews, 'negative');

  const handleTagToggle = (tagKey: string) => {
    setSelectedTags(prev => prev.includes(tagKey) ? prev.filter(t => t !== tagKey) : [...prev, tagKey]);
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestReviewsEnabled && !studentUser) { openAuthPopup(t.guestDisabledMsg); return; }
    if (selectedTags.length === 0) { alert(t.tagRequired); return; }

    setIsSubmitting(true);
    try {
      const finalAuthorName = studentUser ? studentUser.username : (guestAuthorName.trim() || 'Anonymous');
      const headers: any = { 'Content-Type': 'application/json' };
      if (studentToken) headers['Authorization'] = `Bearer ${studentToken}`;

      const response = await fetch(`${API_URL}/api/teachers/${teacher.id}/reviews`, {
        method: 'POST', headers, body: JSON.stringify({ author: finalAuthorName, rating: newReviewRating, text: newReviewText.trim(), tags: selectedTags })
      });

      if (!response.ok) throw new Error('Failed to submit review');
      const data = await response.json();

      const newReview: Review = { id: data.reviewId, author: finalAuthorName, date: new Date().toLocaleDateString('ru-RU'), rating: newReviewRating, text: newReviewText.trim(), tags: selectedTags, likes: 0, dislikes: 0 };
      setTeachers((prev: Teacher[]) => prev.map(t => t.id === teacher.id ? { ...t, reviews: [newReview, ...t.reviews] } : t));
      
      setNewReviewText(''); setGuestAuthorName(''); setNewReviewRating(5); setSelectedTags([]);
    } catch (error) {
      if(!guestReviewsEnabled) openAuthPopup(t.guestDisabledMsg); else alert('Error submitting review.');
    } finally { setIsSubmitting(false); }
  };

  return (
    <main className="flex-grow max-w-6xl mx-auto px-4 py-8 sm:py-12 sm:px-6 lg:px-8 w-full">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-6 sm:mb-8">
        <button onClick={() => navigate(-1)} className="flex items-center space-x-2 text-white/60 hover:text-white transition-colors text-sm sm:text-base"><ArrowLeft size={18} /><span>{t.back}</span></button>
      </motion.div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-1">
          <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 backdrop-blur-md lg:sticky lg:top-28">
            <div className="w-32 h-32 sm:w-48 sm:h-48 rounded-full overflow-hidden border-4 border-white/10 mx-auto mb-4 sm:mb-6 shadow-xl bg-white/10">
              <img src={teacher.image} alt={teacher.name[lang]} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-center text-white mb-1 leading-tight">{teacher.name[lang]}</h1>
            <p className="text-center text-white/40 font-mono text-xs sm:text-sm mb-2">{t.isu} {teacher.id}</p>
            <p className="text-center text-blue-200/80 mb-4 sm:mb-6 font-light text-sm sm:text-base">{teacher.department[lang]}</p>
            <div className="flex justify-center mb-6 sm:mb-8">
              <div className="bg-white/5 rounded-xl px-4 sm:px-6 py-2 sm:py-3 border border-white/10 flex flex-col items-center">
                <span className="text-2xl sm:text-3xl font-bold text-white mb-1">{avgRating > 0 ? avgRating : '-'}</span>
                {avgRating > 0 ? <StarRating rating={avgRating} size={14} /> : <span className="text-xs sm:text-sm text-white/40">{t.unrated}</span>}
                <span className="text-[10px] sm:text-xs text-white/40 mt-1">{teacher.reviews.length} {t.reviews}</span>
              </div>
            </div>
            <div className="space-y-3 sm:space-y-4 mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-white/10">
              <h3 className="text-xs sm:text-sm font-bold text-white/40 uppercase tracking-wider">{t.contactInfo}</h3>
              <div className="flex flex-col space-y-2 sm:space-y-3">
                {teacher.email !== 'N/A' && (
                  <div className="flex items-center text-blue-200/80 text-xs sm:text-sm">
                    <Mail size={14} className="sm:w-4 sm:h-4 mr-2 sm:mr-3 text-blue-400 shrink-0" /> <span className="truncate">{teacher.email}</span>
                  </div>
                )}
                {teacher.phone !== 'N/A' && (
                  <div className="flex items-center text-blue-200/80 text-xs sm:text-sm">
                    <Phone size={14} className="sm:w-4 sm:h-4 mr-2 sm:mr-3 text-blue-400 shrink-0" /> <span>{teacher.phone}</span>
                  </div>
                )}
                <a href={teacher.profileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors mt-2 text-xs sm:text-sm bg-blue-500/10 px-3 sm:px-4 py-2 rounded-lg w-fit">
                  <ExternalLink size={14} className="mr-2" /> {t.viewProfile}
                </a>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2 space-y-6 sm:space-y-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 backdrop-blur-md">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center"><User className="mr-3 text-blue-400" size={20} /> {t.bio}</h2>
            {teacher.reviews.length === 0 ? <p className="text-white/60 font-light italic text-sm sm:text-base">{t.noBioYet}</p> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-green-500/5 border border-green-500/20 p-4 sm:p-5 rounded-xl">
                  <h3 className="text-green-300 font-semibold mb-2 sm:mb-3 flex items-center text-sm sm:text-base"><CheckCircle2 size={16} className="mr-2" /> {t.whatStudentsAppreciate}</h3>
                  {topPositiveTags.length > 0 ? (
                    <ul className="space-y-1.5 sm:space-y-2">{topPositiveTags.map(tag => <li key={tag} className="text-white/80 text-xs sm:text-sm flex items-center before:content-['•'] before:mr-2 before:text-green-400">{REVIEW_TAGS[tag as keyof typeof REVIEW_TAGS][lang]}</li>)}</ul>
                  ) : <span className="text-white/40 text-xs sm:text-sm">-</span>}
                </div>
                <div className="bg-red-500/5 border border-red-500/20 p-4 sm:p-5 rounded-xl">
                  <h3 className="text-red-300 font-semibold mb-2 sm:mb-3 flex items-center text-sm sm:text-base"><AlertCircle size={16} className="mr-2" /> {t.whatStudentsFindChallenging}</h3>
                  {topNegativeTags.length > 0 ? (
                    <ul className="space-y-1.5 sm:space-y-2">{topNegativeTags.map(tag => <li key={tag} className="text-white/80 text-xs sm:text-sm flex items-center before:content-['•'] before:mr-2 before:text-red-400">{REVIEW_TAGS[tag as keyof typeof REVIEW_TAGS][lang]}</li>)}</ul>
                  ) : <span className="text-white/40 text-xs sm:text-sm">-</span>}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 backdrop-blur-md">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center"><Star className="mr-3 text-yellow-400" size={20} /> {t.addReview}</h2>
            <form onSubmit={submitReview} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                {studentUser ? (
                   <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center text-white/80 text-sm sm:text-base">
                     <img src={studentUser.avatar} alt="Avatar" className="w-5 h-5 sm:w-6 sm:h-6 rounded-full mr-2 sm:mr-3 border border-white/20 object-cover" /> 
                     {studentUser.username}
                   </div>
                ) : (
                   <input type="text" placeholder={t.yourName} value={guestAuthorName} onChange={e => setGuestAuthorName(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm sm:text-base focus:outline-none focus:border-blue-500/50" />
                )}
                <div className="flex items-center justify-between sm:justify-start bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <span className="sm:mr-3 text-white/60 text-xs sm:text-sm">{t.rating}:</span>
                  <StarRating rating={newReviewRating} size={18} interactive onChange={setNewReviewRating} />
                </div>
              </div>
              <div className="space-y-2 sm:space-y-3">
                <span className="text-xs sm:text-sm font-medium text-white/80">{t.selectTags}</span>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {Object.entries(REVIEW_TAGS).map(([key, value]) => {
                    const isSelected = selectedTags.includes(key);
                    const isPositive = value.type === 'positive';
                    let btnClass = 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10';
                    if (isSelected) {
                      btnClass = isPositive ? 'bg-green-500/20 border-green-500/50 text-green-200 shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 'bg-red-500/20 border-red-500/50 text-red-200 shadow-[0_0_10px_rgba(239,68,68,0.2)]';
                    }
                    return (
                      <button type="button" key={key} onClick={() => handleTagToggle(key)} className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium border transition-all duration-300 ${btnClass}`}>
                        {value[lang as Language]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <textarea placeholder={t.reviewText} value={newReviewText} onChange={e => setNewReviewText(e.target.value)} rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm sm:text-base focus:outline-none focus:border-blue-500/50 resize-none mt-2 sm:mt-4" />
              <button disabled={isSubmitting} type="submit" className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 text-sm sm:text-base">
                {isSubmitting ? <Loader2 className="animate-spin mx-auto" size={18} /> : t.submitReview}
              </button>
            </form>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 backdrop-blur-md">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 flex items-center"><BookOpen className="mr-3 text-blue-400" size={20} /> {t.studentReviews}</h2>
            <div className="space-y-4 sm:space-y-6">
              {teacher.reviews.length > 0 ? teacher.reviews.map((review) => (
                <div key={review.id} className="border-b border-white/5 last:border-0 pb-4 sm:pb-6 last:pb-0">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[10px] sm:text-xs font-bold">
                        {review.author.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-white text-sm sm:text-base">{review.author}</span>
                    </div>
                    <span className="text-[10px] sm:text-sm text-white/30">{review.date}</span>
                  </div>
                  <div className="mb-2 sm:mb-3"><StarRating rating={review.rating} size={12} /></div>
                  {review.text && <p className="text-white/80 mb-2 sm:mb-3 italic text-xs sm:text-base">"{review.text}"</p>}
                  {review.tags && review.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 sm:gap-1.5 mb-2 sm:mb-3">
                      {review.tags.map(tag => {
                        const isPos = REVIEW_TAGS[tag as keyof typeof REVIEW_TAGS].type === 'positive';
                        return (
                          <span key={tag} className={`text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-full border ${isPos ? 'bg-green-500/10 border-green-500/20 text-green-300' : 'bg-red-500/10 border-red-500/20 text-red-300'}`}>
                            {REVIEW_TAGS[tag as keyof typeof REVIEW_TAGS][lang as Language]}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex space-x-3 sm:space-x-4 text-xs sm:text-sm text-white/40 mt-2">
                    <button className="flex items-center space-x-1 hover:text-green-400 transition-colors"><ThumbsUp size={12} className="sm:w-3.5 sm:h-3.5" /><span>{review.likes}</span></button>
                    <button className="flex items-center space-x-1 hover:text-red-400 transition-colors"><ThumbsDown size={12} className="sm:w-3.5 sm:h-3.5" /><span>{review.dislikes}</span></button>
                  </div>
                </div>
              )) : <p className="text-white/50 text-center py-4 font-light text-sm sm:text-base">{lang === 'ru' ? 'Отзывов пока нет.' : 'No reviews yet.'}</p>}
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
};

// ==========================================
// MAIN APP WRAPPER 
// ==========================================
const MainApp = () => {
  const [lang, setLang] = useState<Language>('ru');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [guestReviewsEnabled, setGuestReviewsEnabled] = useState(true); 
  
  const [adminToken, setAdminToken] = useState<string | null>(localStorage.getItem('adminToken'));
  const [studentToken, setStudentToken] = useState<string | null>(localStorage.getItem('studentToken'));
  const [studentUser, setStudentUser] = useState<any>(JSON.parse(localStorage.getItem('studentUser') || 'null'));
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMessage, setAuthMessage] = useState('');

  const t = TRANSLATIONS[lang];
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  const fetchGlobalData = async () => {
    try {
      const settingsRes = await fetch(`${API_URL}/api/settings`);
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.guest_reviews_enabled !== undefined) setGuestReviewsEnabled(settingsData.guest_reviews_enabled);
      }
      const teachersRes = await fetch(`${API_URL}/api/teachers`);
      if (!teachersRes.ok) throw new Error('Failed to fetch');
      const teachersData = await teachersRes.json();
      const teachersWithAvatars = teachersData.map((teacher: any) => {
        let finalImage = teacher.image;
        if (finalImage && finalImage.includes('anon_male.png')) finalImage = `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(teacher.id + 'male')}&backgroundColor=e0f2fe`;
        else if (finalImage && finalImage.includes('anon_female.png')) finalImage = `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(teacher.id + 'female')}&backgroundColor=fce7f3`;
        else if (!finalImage || finalImage === 'N/A' || finalImage.includes('anon')) finalImage = `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(teacher.id)}&backgroundColor=f3f4f6`;
        return { ...teacher, image: finalImage };
      });
      setTeachers(teachersWithAvatars);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchGlobalData(); }, []);

  const handleAdminLogin = (token: string) => { setAdminToken(token); localStorage.setItem('adminToken', token); };
  const handleAdminLogout = () => { setAdminToken(null); localStorage.removeItem('adminToken'); };

  const handleStudentLogin = (user: any, token: string) => {
    setStudentToken(token); setStudentUser(user);
    localStorage.setItem('studentToken', token); localStorage.setItem('studentUser', JSON.stringify(user));
  };
  const handleStudentLogout = () => {
    setStudentToken(null); setStudentUser(null);
    localStorage.removeItem('studentToken'); localStorage.removeItem('studentUser');
  };

  const openAuthPopup = (msg = '') => { setAuthMessage(msg); setShowAuthModal(true); };
  const headerTitle = isAdminRoute ? t.adminTitle : t.title;

  return (
    <div className="min-h-screen w-full relative font-sans text-white selection:bg-blue-500/30 flex flex-col">
      
      {/* 💥 CORRECTED BACKGROUND WITH FALLBACK 💥 */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat" 
        style={{ backgroundImage: 'url("/itmo-bg.jpg"), url("https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=2560&auto=format&fit=crop")' }}
      >
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"></div>
      </div>

      <StudentAuthModal lang={lang} isOpen={showAuthModal} onClose={() => { setShowAuthModal(false); setAuthMessage(''); }} defaultMessage={authMessage} onLoginSuccess={handleStudentLogin} />

      <div className="relative z-10 flex flex-col min-h-screen">
        <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/20 backdrop-blur-xl shadow-lg">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="flex items-center justify-between h-16 sm:h-20">
              <Link to="/" className="flex items-center space-x-2 sm:space-x-3 group">
                <div className="p-1.5 sm:p-2 bg-white/10 rounded-lg border border-white/10 group-hover:bg-white/20 transition-colors">
                  <GraduationCap className="text-blue-400" size={20} />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-bold tracking-tight text-white leading-none truncate max-w-[150px] sm:max-w-none">{headerTitle}</h1>
                  <p className="text-[10px] sm:text-xs text-blue-200/80 font-medium tracking-wide uppercase mt-0.5 sm:mt-1">{isAdminRoute ? 'Workspace' : t.subtitle}</p>
                </div>
              </Link>

              <div className="flex items-center space-x-2 sm:space-x-4">
                {!isAdminRoute && (
                  !studentUser ? (
                    <button onClick={() => openAuthPopup()} className="text-xs sm:text-sm font-medium text-white/70 hover:text-white transition-colors px-3 py-1.5 sm:px-4 sm:py-2 border border-white/10 rounded-full bg-white/5 hover:bg-white/10 flex items-center">
                      <span className="hidden sm:inline">{t.loginBtn} / {t.registerBtn}</span>
                      <User size={14} className="sm:hidden" />
                    </button>
                  ) : (
                    <div className="flex items-center border-r border-white/10 pr-2 sm:pr-4 mr-1 sm:mr-2">
                      <Link to="/profile" className="flex items-center hover:bg-white/5 px-2 py-1 rounded-lg transition-colors group cursor-pointer pointer-events-auto">
                        <img src={studentUser.avatar} alt="Avatar" className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-white/20 group-hover:border-blue-400 transition-colors object-cover" />
                        <span className="ml-2 text-xs sm:text-sm font-medium hidden md:block">{studentUser.username}</span>
                      </Link>
                    </div>
                  )
                )}

                <button onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')} className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300 group">
                  <Globe size={14} className="text-blue-300 group-hover:rotate-12 transition-transform sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm font-medium font-mono">{lang.toUpperCase()}</span>
                </button>
              </div>
            </div>
          </div>
        </nav>

        {isLoading ? (
          <div className="flex-grow flex flex-col items-center justify-center"><Loader2 className="animate-spin text-blue-400 mb-4" size={32} /><p className="text-white/60 text-sm">{t.loading}</p></div>
        ) : (
          <Routes>
            <Route path="/" element={<HomePage lang={lang} teachers={teachers} />} />
            <Route path="/teacher/:id" element={<TeacherProfilePage lang={lang} teachers={teachers} setTeachers={setTeachers} guestReviewsEnabled={guestReviewsEnabled} studentUser={studentUser} studentToken={studentToken} openAuthPopup={openAuthPopup} />} />
            <Route path="/profile" element={<StudentProfilePage lang={lang} token={studentToken} onLogout={handleStudentLogout} />} />
            <Route path="/admin" element={adminToken ? <AdminDashboard token={adminToken} onLogout={handleAdminLogout} fetchGlobalTeachers={fetchGlobalData} /> : <AdminLogin onLogin={handleAdminLogin} />} />
          </Routes>
        )}

        {/* 💥 THE CUSTOM FOOTER 💥 */}
        <footer className="mt-auto border-t border-white/10 bg-black/20 backdrop-blur-xl py-6 w-full">
          <div className="max-w-6xl mx-auto px-4 text-center w-full">
            <p className="text-xs sm:text-sm text-white/30 font-light tracking-wide uppercase">
              {t.footer}
            </p>
          </div>
        </footer>

      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <MainApp />
    </BrowserRouter>
  );
}