import React, { useState, useEffect, useRef } from 'react';
import { Product } from '../types';
import { Printer } from 'lucide-react';
import Barcode from 'react-barcode';
import { appendLog } from '../api';

interface LabelPreviewProps {
  product: Product;
  spreadsheetId?: string;
}


const AutoTextScaler = ({ text }: { text: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!containerRef.current || !textRef.current) return;
    
    const container = containerRef.current;
    const textNode = textRef.current;
    
    let currentSize = 16;
    textNode.style.fontSize = `${currentSize}px`;
    
    while (textNode.scrollWidth > container.clientWidth && currentSize > 6) {
      currentSize -= 0.5;
      textNode.style.fontSize = `${currentSize}px`;
    }
  }, [text]);

  
  const isValidEAN = (barcode: string | undefined | null) => {
    if (!barcode) return false;
    return /^\d{12,13}$/.test(barcode.trim());
  };

  return (
    <div ref={containerRef} className="w-full overflow-hidden text-right whitespace-nowrap" dir="rtl">
      <span ref={textRef} className="font-bold inline-block leading-tight">
        {text}
      </span>
    </div>
  );
};

export default function LabelPreview({ product, spreadsheetId }: LabelPreviewProps) {
  const [editableProduct, setEditableProduct] = useState<Product>(product);
  const [isOldPrice, setIsOldPrice] = useState(false);

  useEffect(() => {
    setEditableProduct(product);
  }, [product]);

  const handlePrint = async () => {
    if (window.self !== window.top) {
      alert('به دلیل محدودیت‌های مرورگر در حالت پیش‌نمایش، لطفاً برنامه را با کلیک روی آیکون "Open in new tab" (بالا سمت راست - فلش در مربع) در تب جدید باز کنید تا دکمه چاپ به درستی کار کند.');
    }
    window.print();
    if (spreadsheetId) {
      try {
        await appendLog(spreadsheetId, 'چاپ لیبل', editableProduct);
      } catch (err) {
        console.warn('Failed to log print action', err);
      }
    }
  };

  const handleChange = (field: keyof Product, value: string) => {
    setEditableProduct(prev => ({ ...prev, [field]: value }));
  };

  const parsePrice = (priceStr: string | undefined | null) => {
    if (!priceStr) return 0;
    return Number(priceStr.replace(/[^0-9]/g, ''));
  };

  const toPersianDigits = (str: string | number | undefined | null) => {
    if (!str) return '';
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return str.toString().replace(/\d/g, (x) => persianDigits[parseInt(x)]);
  };

  const formatPricePersian = (price: string | number | undefined | null) => {
    if (!price) return '';
    const num = Number(price.toString().replace(/\D/g, ''));
    if (isNaN(num) || num === 0) return toPersianDigits(price);
    return num.toLocaleString('fa-IR');
  };

  const sellingPriceNum = parsePrice(editableProduct.sellingPrice);
  const consumerPriceNum = parsePrice(editableProduct.consumerPrice);
  const hasDiscount = sellingPriceNum > 0 && consumerPriceNum > 0 && sellingPriceNum < consumerPriceNum;

  
  const isValidEAN = (barcode: string | undefined | null) => {
    if (!barcode) return false;
    return /^\d{12,13}$/.test(barcode.trim());
  };

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden h-full">
      <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 md:px-6 md:py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between print:hidden">
        <h2 className="font-bold flex items-center gap-2">
          <Printer className="w-5 h-5 text-blue-600" />
          ویرایشگر لیبل حرارتی (80x48mm)
        </h2>
        <button 
          onClick={() => handlePrint()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-md transition-all"
        >
          چاپ نهایی
        </button>
      </div>

      <div className="flex-1 bg-slate-200 dark:bg-slate-900 p-4 md:p-8 flex flex-col lg:flex-row gap-6 md:gap-8 overflow-y-auto print:bg-transparent print:p-0">
        {/* Editor Form - Hidden on print */}
        <div id="label-editor-section" className="w-full lg:w-1/2 flex flex-col gap-4 print:hidden bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-fit">
          <div>
            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">نام کالا</label>
            <textarea 
              value={editableProduct.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">قیمت فروش (تومان)</label>
              <input 
                type="text" 
                value={editableProduct.sellingPrice}
                onChange={(e) => handleChange('sellingPrice', e.target.value)}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">قیمت مصرف‌کننده (تومان)</label>
              <input 
                type="text" 
                value={editableProduct.consumerPrice}
                onChange={(e) => handleChange('consumerPrice', e.target.value)}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">درصد تخفیف</label>
              <input 
                type="text" 
                value={editableProduct.discountPercentage}
                onChange={(e) => handleChange('discountPercentage', e.target.value)}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">کد کالا</label>
              <input 
                type="text" 
                value={editableProduct.code}
                onChange={(e) => handleChange('code', e.target.value)}
                className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="col-span-2 flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">بارکد</label>
                <input 
                  type="text" 
                  value={editableProduct.barcode}
                  onChange={(e) => handleChange('barcode', e.target.value)}
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex items-center mb-2">
                <label className="-mb-2 ml-0 mt-0 text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer flex items-center gap-2 border border-slate-300 dark:border-slate-600 px-3 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors select-none">
                  <input 
                    type="checkbox" 
                    checked={isOldPrice}
                    onChange={(e) => setIsOldPrice(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  قیمت قدیم
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview / Printable Label Area */}
        <div className="w-full lg:w-1/2 flex justify-center items-start print:w-full print:block overflow-x-auto pb-4">
          <div className="bg-white relative print:border-none print:shadow-none mx-auto overflow-hidden" 
               id="printable-label"
               style={{ width: '80mm', height: '48mm', direction: 'rtl' }}>
               
                                                {/* Professional Thermal Label Layout (Flex Col) */}
            <div 
              className="w-full h-[48mm] bg-white text-black box-border flex flex-col justify-between overflow-hidden p-[3mm] break-inside-avoid print:break-inside-avoid"
              style={{ fontFamily: '"Vazirmatn", "IRANSansX", sans-serif', direction: 'rtl' }}
            >
              {/* 1. Header: Product Name & Code */}
              <div className="flex flex-col items-start leading-tight mb-2 w-full shrink-0 mt-[2px]">
                <AutoTextScaler text={toPersianDigits(editableProduct.name || 'نام کالا نامشخص')} />
                <span className="text-[12px] pt-[1px] font-medium text-black mt-0.5">
                  {toPersianDigits(editableProduct.code || '')}
                </span>
              </div>

              {/* 2. Middle Row: Prices & Discount Badge */}
              <div className="flex-1 flex justify-between items-start w-full -mt-[5px] mb-0">
                {/* Discount Badge (Right) */}
                <div className="flex-shrink-0">
                  {hasDiscount && editableProduct.discountPercentage && editableProduct.discountPercentage !== '0' && editableProduct.discountPercentage !== '0.00%' && editableProduct.discountPercentage !== '0%' ? (
                    <div 
                      className="flex flex-col items-center justify-center bg-no-repeat bg-contain bg-center print:color-adjust-exact mt-0 mb-0"
                      style={{ 
                        width: '66px', 
                        height: '49px',
                        backgroundImage: 'url(/badge-bg.png)',
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact'
                      }}
                    >
                      <span className="text-[24px] font-black leading-none text-white print:text-white mt-1" dir="ltr" style={{ WebkitTextFillColor: 'white' }}>
                        {toPersianDigits(Math.round(parseFloat(editableProduct.discountPercentage)))}٪
                      </span>
                      
                    </div>
                  ) : (
                    <div style={{ width: '10px' }}></div>
                  )}
                </div>

                {/* Prices (Left) */}
                <div className="flex flex-col items-end mr-auto shrink-0 -mt-[5px]">
                  {hasDiscount ? (
                    <>
                      {/* Old Price */}
                      <div className="flex items-center gap-1.5 mt-1 mb-0.5 pt-[5px]">
                        <span className="text-[19px] font-medium text-black/70 leading-none line-through decoration-slate-600 decoration-2">
                          {formatPricePersian(editableProduct.consumerPrice)}
                        </span>
                        <img src="/toman-icon.png" alt="تومان" className="w-[17px] h-[17px] object-contain opacity-60" />
                      </div>
                      {/* New Price */}
                      <div className="flex items-center gap-2">
                        <span className="text-[40px] font-black tracking-tighter leading-none">
                          {formatPricePersian(editableProduct.sellingPrice)}
                        </span>
                        <img src="/toman-icon.png" alt="تومان" className="w-[30px] h-[30px] object-contain" />
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[40px] font-black tracking-tighter leading-none">
                        {formatPricePersian(editableProduct.sellingPrice) || '-'}
                      </span>
                      {editableProduct.sellingPrice && <img src="/toman-icon.png" alt="تومان" className="w-[30px] h-[30px] object-contain" />}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Footer: Date & Barcode */}
              <div className="flex justify-between items-end w-full shrink-0 mt-0 -mb-[6px] pb-1 relative">
                {isOldPrice && (
                  <div className="absolute left-0 bottom-[14px] mt-0 mb-[10px] ml-[24px] mr-0 text-black font-black text-[18px] whitespace-nowrap z-10">
                    قیمت قدیم
                  </div>
                )}
                {/* Bottom Right: Barcode */}
                <div className="flex flex-col items-center break-inside-avoid print:break-inside-avoid">
                  {editableProduct.barcode ? (
                    isValidEAN(editableProduct.barcode) ? (
                      <div className="flex flex-col items-center justify-center shrink-0" style={{ maxWidth: '100%' }}>
                        <div className="font-normal flex items-center justify-center shrink-0" dir="ltr">
                          <Barcode 
                             value={editableProduct.barcode.trim()} 
                             format="EAN13"
                             width={1.4} 
                             height={35} 
                             margin={2} 
                             background="transparent" 
                             lineColor="#000000"
                             displayValue={true}
                             fontSize={11}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center border border-dashed border-gray-400 p-1 rounded min-w-[30mm] h-[30px]">
                        <div className="text-[8px] font-bold text-red-600 mb-[2px]">بارکد ۱۳ رقمی نیست</div>
                        <span className="text-[10px] font-medium text-black" style={{ fontFamily: 'Arial, sans-serif', letterSpacing: '2px' }} dir="ltr">
                          {editableProduct.barcode}
                        </span>
                      </div>
                    )
                  ) : (
                    <div className="text-[10px] font-medium">بدون بارکد</div>
                  )}
                </div>

                {/* Bottom Left: Date */}
                <div className="text-[11px] font-medium text-black leading-none mb-0">
                  {toPersianDigits(new Date().toLocaleDateString('fa-IR').replace(/\//g, '.'))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
