import { Product } from './types';

export async function fetchSheetData(spreadsheetId: string): Promise<Product[]> {
  const res = await fetch(`/api/sheets/${spreadsheetId}`);
  if (!res.ok) {
    let errorMsg = 'Failed to fetch sheet data'; try { const error = await res.json(); errorMsg = error.error || errorMsg; } catch(e) { errorMsg = `Server error (${res.status})`; } throw new Error(errorMsg);
  }

  const rows: string[][] = await res.json();
  if (!rows || rows.length === 0) return [];

  // Parse headers
  const headers = rows[0].map(h => h.trim());
  
  // Find column indexes using fuzzy matching based on expected column names
  const codeIdx = headers.findIndex(h => h.includes('کد کالا'));
  const nameIdx = headers.findIndex(h => h.includes('نام کالا'));
  const discountIdx = headers.findIndex(h => h.includes('تخفیف'));
  const sellingPriceIdx = headers.findIndex(h => h.includes('قیمت فروش'));
  const consumerPriceIdx = headers.findIndex(h => h.includes('قیمت مصرف'));
  
  // Barcode 1 logic: check for "پیش فرض" (primary), but exclude "غیر پیش فرض" (non-primary)
  const barcodeIdx = headers.findIndex(h => h.includes('پیش فرض') && !h.includes('غیر'));
  // Barcode 2 logic: check for "غیر پیش فرض" (secondary)
  const barcode2Idx = headers.findIndex(h => h.includes('غیر پیش فرض'));
  // Production and Expiration dates
  const prodDateIdx = headers.findIndex(h => h.includes('تاریخ تولید'));
  const expDateIdx = headers.findIndex(h => h.includes('تاریخ انقضا') || h.includes('تاریخ انقضاء'));

  const products: Product[] = [];

  const processPrice = (val: string) => {
    if (!val) return '';
    const num = Number(val.replace(/[^\d.-]/g, ''));
    if (!isNaN(num) && val.replace(/[^\d.-]/g, '') !== '') {
      return Math.floor(num / 10).toString();
    }
    return val;
  };

  const processDiscount = (val: string) => {
    if (!val) return '';
    const num = parseFloat(val);
    if (!isNaN(num)) {
      return Math.round(num).toString();
    }
    return val;
  };

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    
    let sellingPrice = sellingPriceIdx !== -1 ? (row[sellingPriceIdx] || '') : '';
    let consumerPrice = consumerPriceIdx !== -1 ? (row[consumerPriceIdx] || '') : '';
    let discountPercentage = discountIdx !== -1 ? (row[discountIdx] || '') : '';

    products.push({
      code: codeIdx !== -1 ? (row[codeIdx] || '') : '',
      name: nameIdx !== -1 ? (row[nameIdx] || '') : '',
      discountPercentage: processDiscount(discountPercentage),
      sellingPrice: processPrice(sellingPrice),
      consumerPrice: processPrice(consumerPrice),
      barcode: barcodeIdx !== -1 ? (row[barcodeIdx] || '') : '',
      barcode2: barcode2Idx !== -1 ? (row[barcode2Idx] || '') : '',
      productionDate: prodDateIdx !== -1 ? (row[prodDateIdx] || '') : '',
      expirationDate: expDateIdx !== -1 ? (row[expDateIdx] || '') : '',
    });
  }

  return products;
}

export async function fetchLogs(spreadsheetId: string) {
  const res = await fetch(`/api/sheets/${spreadsheetId}/logs`);
  if (!res.ok) {
    let errorMsg = 'Failed to fetch logs'; try { const error = await res.json(); errorMsg = error.error || errorMsg; } catch(e) { errorMsg = `Server error (${res.status})`; } throw new Error(errorMsg);
  }
  const rows = await res.json();
  return rows;
}

export async function appendLog(spreadsheetId: string, action: string, product: Product) {
  const res = await fetch(`/api/sheets/${spreadsheetId}/logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action,
      code: product.code,
      name: product.name,
      price: product.sellingPrice,
    }),
  });
  if (!res.ok) {
    let errorMsg = 'Failed to append log'; try { const error = await res.json(); errorMsg = error.error || errorMsg; } catch(e) { errorMsg = `Server error (${res.status})`; } throw new Error(errorMsg);
  }
  return res.json();
}
