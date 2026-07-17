import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export const generateRotatedPdfBase64 = async (elements: HTMLElement[]): Promise<string> => {
  const PAGE_WIDTH = 58;
  const PAGE_HEIGHT = 78;
  
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [PAGE_WIDTH, PAGE_HEIGHT]
  });

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    
    // Scale 4 for crisp barcodes
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 4,
      useCORS: true
    });

    const rotatedCanvas = document.createElement('canvas');
    rotatedCanvas.width = canvas.height;
    rotatedCanvas.height = canvas.width;
    const ctx = rotatedCanvas.getContext('2d');
    
    if (ctx) {
      ctx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
      ctx.rotate(90 * Math.PI / 180);
      ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
      
      const imgData = rotatedCanvas.toDataURL('image/png', 1.0);
      
      if (i > 0) {
        pdf.addPage();
      }
      
      // Calculate aspect ratio
      const imgAspect = rotatedCanvas.width / rotatedCanvas.height;
      const pageAspect = PAGE_WIDTH / PAGE_HEIGHT;
      
      let renderWidth = PAGE_WIDTH;
      let renderHeight = PAGE_HEIGHT;
      let x = 0;
      let y = 0;
      
      if (imgAspect > pageAspect) {
        // Image is wider than page (relatively)
        renderWidth = PAGE_WIDTH;
        renderHeight = renderWidth / imgAspect;
        y = (PAGE_HEIGHT - renderHeight) / 2;
      } else {
        // Image is taller than page
        renderHeight = PAGE_HEIGHT;
        renderWidth = renderHeight * imgAspect;
        x = (PAGE_WIDTH - renderWidth) / 2;
      }
      
      pdf.addImage(imgData, 'PNG', x, y, renderWidth, renderHeight);
    }
  }

  return pdf.output('datauristring').split(',')[1];
};
