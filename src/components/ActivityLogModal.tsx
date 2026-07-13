import React, { useEffect, useState } from 'react';
import { X, RefreshCcw } from 'lucide-react';
import { fetchLogs } from '../api';

interface ActivityLogModalProps {
  spreadsheetId: string;
  onClose: () => void;
}

export default function ActivityLogModal({ spreadsheetId, onClose }: ActivityLogModalProps) {
  const [logs, setLogs] = useState<string[][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchLogs(spreadsheetId);
      // skip headers, get last 10, reverse for newest first
      const dataRows = data.length > 1 ? data.slice(1) : [];
      setLogs(dataRows.slice(-10).reverse());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [spreadsheetId]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:hidden">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="font-bold text-lg">تاریخچه چاپ و فعالیت‌ها</h2>
          <div className="flex items-center gap-2">
            <button onClick={loadLogs} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors" title="به‌روزرسانی">
              <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors text-red-500">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {error ? (
            <div className="text-red-500 text-center py-4">{error}</div>
          ) : loading && logs.length === 0 ? (
            <div className="text-center py-4">در حال دریافت تاریخچه...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-4 text-slate-500">هیچ فعالیتی ثبت نشده است.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-2 rounded-r-lg">تاریخ و ساعت</th>
                    <th className="px-4 py-2">نوع عملیات</th>
                    <th className="px-4 py-2">کد کالا</th>
                    <th className="px-4 py-2">نام کالا</th>
                    <th className="px-4 py-2 rounded-l-lg">قیمت فروش نهایی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {logs.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-4 py-3">{row[0]}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          row[1] === 'چاپ لیبل' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                          row[1] === 'ویرایش دستی قیمت' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
                          'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}>
                          {row[1]}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono">{row[2]}</td>
                      <td className="px-4 py-3 max-w-[200px] truncate" title={row[3]}>{row[3]}</td>
                      <td className="px-4 py-3">{row[4]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
