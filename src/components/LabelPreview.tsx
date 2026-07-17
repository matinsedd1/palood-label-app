import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Product } from '../types';
import { Printer, Loader2 } from 'lucide-react';
import Barcode from 'react-barcode';
import { appendLog } from '../api';
import { tomanIcon, oldPriceIcon, badgeBg } from "../utils/images";

interface LabelPreviewProps {
  product: Product;
  spreadsheetId?: string;
  onAddToQueue?: (product: Product, quantity: number) => void;
  isBatchPrinting?: boolean;
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

export const ThermalLabelUI = ({ product }: { product: Product }) => {
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

  const sellingPriceNum = parsePrice(product.sellingPrice);
  const consumerPriceNum = parsePrice(product.consumerPrice);
  const hasDiscount = sellingPriceNum > 0 && consumerPriceNum > 0 && sellingPriceNum < consumerPriceNum;

  const isValidEAN = (barcode: string | undefined | null) => {
    if (!barcode) return false;
    return /^\d{12,13}$/.test(barcode.trim());
  };

  return (
    <div className="bg-white relative print:border-none print:shadow-none mx-auto overflow-hidden batch-printable printable-label" 
         style={{ width: '80mm', height: '45mm', direction: 'rtl' }}>
         
      <div 
        className="w-full h-[48mm] bg-white text-black box-border flex flex-col justify-between overflow-hidden p-[3mm] break-inside-avoid print:break-inside-avoid"
        style={{ fontFamily: '"Vazirmatn", "IRANSansX", sans-serif', direction: 'rtl' }}
      >
        {/* 1. Header: Product Name & Code */}
        <div className="flex flex-col items-start leading-tight mb-2 w-full shrink-0 mt-[2px]">
          <AutoTextScaler text={toPersianDigits(product.name || 'نام کالا نامشخص')} />
          <span className="text-[12px] pt-[1px] font-medium text-black mt-0.5">
            {toPersianDigits(product.code || '')}
          </span>
        </div>

        {/* 2. Middle Row: Prices & Discount Badge */}
        <div className="flex-1 flex justify-between items-start w-full mt-0 mb-0">
          {/* Discount Badge (Right) */}
          <div className="relative flex-shrink-0 flex items-center justify-center" style={{ width: '90px', height: '58px', marginTop: '-4px' }}>
            {(() => {
              const isOldPrice = product.isOldPrice;
              const showDiscount = hasDiscount && product.discountPercentage && product.discountPercentage !== '0' && product.discountPercentage !== '0.00%' && product.discountPercentage !== '0%';
              
              if (isOldPrice && showDiscount) {
                return (
                  <>
                    <img src={oldPriceIcon} alt="قیمت قدیم" className="w-full h-full object-contain print:color-adjust-exact" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
                    <div 
                      className="absolute -top-1 -left-2 w-[34px] h-[34px] -ml-[10px] -mt-[8px] mb-0 rounded-full bg-gray-300 flex items-center justify-center z-10 print:color-adjust-exact"
                      style={{ 
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact'
                      }}
                    >
                      <span className="text-[16px] font-black leading-none text-black print:text-black mt-0.5" dir="ltr" style={{ WebkitTextFillColor: 'black' }}>
                        {toPersianDigits(Math.round(parseFloat(product.discountPercentage as string)))}٪
                      </span>
                    </div>
                  </>
                );
              } else if (isOldPrice) {
                return <img src={oldPriceIcon} alt="قیمت قدیم" className="w-full h-full object-contain print:color-adjust-exact" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />;
              } else if (showDiscount) {
                return (
                  <div 
                    className="flex flex-col items-center justify-center bg-no-repeat bg-contain bg-center print:color-adjust-exact mt-0 mb-0"
                    style={{ 
                      width: '66px', 
                      height: '49px',
                      backgroundImage: `url(${badgeBg})`,
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact'
                    }}
                  >
                    <span className="text-[24px] font-black leading-none text-white print:text-white mt-1" dir="ltr" style={{ WebkitTextFillColor: 'white' }}>
                      {toPersianDigits(Math.round(parseFloat(product.discountPercentage as string)))}٪
                    </span>
                  </div>
                );
              } else {
                return <div style={{ width: '10px' }}></div>;
              }
            })()}
          </div>

          {/* Prices (Left) */}
          <div className="flex flex-col items-end mr-auto shrink-0 -mt-[5px]">
            {hasDiscount ? (
              <>
                {/* Old Price */}
                <div className="flex items-center gap-1.5 -mt-[3px] mb-0 pt-[5px]">
                  <span className="text-[19px] font-medium text-black/70 leading-none line-through decoration-slate-600 decoration-2">
                    {formatPricePersian(product.consumerPrice)}
                  </span>
                  <img src={tomanIcon} alt="تومان" className="w-[17px] h-[17px] object-contain opacity-60" />
                </div>
                {/* New Price */}
                <div className="flex items-center gap-2">
                  <span className="text-[40px] font-black tracking-tighter leading-none">
                    {formatPricePersian(product.sellingPrice)}
                  </span>
                  <img src={tomanIcon} alt="تومان" className="w-[30px] h-[30px] object-contain" />
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[40px] font-black tracking-tighter leading-none">
                  {formatPricePersian(product.sellingPrice) || '-'}
                </span>
                {product.sellingPrice && <img src={tomanIcon} alt="تومان" className="w-[30px] h-[30px] object-contain" />}
              </div>
            )}
          </div>
        </div>

        {/* 3. Footer: Date & Barcode */}
        <div className="flex justify-between items-end w-full shrink-0 mt-0 mb-[2px] pb-1">
          {/* Bottom Right: Barcode */}
          <div className="flex flex-col items-center break-inside-avoid print:break-inside-avoid">
            {product.barcode ? (
              isValidEAN(product.barcode) ? (
                <div className="flex flex-col items-center justify-center shrink-0" style={{ maxWidth: '100%' }}>
                  <div className="font-normal flex items-center justify-center shrink-0" dir="ltr">
                    <Barcode 
                       value={product.barcode.trim()} 
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
                    {product.barcode}
                  </span>
                </div>
              )
            ) : (
              <div className="text-[10px] font-medium">بدون بارکد</div>
            )}
          </div>

          {/* Bottom Left: Date */}
          <div className="text-[11px] font-medium text-black leading-none mb-1">
            {toPersianDigits(new Date().toLocaleDateString('fa-IR').replace(/\//g, '.'))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function LabelPreview({ product, spreadsheetId, onAddToQueue, isBatchPrinting }: LabelPreviewProps) {
  const [editableProduct, setEditableProduct] = useState<Product>(product);
  const [quantity, setQuantity] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);
  const [previewPdfBase64, setPreviewPdfBase64] = useState<string | null>(null);

  useEffect(() => {
    setEditableProduct(product);
  }, [product]);

  const handlePrint = async () => {
    setIsPrinting(true);
    
    try {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        // Wait a bit to ensure rendering is complete before snapshot
        await new Promise(resolve => setTimeout(resolve, 100));
        const element = document.querySelector('#single-print-label-container .printable-label') as HTMLElement;
        if (element) {
          const canvas = await html2canvas(element, {
            backgroundColor: '#ffffff',
            scale: 2 // High quality
          });
          
          const imgData = canvas.toDataURL('image/png');
          
          // Create PDF: 58mm x 78mm
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [58, 78]
          });
          
          // Add image to PDF
          pdf.addImage(imgData, 'PNG', 0, 0, 58, 78);
          
          // Get PDF as base64
          const pdfBase64 = pdf.output('datauristring').split(',')[1];
          
          // Show preview modal instead of sending directly
          setPreviewPdfBase64(pdfBase64);
          setIsPrinting(false);
        }
      } else {
        setTimeout(() => {
          window.print();
          setIsPrinting(false);
          if (spreadsheetId) {
            try {
              appendLog(spreadsheetId, 'چاپ لیبل', editableProduct).catch(err => {
                console.warn('Failed to log print action', err);
              });
            } catch (err) {
              console.warn('Failed to log print action', err);
            }
          }
        }, 100);
      }
    } catch (err) {
      console.error('Print error:', err);
      setIsPrinting(false);
    }
  };

  const handleConfirmMobilePrint = () => {
    if (previewPdfBase64) {
      window.location.href = "rawbt:base64," + previewPdfBase64;
      setPreviewPdfBase64(null);
      if (spreadsheetId) {
        try {
          appendLog(spreadsheetId, 'چاپ لیبل', editableProduct).catch(err => {
            console.warn('Failed to log print action', err);
          });
        } catch (err) {
          console.warn('Failed to log print action', err);
        }
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
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-1 border border-slate-200 dark:border-slate-600">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 pl-1">تعداد:</span>
            <input 
              type="number" 
              min="1"
              value={quantity}
              onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-12 h-8 text-center text-sm font-bold bg-white dark:bg-slate-800 border-none rounded-md outline-none"
            />
          </div>
          <button 
            onClick={() => {
              onAddToQueue?.(editableProduct, quantity);
              setQuantity(1); // Reset after adding
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md transition-all whitespace-nowrap"
          >
            افزودن به صف
          </button>
          <button 
            onClick={() => handlePrint()}
            disabled={isPrinting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-md transition-all whitespace-nowrap flex items-center justify-center min-w-[100px]"
          >
            {isPrinting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'چاپ سریع'}
          </button>
        </div>
      </div>

      <div className="flex-1 bg-slate-200 dark:bg-slate-900 p-4 md:p-8 flex flex-col lg:flex-row gap-6 md:gap-8 overflow-y-auto print:bg-transparent print:p-0">
        {/* Mobile Preview Modal */}
        {previewPdfBase64 && (
          <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl max-w-sm w-full p-4 flex flex-col items-center">
              <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white text-center">
                پیش‌نمایش چاپ
              </h3>
              
              <div className="border border-slate-200 dark:border-slate-700 p-2 rounded-lg bg-slate-50 dark:bg-slate-900 mb-6 flex justify-center items-center w-full">
                <iframe 
                  src={`data:application/pdf;base64,${previewPdfBase64}#toolbar=0&navpanes=0&scrollbar=0`}
                  className="w-[58mm] h-[78mm] bg-white shadow-sm mx-auto"
                  title="PDF Preview"
                />
              </div>

              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setPreviewPdfBase64(null)}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
                >
                  انصراف
                </button>
                <button 
                  onClick={handleConfirmMobilePrint}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium text-sm shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  ارسال به RawBT
                </button>
              </div>
            </div>
          </div>
        )}

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
              <div className="flex items-center gap-2 mb-2">
                <input 
                  type="checkbox" 
                  id="isOldPrice"
                  checked={editableProduct.isOldPrice || false}
                  onChange={(e) => handleChange('isOldPrice', e.target.checked as any)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="isOldPrice" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  قیمت قدیم
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview / Printable Label Area */}
        <div id="single-print-label-container" className={`w-full lg:w-1/2 flex justify-center items-start print:w-full print:block overflow-x-auto pb-4 ${isBatchPrinting ? 'print:hidden' : ''}`}>
          <ThermalLabelUI product={editableProduct} />
        </div>
      </div>
    </div>
  );
}
