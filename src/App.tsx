import React, { useEffect, useState } from 'react';
import { Product } from './types';
import { fetchSheetData } from './api';
import Dashboard from './components/Dashboard';
import ActivityLogModal from './components/ActivityLogModal';
import { Moon, Sun, Settings, History } from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState(() => localStorage.getItem('spreadsheetId') || '');
  const [isConfiguring, setIsConfiguring] = useState(!spreadsheetId);
  const [showLogs, setShowLogs] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.documentElement.dir = 'rtl';
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    fetch('/api/auth/status')
      .then(res => res.json())
      .then(data => setAuthenticated(data.authenticated))
      .catch(() => setAuthenticated(false));
  }, []);

  const handleLogin = async () => {
    try {
      const res = await fetch('/api/auth/url');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Login failed', err);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setAuthenticated(false);
    setProducts([]);
  };

  const loadData = async () => {
    if (!spreadsheetId) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchSheetData(spreadsheetId);
      setProducts(data);
      setIsConfiguring(false);
      localStorage.setItem('spreadsheetId', spreadsheetId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated && spreadsheetId && !isConfiguring && products.length === 0) {
      loadData();
    }
  }, [authenticated, spreadsheetId, isConfiguring]);

  if (authenticated === null) {
    return <div className="min-h-screen flex items-center justify-center">در حال بارگذاری...</div>;
  }

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans overflow-hidden">
      <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm z-10 print:hidden">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex flex-col items-start">
            <img src="/logo.png" alt="پالود پخش پارس" className="h-6 sm:h-8 object-contain dark:brightness-200" />
            <span className="text-[8px] sm:text-[10px] text-slate-500 font-bold mt-1 tracking-wider">اتیکت قفسه</span>
          </div>
          {authenticated && (
            <div className="hidden sm:flex mr-4 pr-4 border-r border-slate-200 dark:border-slate-700 h-8 items-center">
              <p className="text-xs text-slate-500 font-medium">متصل به Google Sheets: انبار مرکزی</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 sm:gap-3">
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors">
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          {authenticated && !isConfiguring && spreadsheetId && (
            <button onClick={() => setShowLogs(true)} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors" title="تاریخچه فعالیت‌ها">
              <History className="w-5 h-5" />
            </button>
          )}
          {authenticated && (
            <button onClick={() => setIsConfiguring(!isConfiguring)} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          )}
          {authenticated ? (
            <button onClick={handleLogout} className="text-sm px-4 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200">خروج</button>
          ) : (
            <button onClick={handleLogin} className="text-sm px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">ورود</button>
          )}
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-6 gap-6 w-full print:p-0 print:m-0">
        {!authenticated ? (
          <div className="m-auto text-center py-20 flex flex-col items-center overflow-y-auto">
            <h2 className="text-2xl font-semibold mb-4">به سیستم چاپ لیبل خوش آمدید</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-lg">
              برای شروع، لطفاً با حساب کاربری گوگل خود وارد شوید. این سیستم برای همگام‌سازی اطلاعات کالاها نیازمند دسترسی به Google Sheets است.
            </p>
            <button onClick={handleLogin} className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">ورود و اتصال به گوگل شیت</button>
          </div>
        ) : isConfiguring ? (
          <div className="max-w-md mx-auto bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm mt-10 h-fit">
            <h2 className="text-lg font-bold mb-4">تنظیمات اتصال به شیت</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">شناسه شیت (Spreadsheet ID)</label>
              <input 
                type="text" 
                value={spreadsheetId} 
                onChange={(e) => setSpreadsheetId(e.target.value)} 
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="1BxiMvs0XRY..."
              />
              <p className="text-xs text-slate-500 mt-2">شناسه موجود در آدرس URL فایل گوگل شیت شما.</p>
            </div>
            {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
            <button 
              onClick={loadData}
              disabled={loading || !spreadsheetId}
              className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'در حال بارگذاری...' : 'ذخیره و دریافت اطلاعات'}
            </button>
          </div>
        ) : (
          <Dashboard products={products} onRefresh={loadData} loading={loading} spreadsheetId={spreadsheetId} />
        )}
      </main>

      <footer className="h-auto min-h-10 py-2 sm:py-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-2 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-[10px] font-medium text-slate-500 dark:text-slate-400 print:hidden shrink-0 z-10 gap-2 sm:gap-0">
        <div className="flex flex-wrap justify-center gap-2 sm:gap-6">
          <span>اسکنر فیزیکی: <span className="text-green-600 dark:text-green-400">متصل (HID)</span></span>
          <span>وضعیت سیستم: <span className="text-green-600 dark:text-green-400">آنلاین</span></span>
        </div>
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
          <span className="hidden sm:inline">F2: اسکن دستی</span>
          <span className="hidden sm:inline">F5: همگام‌سازی</span>
          <span className="hidden sm:inline">Ctrl+P: چاپ سریع</span>
        </div>
      </footer>
      {showLogs && <ActivityLogModal spreadsheetId={spreadsheetId} onClose={() => setShowLogs(false)} />}
    </div>
  );
}
