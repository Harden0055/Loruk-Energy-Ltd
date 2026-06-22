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

export const addPdfStamp = (doc: jsPDF, cx: number, cy: number, date: Date) => {
  const originalDrawColor = doc.getDrawColor();
  const originalTextColor = doc.getTextColor();
  const originalLineWidth = doc.getLineWidth();

  // Stamp Color: Blue
  doc.setDrawColor(20, 50, 150);
  doc.setTextColor(20, 50, 150);
  
  // Ellipses for oval shape
  doc.setLineWidth(0.6);
  doc.ellipse(cx, cy, 30, 20);
  doc.setLineWidth(0.3);
  doc.ellipse(cx, cy, 22, 13);
  doc.ellipse(cx, cy, 29.3, 19.3); // slight double border for outer

  const drawCurvedText = (text: string, rx: number, ry: number, startAngle: number, endAngle: number, isBottom: boolean) => {
    const chars = text.split("");
    const angleStep = (endAngle - startAngle) / (chars.length - 1);
    for (let i = 0; i < chars.length; i++) {
      const angle = startAngle + i * angleStep;
      const rad = (angle * Math.PI) / 180;
      const x = cx + rx * Math.cos(rad);
      const y = cy + ry * Math.sin(rad);
      
      const dx = -rx * Math.sin(rad);
      const dy = ry * Math.cos(rad);
      const tangentAngle = Math.atan2(dy, dx) * (180 / Math.PI);
      
      let textRot = -tangentAngle;
      if (isBottom) textRot = -(tangentAngle + 180);
      
      doc.text(chars[i], x, y, {
        angle: textRot,
        align: "center",
        baseline: "middle"
      });
    }
  };

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  drawCurvedText("LORUK ENERGY", 26, 16.5, 210, 330, false);
  
  doc.setFontSize(8);
  drawCurvedText("P.O Box 342-30600.", 26, 16.5, 145, 35, true); 
  
  // Stars
  doc.setFontSize(12);
  doc.text("*", cx - 25, cy, { align: "center", baseline: "middle" });
  doc.text("*", cx + 25, cy, { align: "center", baseline: "middle" });

  // Inside content
  // Date (red color)
  doc.setTextColor(200, 30, 30);
  doc.setFontSize(10);
  const dateStr = format(date, 'dd MMM yyyy').toUpperCase();
  doc.text(dateStr, cx, cy - 3, { align: "center" });

  // Signature (just a blue cursive/scribble)
  doc.setDrawColor(20, 50, 150);
  doc.setLineWidth(0.4);
  // draw a small scribble across
  doc.lines([[0, 0], [4, -4], [3, 2], [5, -2], [4, 4], [6, -3], [2, 1]], cx - 12, cy + 3, [1, 1]);

  // Tel
  doc.setTextColor(20, 50, 150);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Tel: +254726 962 226", cx, cy + 9, { align: "center" });

  // Restore colors
  doc.setDrawColor(originalDrawColor);
  doc.setTextColor(originalTextColor);
  doc.setLineWidth(originalLineWidth);
};

export const addPdfFooter = (doc: jsPDF, finalY: number, station?: string, poBox?: string) => {
  // We need enough space for Stamp (45) + Footer (22) = ~67
  if (finalY > 225) {
    doc.addPage();
    finalY = 20;
  }
  
  // Draw Stamp
  const stampCx = 150; // shift to right side
  const stampCy = finalY + 25;
  addPdfStamp(doc, stampCx, stampCy, new Date());
  
  finalY = stampCy + 28; // set finalY for the footer banner below the stamp
  
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
