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

export const addPdfFooter = (doc: jsPDF, finalY: number, station?: string, poBox?: string) => {
  // Add page if near bottom
  if (finalY > 255) {
    doc.addPage();
    finalY = 20;
  }
  
  doc.setFillColor(245, 245, 245);
  doc.lines([[140, 0], [-10, 20], [-130, 0], [0, -20]], 14, finalY, [1, 1], 'F', true);
  doc.rect(14, finalY, 182, 22, 'F');
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 50);
  const disclaimer = "This statement is assumed correct and accurate unless notice of disagreement accompanied by reconciliation.";
  
  // @ts-ignore
  const disclaimerLines = doc.splitTextToSize(disclaimer, 175);
  doc.text(disclaimerLines, 18, finalY + 7);

  // Station and PO Box info
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  
  const displayStation = station ? station : "Loruk Energy Limited";
  const displayPoBox = poBox ? poBox : "P.O BOX 342";
  
  doc.text(`${displayStation} | ${displayPoBox}`, 18, finalY + 15);
};
