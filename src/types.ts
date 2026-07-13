export interface Product {
  code: string; // کد کالا
  name: string; // نام کالا
  discountPercentage: string; // درصد تخفیف
  sellingPrice: string; // قیمت فروش فعلی
  consumerPrice: string; // قیمت مصرفکننده
  barcode: string; // بارکد
  barcode2?: string; // بارکد دوم
  productionDate?: string; // تاریخ تولید
  expirationDate?: string; // تاریخ انقضا
}

export type Theme = 'light' | 'dark';
