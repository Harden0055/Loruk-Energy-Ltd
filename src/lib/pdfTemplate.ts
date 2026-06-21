import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { getLogoDataUrl } from './logo';

interface PdfHeaderOptions {
  doc: jsPDF;
  title: string;
  leftBoxLines: string[];
  rightBoxLines: { label: string; value: string }[];
}

export const setupPdfHeader = async ({ doc, title, leftBoxLines, rightBoxLines }: PdfHeaderOptions): Promise<number> => {
  // 1. Title Block (Grey Slanted Banner) - modified slightly for responsiveness
  doc.setFillColor(230, 230, 235);
  doc.lines([[116, 0], [-10, 20], [-106, 0], [0, -20]], 14, 10, [1, 1], 'F', true);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(title.toUpperCase(), 24, 23);

  // 2. Logo
  try {
    const logoData = await getLogoDataUrl();
    doc.addImage(logoData, 'PNG', 150, 5, 40, 40); 
  } catch (err) {
    console.warn('Failed to load logo:', err);
  }

  // 3. Info Boxes - Moved down to start at Y=50 so Logo (ending at Y=45) is clear
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);
  
  const boxY = 50;
  const boxHeight = 45;
  
  // Left Box
  doc.roundedRect(14, boxY, 90, boxHeight, 3, 3);
  let leftLineY = boxY + 8;
  
  leftBoxLines.forEach((line, index) => {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(line, 18, leftLineY);
    leftLineY += 7;
  });

  // Right Box
  doc.roundedRect(110, boxY, 86, boxHeight, 3, 3);
  let rightLineY = boxY + 10;
  
  rightBoxLines.forEach(line => {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(line.label, 114, rightLineY);
    doc.text(line.value, 145, rightLineY);
    rightLineY += 8;
  });

  // Returns the Y position after the boxes
  return boxY + boxHeight + 8;
};

export const addPdfFooter = (doc: jsPDF, finalY: number) => {
  // Add page if near bottom
  if (finalY > 240) {
    doc.addPage();
    finalY = 20;
  }
  
  doc.setFillColor(245, 245, 245);
  doc.lines([[140, 0], [-10, 20], [-130, 0], [0, -20]], 14, finalY, [1, 1], 'F', true);
  doc.rect(14, finalY, 182, 35, 'F');
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);
  const disclaimer = "This statement is assumed correct and accurate unless notice of disagreement accompanied by reconciliation is received within 14 days from the date of this letter. All invoices are payable within the agreed payment terms. Overdue Invoices shall attract a late payment charge at the rate of Five (5) percentage points above the current Commercial Banks' lending Rate. Such interest shall run from the day immediately after the invoice due date until the date payment is received by the Seller's bank and is applicable to all overdue balances. Payment will be credited first to late payment charges and next to the unpaid invoice amount. Customers are responsible for all collection and legal fees necessitated by such lateness or default in payment.";
  
  // @ts-ignore
  const disclaimerLines = doc.splitTextToSize(disclaimer, 175);
  doc.text(disclaimerLines, 18, finalY + 6);

  const footerY = finalY + 45;
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text("LORUK ENERGY LIMITED, P.O. BOX 342, BUNGOMA | WWW.LORUKENERGY.COM", 105, footerY, { align: "center" });
};
