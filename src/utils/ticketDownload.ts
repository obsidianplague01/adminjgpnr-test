// src/utils/ticketDownload.ts
import jsPDF from 'jspdf';

export interface TicketDownloadData {
  ticketCode: string;
  orderNumber: string;
  customerName: string;
  email: string;
  phone: string;
  gameSession: string;
  quantity: number;
  amount: string;
  purchaseDate: string;
  validUntil: string;
  qrCodeDataURL: string;
}

export const generateTicketPDF = (data: TicketDownloadData): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Set colors
  const primaryColor = '#465FFF';
  const textColor = '#1D2939';
  const grayColor = '#667085';

  // Header - Brand
  doc.setFillColor(70, 95, 255);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('JGPNR PAINTBALL', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Your Adventure Ticket', 105, 30, { align: 'center' });

  // Ticket Information
  doc.setTextColor(textColor);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('TICKET DETAILS', 20, 55);

  // Ticket Code - Prominent
  doc.setFillColor(242, 247, 255);
  doc.rect(20, 60, 170, 15, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Ticket Code:', 25, 69);
  doc.setTextColor(primaryColor);
  doc.setFontSize(16);
  doc.text(data.ticketCode, 90, 69);

  // Customer Details
  doc.setTextColor(textColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  let yPos = 85;
  const lineHeight = 8;

  const details = [
    { label: 'Order Number:', value: data.orderNumber },
    { label: 'Customer Name:', value: data.customerName },
    { label: 'Email:', value: data.email },
    { label: 'Phone:', value: data.phone },
    { label: 'Game Session:', value: data.gameSession },
    { label: 'Quantity:', value: `${data.quantity} ticket(s)` },
    { label: 'Amount Paid:', value: data.amount },
    { label: 'Purchase Date:', value: data.purchaseDate },
    { label: 'Valid Until:', value: data.validUntil },
  ];

  details.forEach((detail) => {
    doc.setFont('helvetica', 'bold');
    doc.text(detail.label, 25, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(detail.value, 90, yPos);
    yPos += lineHeight;
  });

  // QR Code
  yPos += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('SCAN TO VERIFY', 105, yPos, { align: 'center' });
  
  yPos += 5;
  if (data.qrCodeDataURL) {
    doc.addImage(data.qrCodeDataURL, 'PNG', 70, yPos, 70, 70);
  }

  // Instructions
  yPos += 75;
  doc.setFillColor(255, 250, 235);
  doc.rect(20, yPos, 170, 30, 'F');
  
  doc.setTextColor(grayColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  yPos += 7;
  doc.text('INSTRUCTIONS:', 25, yPos);
  yPos += 5;
  doc.text('1. Present this ticket at the venue entrance', 25, yPos);
  yPos += 5;
  doc.text('2. Staff will scan the QR code for verification', 25, yPos);
  yPos += 5;
  doc.text('3. Arrive 15 minutes before your session starts', 25, yPos);

  // Footer
  yPos = 280;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, yPos, 190, yPos);
  
  yPos += 5;
  doc.setTextColor(grayColor);
  doc.setFontSize(8);
  doc.text('JGPNR Paintball | www.jgpnr.ng | support@jgpnr.ng', 105, yPos, { align: 'center' });

  // Save PDF
  doc.save(`JGPNR-Ticket-${data.ticketCode}.pdf`);
};

export const downloadTicket = (data: TicketDownloadData): void => {
  try {
    generateTicketPDF(data);
  } catch (error) {
    console.error('Error generating ticket PDF:', error);
    alert('Failed to download ticket. Please try again.');
  }
};