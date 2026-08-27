import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { KathmanduBilling } from '../types';
import { COMPANY_DETAILS, LOGO_URL } from '../assets/logo';

export function generateKathmanduShippingManifestPDF(
  billings: KathmanduBilling[],
  batchTitle: string = 'Kathmandu Cargo Shipping & Dispatch Manifest'
): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 273mm

  let yPos = margin;

  // Header Logo & Branding
  try {
    doc.addImage(LOGO_URL, 'JPEG', margin, yPos, 14, 14);
  } catch (e) {
    // fallback
  }

  const textX = margin + 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('THE COURIER STATION POKHARA', textX, yPos + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.text('Cargo Manifest & Kathmandu Airport Forwarding Dispatch Sheet', textX, yPos + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Hub: B & D Bhawan, New Road, Pokhara • Tel: +977 61-578900 / 9856012345 • Route: Pokhara -> TIA Kathmandu', textX, yPos + 12);

  // Right Side Header Meta
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 138);
  doc.text('CARGO SHIPPING LIST', pageWidth - margin, yPos + 4, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, pageWidth - margin, yPos + 8.5, { align: 'right' });
  doc.text(`Consignments: ${billings.length} Shipments`, pageWidth - margin, yPos + 12.5, { align: 'right' });

  yPos += 17;

  // Horizontal Rule
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.6);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;

  // Summary Metrics Banner
  const totalGrossWeight = billings.reduce((sum, b) => sum + (Number(b.weight) || 0), 0);
  const totalBoxes = billings.reduce((sum, b) => sum + (Number(b.box_count) || 1), 0);

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, yPos, contentWidth, 8, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  doc.text(`TOTAL CONSIGNMENTS: ${billings.length}`, margin + 5, yPos + 5.2);
  doc.text(`GROSS CARGO WEIGHT: ${totalGrossWeight.toFixed(1)} KG`, margin + 65, yPos + 5.2);
  doc.text(`TOTAL PACKAGES / BOXES: ${totalBoxes} PCS`, margin + 140, yPos + 5.2);
  doc.text(`ROUTE: POKHARA HUB -> TIA AIR CARGO TERMINAL (KTM)`, margin + 205, yPos + 5.2);

  yPos += 11;

  // Table with complete Sender and Receiver details
  const tableData = billings.map((bill, idx) => {
    const senderDetails = [
      bill.sender_name || 'Sender',
      bill.sender_phone ? `Tel: ${bill.sender_phone}` : '',
      bill.sender_address ? `Addr: ${bill.sender_address}` : 'Pokhara, Nepal',
    ]
      .filter(Boolean)
      .join('\n');

    const receiverDetails = [
      bill.receiver_name || 'Consignee',
      bill.receiver_phone ? `Tel: ${bill.receiver_phone}` : '',
      bill.receiver_address ? `Addr: ${bill.receiver_address}` : '',
      `Dest: ${bill.country || 'International'} (${bill.transport_type || 'AIR'})`,
    ]
      .filter(Boolean)
      .join('\n');

    const itemsSummary = (bill.items || [])
      .map((it) => `${it.quantity || 1}x ${it.item_name || 'Goods'}${it.item_type !== 'Normal' ? ` [${it.item_type}]` : ''}`)
      .join(', ');

    const transporterInfo = [
      bill.vehicle_no || 'Pokhara Transport',
      bill.driver_phone ? `Driver: ${bill.driver_phone}` : '',
      bill.forwarder_name ? `Hub: ${bill.forwarder_name}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    return [
      (idx + 1).toString(),
      `${bill.ktm_invoice_no}${bill.customer_invoice_no ? `\n(Ref: ${bill.customer_invoice_no})` : ''}`,
      bill.awb_no || 'Pending AWB',
      senderDetails,
      receiverDetails,
      `${bill.weight} kg\n(${bill.box_count} Box)`,
      itemsSummary || 'General Cargo Goods',
      transporterInfo,
      bill.shipping_status || 'Pending Dispatch',
    ];
  });

  autoTable(doc, {
    startY: yPos,
    margin: { left: margin, right: margin },
    head: [
      [
        '#',
        'KTM Bill #\n(Cust Ref)',
        'AWB / Track #',
        'Sender Full Details\n(Name, Phone, Address)',
        'Receiver / Consignee Details\n(Name, Phone, Full Address, Country)',
        'Weight\n& Boxes',
        'Cargo Manifest Items\n& Item Types',
        'Transporter\n& Hub',
        'Shipping\nStatus',
      ],
    ],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
      valign: 'top',
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 26, fontStyle: 'bold' },
      2: { cellWidth: 24, fontStyle: 'bold', halign: 'center' },
      3: { cellWidth: 50 },
      4: { cellWidth: 55 },
      5: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: 42 },
      7: { cellWidth: 28 },
      8: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
    },
    didDrawPage: (data) => {
      // Footer page numbering
      const str = `Page ${doc.getNumberOfPages()} - The Courier Station Pokhara | Kathmandu Cargo Dispatch Manifest`;
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(str, margin, doc.internal.pageSize.getHeight() - 6);
    },
  });

  const lastTable = (doc as any).lastAutoTable;
  let finalY = lastTable ? lastTable.finalY + 8 : yPos + 60;

  if (finalY > doc.internal.pageSize.getHeight() - 28) {
    doc.addPage();
    finalY = 20;
  }

  // Signatures section
  const boxWidth = 60;
  const boxHeight = 20;

  // Box 1: Pokhara Dispatcher
  doc.setDrawColor(148, 163, 184);
  doc.rect(margin, finalY, boxWidth, boxHeight);
  doc.line(margin + 4, finalY + 14, margin + boxWidth - 4, finalY + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text('Dispatched By (Pokhara Station Desk)', margin + boxWidth / 2, finalY + 18, { align: 'center' });

  // Box 2: Driver / Courier Carrier
  const box2X = margin + boxWidth + 15;
  doc.rect(box2X, finalY, boxWidth, boxHeight);
  doc.line(box2X + 4, finalY + 14, box2X + boxWidth - 4, finalY + 14);
  doc.text('Cargo Transporter / Vehicle Driver', box2X + boxWidth / 2, finalY + 18, { align: 'center' });

  // Box 3: Kathmandu Cargo Hub
  const box3X = pageWidth - margin - boxWidth;
  doc.rect(box3X, finalY, boxWidth, boxHeight);
  doc.line(box3X + 4, finalY + 14, box3X + boxWidth - 4, finalY + 14);
  doc.text('Received & Checked (Kathmandu Airport Hub)', box3X + boxWidth / 2, finalY + 18, { align: 'center' });

  return doc;
}

export function downloadKathmanduShippingManifestPDF(
  billings: KathmanduBilling[],
  title?: string
): void {
  const doc = generateKathmanduShippingManifestPDF(billings, title);
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `Kathmandu_Shipping_Manifest_${dateStr}.pdf`;
  doc.save(filename);
}

/**
 * Dedicated Customer-Facing Shipping List (PDF)
 * Formatted cleanly with complete Sender, Receiver, Items, and Tracking status,
 * perfect for sharing with clients and customers.
 */
export function generateCustomerShippingListPDF(
  billings: KathmanduBilling[],
  batchTitle: string = 'Customer Shipping List & Consignment Dispatch Note'
): jsPDF {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
  const margin = 12;
  const contentWidth = pageWidth - margin * 2; // 273mm

  let yPos = margin;

  // Header Logo & Branding
  try {
    doc.addImage(LOGO_URL, 'JPEG', margin, yPos, 14, 14);
  } catch (e) {
    // fallback
  }

  const textX = margin + 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('THE COURIER STATION POKHARA', textX, yPos + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.text('International Express & Air Cargo Services • Customer Shipping Manifest', textX, yPos + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Pokhara Station: B & D Bhawan, New Road • Customer Support: +977 61-578900 / 9856012345', textX, yPos + 12);

  // Right Side Header Meta
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129);
  doc.text('CUSTOMER SHIPPING LIST', pageWidth - margin, yPos + 4, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, pageWidth - margin, yPos + 8.5, { align: 'right' });
  doc.text(`Total Shipments: ${billings.length}`, pageWidth - margin, yPos + 12.5, { align: 'right' });

  yPos += 17;

  // Horizontal Rule
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.8);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;

  // Summary Metrics Banner
  const totalGrossWeight = billings.reduce((sum, b) => sum + (Number(b.weight) || 0), 0);
  const totalBoxes = billings.reduce((sum, b) => sum + (Number(b.box_count) || 1), 0);

  doc.setFillColor(240, 253, 244);
  doc.roundedRect(margin, yPos, contentWidth, 8, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(6, 95, 70);

  doc.text(`TOTAL CONSIGNMENTS: ${billings.length}`, margin + 5, yPos + 5.2);
  doc.text(`TOTAL GROSS WEIGHT: ${totalGrossWeight.toFixed(1)} KG`, margin + 70, yPos + 5.2);
  doc.text(`TOTAL PACKAGES / BOXES: ${totalBoxes} PCS`, margin + 145, yPos + 5.2);
  doc.text(`TRANSIT ROUTE: POKHARA -> KATHMANDU (TIA) -> GLOBAL DESTINATION`, margin + 195, yPos + 5.2);

  yPos += 11;

  // Table with complete Sender and Receiver details
  const tableData = billings.map((bill, idx) => {
    const senderDetails = [
      bill.sender_name || 'Sender',
      bill.sender_phone ? `Phone: ${bill.sender_phone}` : '',
      bill.sender_address ? `Addr: ${bill.sender_address}` : 'Pokhara, Nepal',
    ]
      .filter(Boolean)
      .join('\n');

    const receiverDetails = [
      bill.receiver_name || 'Receiver / Consignee',
      bill.receiver_phone ? `Phone: ${bill.receiver_phone}` : '',
      bill.receiver_address ? `Addr: ${bill.receiver_address}` : '',
      `Destination: ${bill.country || 'International'} (${bill.transport_type || 'AIR'})`,
    ]
      .filter(Boolean)
      .join('\n');

    const itemsSummary = (bill.items || [])
      .map((it) => `${it.quantity || 1}x ${it.item_name || 'Goods'}${it.item_type !== 'Normal' ? ` (${it.item_type})` : ''}`)
      .join(', ');

    return [
      (idx + 1).toString(),
      bill.awb_no ? `${bill.awb_no}\n(Ref: ${bill.customer_invoice_no || bill.ktm_invoice_no})` : `${bill.customer_invoice_no || bill.ktm_invoice_no}`,
      senderDetails,
      receiverDetails,
      `${bill.weight} kg\n(${bill.box_count} Box)`,
      itemsSummary || 'General Cargo Goods',
      bill.dispatch_date ? `Dispatched: ${bill.dispatch_date}` : 'Pokhara Hub',
      bill.shipping_status || 'In Transit to KTM',
    ];
  });

  autoTable(doc, {
    startY: yPos,
    margin: { left: margin, right: margin },
    head: [
      [
        '#',
        'AWB / Track #\n(Invoice Ref)',
        'Sender Full Details\n(Name, Phone, Address)',
        'Consignee / Receiver Details\n(Name, Phone, Address, Country)',
        'Weight\n& Boxes',
        'Package Contents\n& Item Types',
        'Dispatch Date\n& Station',
        'Current Shipping\nStatus',
      ],
    ],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [6, 78, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      valign: 'top',
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 30, fontStyle: 'bold' },
      2: { cellWidth: 55 },
      3: { cellWidth: 62 },
      4: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      5: { cellWidth: 48 },
      6: { cellWidth: 25, halign: 'center' },
      7: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
    },
    didDrawPage: (data) => {
      const str = `Page ${doc.getNumberOfPages()} - Customer Shipping List | The Courier Station Pokhara • Helpline: +977 61-578900`;
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(str, margin, doc.internal.pageSize.getHeight() - 6);
    },
  });

  return doc;
}

export function downloadCustomerShippingListPDF(
  billings: KathmanduBilling[],
  title?: string
): void {
  const doc = generateCustomerShippingListPDF(billings, title);
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `Customer_Shipping_List_${dateStr}.pdf`;
  doc.save(filename);
}

/**
 * Individual Single Consignment Customer Shipping Note / Dispatch Slip (PDF)
 */
export function generateSingleConsignmentShippingSlipPDF(
  bill: KathmanduBilling
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  let yPos = margin;

  // Header Logo & Branding
  try {
    doc.addImage(LOGO_URL, 'JPEG', margin, yPos, 14, 14);
  } catch (e) {
    // fallback
  }

  const textX = margin + 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('THE COURIER STATION POKHARA', textX, yPos + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.text('Customer Consignment Shipping Slip & Dispatch Confirmation', textX, yPos + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('B & D Bhawan, New Road, Pokhara • Contact: +977 61-578900 / 9856012345', textX, yPos + 12);

  // Right Header Info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(16, 185, 129);
  doc.text('SHIPPING DISPATCH SLIP', pageWidth - margin, yPos + 4, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Ref: ${bill.customer_invoice_no || bill.ktm_invoice_no}`, pageWidth - margin, yPos + 8.5, { align: 'right' });
  doc.text(`Date: ${bill.dispatch_date || bill.ktm_date || new Date().toISOString().split('T')[0]}`, pageWidth - margin, yPos + 12.5, { align: 'right' });

  yPos += 18;

  // Horizontal Rule
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.8);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5;

  // Tracking & Status Ribbon
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(margin, yPos, contentWidth, 12, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(6, 95, 70);
  doc.text(`AWB / TRACKING NO: ${bill.awb_no || 'Assigned at KTM Dispatch Hub'}`, margin + 4, yPos + 5);
  doc.setFontSize(8);
  doc.text(`CURRENT STATUS: ${(bill.shipping_status || 'In Transit to KTM Hub').toUpperCase()}`, margin + 4, yPos + 9.5);
  doc.text(`DESTINATION: ${bill.country.toUpperCase()} (${bill.transport_type || 'AIR'})`, pageWidth - margin - 4, yPos + 5, { align: 'right' });
  doc.text(`TOTAL WEIGHT: ${bill.weight} KG (${bill.box_count} BOX)`, pageWidth - margin - 4, yPos + 9.5, { align: 'right' });

  yPos += 16;

  // Sender & Receiver 2-Column Boxes
  const halfCol = (contentWidth - 6) / 2;

  // Sender Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, yPos, halfCol, 32, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('SENDER / SHIPPER DETAILS', margin + 3, yPos + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Name: ${bill.sender_name}`, margin + 3, yPos + 10);
  doc.text(`Phone: ${bill.sender_phone || '-'}`, margin + 3, yPos + 15);
  doc.text(`Address: ${bill.sender_address || 'Pokhara, Nepal'}`, margin + 3, yPos + 20, { maxWidth: halfCol - 6 });

  // Receiver Box
  const col2X = margin + halfCol + 6;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(col2X, yPos, halfCol, 32, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('RECEIVER / CONSIGNEE DETAILS', col2X + 3, yPos + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Name: ${bill.receiver_name}`, col2X + 3, yPos + 10);
  doc.text(`Phone: ${bill.receiver_phone || '-'}`, col2X + 3, yPos + 15);
  doc.text(`Country: ${bill.country} (${bill.transport_type || 'AIR'})`, col2X + 3, yPos + 20);
  doc.text(`Address: ${bill.receiver_address || '-'}`, col2X + 3, yPos + 25, { maxWidth: halfCol - 6 });

  yPos += 36;

  // Cargo Items Manifest Table
  const items = bill.items || [];
  autoTable(doc, {
    startY: yPos,
    margin: { left: margin, right: margin },
    head: [['#', 'Item Description', 'Category', 'Quantity', 'Weight (kg)', 'Box #']],
    body: items.map((it, idx) => [
      (idx + 1).toString(),
      it.item_name,
      it.item_type || 'Normal',
      (it.quantity || 1).toString(),
      it.weight_kg !== undefined ? `${it.weight_kg} kg` : '-',
      `Box ${it.box_number || 1}`,
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
    },
  });

  const lastTable = (doc as any).lastAutoTable;
  yPos = lastTable ? lastTable.finalY + 8 : yPos + 40;

  // Dispatch & Forwarding Details Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, yPos, contentWidth, 22, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('CARGO DISPATCH & AIRPORT FORWARDING ROUTE', margin + 3, yPos + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`• Origin Hub: The Courier Station, New Road, Pokhara`, margin + 3, yPos + 9.5);
  doc.text(`• Airport Cargo Hub: ${bill.forwarder_name || 'Tribhuvan International Airport (TIA) Cargo Terminal, Kathmandu'}`, margin + 3, yPos + 13.5);
  doc.text(`• Transport Vehicle: ${bill.vehicle_no || 'Pokhara-KTM Cargo Van'} ${bill.driver_phone ? `(Driver: ${bill.driver_phone})` : ''}`, margin + 3, yPos + 17.5);

  yPos += 28;

  // Footer Note
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Note: This document confirms your shipment has been booked and dispatched for international cargo forwarding. For tracking queries, contact +977 61-578900.',
    margin,
    yPos
  );

  return doc;
}

export function downloadSingleConsignmentShippingSlipPDF(
  bill: KathmanduBilling
): void {
  const doc = generateSingleConsignmentShippingSlipPDF(bill);
  const ref = bill.awb_no || bill.customer_invoice_no || bill.ktm_invoice_no || 'Shipment';
  doc.save(`Shipping_Slip_${ref}.pdf`);
}
