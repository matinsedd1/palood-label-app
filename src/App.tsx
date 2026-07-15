import React, { useEffect, useState } from 'react';
import { Product } from './types';
import { fetchSheetData } from './api';
import Dashboard from './components/Dashboard';
import ActivityLogModal from './components/ActivityLogModal';
import { Moon, Sun, Settings, History } from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
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
    if (spreadsheetId && !isConfiguring && products.length === 0) {
      loadData();
    }
  }, [spreadsheetId, isConfiguring]);

  return (
    <>
      <div className="flex flex-col h-screen w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans overflow-hidden">
        <header className="h-16 flex items-center justify-between px-6 bg-white/90 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 shadow-sm z-10 print:hidden">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex flex-col items-start">
            <img src="/logo.png" alt="پالود پخش پارس" className="h-6 sm:h-8 object-contain dark:brightness-200" />
            <span className="text-[8px] sm:text-[10px] text-slate-500 font-bold mt-1 tracking-wider">اتیکت قفسه</span>
          </div>
          <div className="hidden sm:flex mr-4 pr-4 border-r border-slate-200 dark:border-slate-700 h-8 items-center">
            <p className="text-xs text-slate-500 font-medium">متصل به Google Sheets: انبار مرکزی</p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-3">
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors">
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          {!isConfiguring && spreadsheetId && (
            <button onClick={() => setShowLogs(true)} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors" title="تاریخچه فعالیت‌ها">
              <History className="w-5 h-5" />
            </button>
          )}
          <button onClick={() => setIsConfiguring(!isConfiguring)} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-6 gap-6 w-full print:p-0 print:m-0 relative z-0">
        {isConfiguring ? (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-start sm:justify-center bg-slate-50 dark:bg-slate-900 p-4 sm:p-8 overflow-y-auto overflow-x-hidden">
            <div className="flex flex-col w-full max-w-md h-full min-h-[600px] justify-start sm:justify-center relative">
              <div className="w-full bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700/50 transform transition-all z-10 shrink-0 mt-8 sm:mt-0 relative">
                <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center text-slate-800 dark:text-white">تنظیمات اتصال به شیت</h2>
                <div className="mb-4 sm:mb-6">
                  <label className="block text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">شناسه شیت (Spreadsheet ID)</label>
                  <input 
                    type="text" 
                    value={spreadsheetId} 
                    onChange={(e) => setSpreadsheetId(e.target.value)} 
                    className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700/50 focus:ring-4 focus:ring-blue-500/30 outline-none transition-all font-mono text-left"
                    placeholder="1BxiMvs0XRY..."
                    dir="ltr"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 sm:mt-3 text-center">شناسه موجود در آدرس URL فایل گوگل شیت شما.</p>
                </div>
                {error && <div className="text-red-500 text-sm mb-4 text-center bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{error}</div>}
                <button 
                  onClick={loadData}
                  disabled={loading || !spreadsheetId}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'در حال بارگذاری...' : 'ذخیره و ورود'}
                </button>
              </div>
              
              <div className="w-full flex-1 relative z-0 min-h-[300px] -mt-10 overflow-hidden">
                 <iframe src="https://my.spline.design/aicompanionrobot-qo7L2r4zZFOTW2oUdiyjISTi/" frameBorder="0" className="absolute inset-0 w-full h-[calc(100%+60px)] pointer-events-auto" style={{ border: 'none' }}></iframe>
              </div>
            </div>
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
    </>
  );
}
