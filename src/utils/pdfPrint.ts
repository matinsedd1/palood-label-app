import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

export const generateAndPrintPDF = async (elements: NodeListOf<Element> | Element[]) => {
  if (!elements || elements.length === 0) {
    throw new Error('هیچ لیبلی برای چاپ یافت نشد');
  }

  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [48, 80] // Paper width 48mm, height 80mm
    });

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i] as HTMLElement;

      let dataUrl;
      try {
        dataUrl = await toPng(el, {
          pixelRatio: 3, // High DPI for thermal printer
          backgroundColor: '#ffffff',
          skipFonts: true,
          style: {
             transform: 'none'
          }
        });
      } catch (toPngError: any) {
        console.error('html-to-image error:', toPngError);
        let msg = 'نامشخص';
        if (toPngError instanceof Error) {
           msg = toPngError.message;
        } else if (toPngError && typeof toPngError === 'object' && 'isTrusted' in toPngError) {
           msg = 'خطای بارگذاری فونت یا بارکد (CORS/SVG).';
        } else {
           msg = JSON.stringify(toPngError);
        }
        throw new Error('خطا در تبدیل لیبل به عکس: ' + msg);
      }

      if (!dataUrl || dataUrl === 'data:,') {
        throw new Error(`خروجی عکس نامعتبر است`);
      }

      // Load the image to rotate it
      const img = new Image();
      const imgLoadPromise = new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('خطا در بارگذاری عکس برای چرخش'));
      });
      img.src = dataUrl;
      await imgLoadPromise;

      // Create a new canvas to rotate the image 90 degrees clockwise
      const rotatedCanvas = document.createElement('canvas');
      rotatedCanvas.width = img.height;
      rotatedCanvas.height = img.width;
      const ctx = rotatedCanvas.getContext('2d');
      
      if (ctx) {
        ctx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
        ctx.rotate((90 * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
      }

      let imgData;
      try {
        imgData = rotatedCanvas.toDataURL('image/png', 1.0);
      } catch (dataUrlErr: any) {
        throw new Error('خطا در تولید دیتای عکس چرخانده شده: ' + dataUrlErr.message);
      }

      if (i > 0) {
        pdf.addPage([48, 80], 'portrait');
      }

      try {
        pdf.addImage(imgData, 'PNG', 0, 0, 48, 80);
      } catch (pdfErr: any) {
        throw new Error('خطا در افزودن عکس به PDF: ' + pdfErr.message);
      }
    }

    let pdfBlobUrl;
    try {
      const blob = pdf.output('blob');
      pdfBlobUrl = URL.createObjectURL(blob);
    } catch (outErr: any) {
      throw new Error('خطا در تولید فایل خروجی (pdf.output): ' + outErr.message);
    }

    const printWindow = window.open(pdfBlobUrl, '_blank');
    
    if (!printWindow) {
      alert('پاپ‌آپ مسدود شده است. لطفاً پاپ‌آپ‌ها را برای این سایت مجاز کنید تا PDF چاپ باز شود.');
    }
  } catch (err) {
    throw err; // Re-throw to be caught by the component
  }
};
