import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Product } from '../types';
import { Search, RefreshCw, Camera, Keyboard, X } from 'lucide-react';
import CameraScanner from './CameraScanner';
import LabelPreview from './LabelPreview';

interface DashboardProps {
  products: Product[];
  onRefresh: () => void;
  loading: boolean;
  spreadsheetId: string;
}

export default function Dashboard({ products, onRefresh, loading, spreadsheetId }: DashboardProps) {
  const [query, setQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [scannerMode, setScannerMode] = useState<'none' | 'camera'>('none');
  const usbBufferRef = useRef('');

  // Handle unified search
  useEffect(() => {
    if (!query) {
      setFilteredProducts([]);
      return;
    }
    const q = query.toLowerCase();
    const results = products.filter(p => 
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.barcode2 && p.barcode2.toLowerCase().includes(q)) ||
      (p.code && p.code.toLowerCase().includes(q)) ||
      (p.name && p.name.toLowerCase().includes(q))
    );
    setFilteredProducts(results.slice(0, 50)); // Limit results
  }, [query, products]);

  const handleScan = useCallback((scannedCode: string) => {
    if (!scannedCode) return;
    
    setScannerMode('none');
    setQuery(scannedCode);
    
    const match = products.find(p => {
      if (p.barcode === scannedCode || p.code === scannedCode) return true;
      if (p.barcode2 && p.barcode2.includes(scannedCode)) return true;
      return false;
    });

    if (match) {
      setSelectedProduct(match);
    } else {
      // Not found, maybe show a toast or alert, but the query is already set
      // so it will show "No results" in the dropdown area naturally.
      alert(`کالایی با بارکد ${scannedCode} یافت نشد.`);
    }
  }, [products]);

  // Global keydown handler to auto-focus search input
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if already typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // If it's a character key, focus the search input
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const searchInput = document.getElementById('main-search') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  const selectProduct = (product: Product) => {
    setSelectedProduct(product);
    setQuery('');
    setTimeout(() => {
      document.getElementById('label-editor-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden gap-6 w-full print:block print:overflow-visible">
      {/* Sidebar / Search Area */}
      <div className="w-full lg:w-[400px] flex flex-col gap-4 overflow-visible lg:overflow-y-auto lg:pr-1 print:hidden z-30 custom-scrollbar">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">جستجو و اسکن</h2>
            <button 
              onClick={onRefresh} 
              disabled={loading}
              className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          
          <div className="relative mb-4 z-50">
            <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              id="main-search"
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value) {
                  handleScan(e.currentTarget.value);
                }
              }}
              placeholder="جستجو بر اساس نام، کد یا اسکن بارکد..."
              className="w-full pr-10 pl-10 py-3 md:py-2 bg-slate-100 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 rounded-full text-sm transition-all dark:bg-slate-700 dark:focus:bg-slate-800 outline-none"
            />
            {query && (
              <button 
                onClick={() => setQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
            
            {/* Search Results (Absolute Dropdown) */}
            {query && filteredProducts.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-y-auto max-h-[300px] custom-scrollbar z-[100]">
                {filteredProducts.map((p, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => selectProduct(p)}
                    className="p-4 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                  >
                    <div className="font-bold text-sm sm:text-base mb-1">{p.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex justify-between items-center mt-1">
                      <span className="font-mono">کد: {p.code}</span>
                      <div className="flex flex-col items-end gap-1">
                        {p.barcode && <span className="font-mono bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded">بارکد: {p.barcode}</span>}
                        {p.barcode2 && p.barcode2 !== '-' && <span className="font-mono bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded">بارکد ۲: {p.barcode2}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {query && filteredProducts.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 p-5 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 text-center text-slate-500 text-sm z-[100]">
                هیچ نتیجه‌ای یافت نشد.
              </div>
            )}
          </div>


          <div className="flex items-center gap-3">
            <button 
              onClick={() => setScannerMode(scannerMode === 'camera' ? 'none' : 'camera')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                scannerMode === 'camera' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              <Camera className="w-4 h-4" />
              دوربین
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-100 text-sm font-medium transition-colors dark:bg-slate-700 text-slate-700 dark:text-slate-200">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              اسکنر آماده
            </div>
          </div>
        </div>

        {/* Camera Scanner View */}
        {scannerMode === 'camera' && (
          <div className="bg-slate-900 rounded-xl p-4 sm:p-5 text-white flex flex-col gap-3 flex-1 min-h-[250px] sm:min-h-[300px] relative overflow-hidden">
            <div className="flex items-center justify-between z-10">
              <h2 className="text-sm font-bold opacity-80">پیش‌نمایش دوربین اسکنر</h2>
            </div>
            <div className="flex-1 bg-black rounded-lg overflow-hidden border border-white/10 relative">
              <CameraScanner onScan={handleScan} />
            </div>
          </div>
        )}

        
            </div>
      {/* Main Content Area / Label Editor */}
      <div className="w-full lg:flex-1 flex flex-col z-10">
        {selectedProduct ? (
          <LabelPreview product={selectedProduct} spreadsheetId={spreadsheetId} />
        ) : (
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden h-full">
            <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 md:px-6 md:py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-600" />
                ویرایشگر لیبل حرارتی (80x40mm)
              </h2>
            </div>
            <div className="flex-1 bg-slate-200 dark:bg-slate-900 p-8 flex flex-col items-center justify-center text-slate-400 overflow-hidden text-center">
              <Search className="w-16 h-16 mb-4 text-slate-300 dark:text-slate-700" />
              <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-400">محصولی انتخاب نشده است</h3>
              <p className="mt-2 text-slate-500 text-sm max-w-sm">
                برای مشاهده و چاپ لیبل، می‌توانید محصول مورد نظر را جستجو کرده و یا از طریق بارکدخوان آن را اسکن کنید.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
