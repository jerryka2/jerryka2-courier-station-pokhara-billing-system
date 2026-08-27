import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, PDFVersion, KathmanduBilling } from '../types';
import { formatCurrency, getInvoicePurchaseBreakdown, isAustraliaCountry, isUSACanadaCountry } from './rateCalculator';
import { LOGO_URL, COMPANY_DETAILS } from '../assets/logo';

export function generateInvoicePDF(invoice: Invoice, version: PDFVersion): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 15;
  const contentWidth = pageWidth - margin * 2; // 180mm

  // Professional Executive Colors
  const primaryColor = '#0f172a'; // Slate 900
  const brandBlue = '#1e3a8a'; // Blue 900
  const secondaryColor = '#475569'; // Slate 600
  const subtleBorder = '#cbd5e1'; // Slate 300

  // Header Details (Respects invoice-specific Shipper or default Station)
  const shipperName = invoice.shipper_name || COMPANY_DETAILS.name;
  const shipperTagline = invoice.shipper_name ? 'Authorized Carrier Forwarder & Freight Desk' : COMPANY_DETAILS.tagline;
  const shipperAddress = invoice.shipper_address || COMPANY_DETAILS.address;
  const shipperPhone = invoice.shipper_phone || COMPANY_DETAILS.phone;
  const companyEmail = invoice.shipper_email || COMPANY_DETAILS.email;
  const portOfLoading = invoice.port_of_loading || COMPANY_DETAILS.portOfLoading;

  // Standard Company Header Block
  let yPos = margin;

  // Add Logo Image if available
  try {
    doc.addImage(LOGO_URL, 'JPEG', margin, yPos, 16, 16);
  } catch (e) {
    // Fallback gracefully
  }

  const textX = margin + 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryColor);
  doc.text(shipperName.toUpperCase(), textX, yPos + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(brandBlue);
  doc.text(shipperTagline, textX, yPos + 8.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(secondaryColor);
  doc.text(`Address: ${shipperAddress}`, textX, yPos + 12.5);
  doc.text(`Tel: ${shipperPhone} | Email: ${companyEmail}`, textX, yPos + 16);
  doc.text(`Port of Loading: ${portOfLoading}`, textX, yPos + 19.5);

  // Document Title Badge
  let titleText = '';
  if (version === 'billing_v1') titleText = 'INTERNAL BILLING INVOICE (FULL)';
  else if (version === 'billing_v2') titleText = 'INTERNAL BILLING INVOICE (SIMPLE)';
  else if (version === 'customer') titleText = 'OFFICIAL COMMERCIAL INVOICE';
  else if (version === 'item_list') titleText = 'SHIPMENT PACKING MANIFEST';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(brandBlue);
  doc.text(titleText, pageWidth - margin, yPos + 4.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(primaryColor);
  doc.text(`Invoice No: ${invoice.invoice_no}`, pageWidth - margin, yPos + 9, { align: 'right' });
  doc.text(`Issue Date: ${invoice.invoice_date}`, pageWidth - margin, yPos + 13, { align: 'right' });
  if (invoice.awb_no) {
    doc.text(`AWB / Tracking: ${invoice.awb_no}`, pageWidth - margin, yPos + 17, { align: 'right' });
  }

  yPos += 22;

  // Horizontal divider line
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.8);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5;

  if (version === 'customer') {
    // CUSTOMER INVOICE - Metric Ribbon Box
    doc.setFillColor(15, 23, 42); // Dark slate
    doc.roundedRect(margin, yPos, contentWidth, 11, 1, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);

    const colW = contentWidth / 4;
    doc.text(`DESTINATION: ${invoice.country.toUpperCase()}`, margin + 5, yPos + 7);
    doc.text(`CHARGEABLE WT: ${invoice.weight} KG`, margin + colW + 3, yPos + 7);
    doc.text(`TOTAL BOXES: ${invoice.box_count} BOX(ES)`, margin + colW * 2 + 3, yPos + 7);
    doc.text(`MODE: ${(invoice.transport_type || 'AIR').toUpperCase()}`, margin + colW * 3 + 3, yPos + 7);

    yPos += 14;

    // Sender & Receiver Details Table (Includes Sender Email & Consignee Email)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(primaryColor);
    doc.text('SHIPMENT & CONSIGNEE DETAILS', margin, yPos);
    yPos += 2.5;

    autoTable(doc, {
      startY: yPos,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 32, fillColor: [248, 250, 252] },
        1: { cellWidth: 58 },
        2: { fontStyle: 'bold', cellWidth: 32, fillColor: [248, 250, 252] },
        3: { cellWidth: 58 },
      },
      body: [
        ['Sender Name:', invoice.sender_name, 'Receiver Name:', invoice.receiver_name],
        ['Sender Mobile:', invoice.sender_phone || '-', 'Receiver Phone:', invoice.receiver_phone || invoice.phone || '-'],
        ['Sender Address:', invoice.sender_address || 'Kathmandu, Nepal', 'Receiver Address:', invoice.receiver_address || invoice.country],
        ['Sender Email:', invoice.sender_email || 'N/A', 'Consignee Email:', invoice.receiver_email || 'N/A'],
        ['Shipper Entity:', invoice.shipper_name || 'The Courier Station Sadobato', 'Destination Country:', invoice.country],
        ['Total Weight:', `${invoice.weight} kg (${invoice.box_count} Box)`, 'Port of Departure:', (invoice.departure && invoice.departure !== invoice.country) ? invoice.departure : 'Kathmandu (KTM)'],
      ],
    });

    let custTableInfo = (doc as any).lastAutoTable;
    yPos = custTableInfo ? custTableInfo.finalY + 6 : yPos + 30;

    // Amount Section Block (Side-by-side: Left = Bank & Thank you, Right = Billing Summary)
    const customDuty = invoice.custom_duty_amount ?? (
      isUSACanadaCountry(invoice.country) ? 750 * (invoice.box_count || 1) :
      isAustraliaCountry(invoice.country) ? 500 * (invoice.box_count || 1) :
      500 * (invoice.box_count || 1)
    );
    const discountAmount = invoice.discount_amount ?? 0;
    const ratePerKg = invoice.rate_per_kg ?? (invoice.weight ? invoice.sale_amount / invoice.weight : 0);
    const finalAmount = Math.max(0, invoice.sale_amount + customDuty - discountAmount);

    const meatExtra = invoice.meat_extra_charge || 0;
    const baseFreight = Math.max(0, invoice.sale_amount - meatExtra);

    const startYSection = yPos;

    // Left Side: Operational note & Payment Options
    const leftWidth = 92;
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.setDrawColor(203, 213, 225); // Slate 300
    doc.roundedRect(margin, startYSection, leftWidth, 18, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text('Thank You for Shipping with Us', margin + 4, startYSection + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('We handle every parcel with absolute priority & care.', margin + 4, startYSection + 9.5);
    doc.text(`Official Email: ${companyEmail} | Phone: ${shipperPhone}`, margin + 4, startYSection + 13.5);

    // Payment Settlement Sub-Box (Left)
    const bankY = startYSection + 21;
    doc.setFillColor(241, 245, 249); // Slate 100
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, bankY, leftWidth, 16, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text('PAYMENT SETTLEMENT', margin + 4, bankY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Method: ${invoice.payment_method || 'Cash'} | Status: ${(invoice.payment_status || 'Paid').toUpperCase()}`, margin + 4, bankY + 9.5);
    if (invoice.online_transaction_id) {
      doc.text(`Txn Ref: ${invoice.online_transaction_id}`, margin + 4, bankY + 13.5);
    } else {
      doc.text(`Counter Payment Reference: Verified at ${shipperName}`, margin + 4, bankY + 13.5);
    }

    // Right Side: Billing & Payable Summary Table
    const rightMarginLeft = margin + leftWidth + 5; // x = 112
    const custSummaryBody: (string[])[] = [
      ['Unit Deal Rate:', `${formatCurrency(ratePerKg)} / kg`],
      [`Main Freight (${invoice.weight} kg):`, formatCurrency(baseFreight)],
    ];

    if (meatExtra > 0) {
      custSummaryBody.push(['Meat / Sukuti Surcharge:', `+ ${formatCurrency(meatExtra)}`]);
    }

    custSummaryBody.push(['Freight Subtotal:', formatCurrency(invoice.sale_amount)]);
    custSummaryBody.push(['Custom Clearance Duty:', `+ ${formatCurrency(customDuty)}`]);

    if (discountAmount > 0) {
      custSummaryBody.push(['Applied Discount:', `- ${formatCurrency(discountAmount)}`]);
    }

    custSummaryBody.push(['TOTAL PAYABLE AMOUNT:', formatCurrency(finalAmount)]);

    autoTable(doc, {
      startY: startYSection,
      margin: { left: rightMarginLeft, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2 },
      body: custSummaryBody,
      didParseCell: (data) => {
        if (data.row.index === custSummaryBody.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [15, 23, 42]; // Slate 900
          data.cell.styles.textColor = [253, 224, 71]; // Amber text
          data.cell.styles.fontSize = 8.5;
        }
      },
    });

    const custSummaryTableInfo = (doc as any).lastAutoTable;
    const tableEndY = custSummaryTableInfo ? custSummaryTableInfo.finalY : startYSection + 45;
    yPos = Math.max(bankY + 24, tableEndY + 5);

    // Terms and Conditions Section on PDF
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text('TERMS & CONDITIONS', margin, yPos);
    yPos += 3.2;

    const termsList = [
      '1. Address correction will be billed €30 per parcel for Europe / $20 per parcel to customer.',
      '2. Lost/claim liability capped at 100 USD + courier freight refund only.',
      '3. Remote area delivery charges billed according to carrier destination zoning.',
      '4. Insurance coverage must be arranged independently prior to dispatch if required.',
      '5. Delay due to airline schedules, weather conditions, or customs hold is beyond carrier liability.',
      '6. Volumetric dimensional conversion calculated at standard (L x W x H in cm) / 5000.',
    ];

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);

    termsList.forEach((term) => {
      doc.text(term, margin, yPos);
      yPos += 3;
    });
  }

  // Common Header & Details for V1, V2, Item List
  if (version !== 'customer') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(primaryColor);
    doc.text(version === 'item_list' ? 'PACKING LIST & CONSIGNMENT SUMMARY' : 'SHIPMENT & BILLING SPECIFICATIONS', margin, yPos);
    yPos += 2.5;

    autoTable(doc, {
      startY: yPos,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 30, fillColor: [248, 250, 252] },
        1: { cellWidth: 60 },
        2: { fontStyle: 'bold', cellWidth: 30, fillColor: [248, 250, 252] },
        3: { cellWidth: 60 },
      },
      body: [
        ['Sender Name:', invoice.sender_name, 'Receiver Name:', invoice.receiver_name],
        ['Sender Mobile:', invoice.sender_phone || '-', 'Receiver Phone:', invoice.receiver_phone || invoice.phone || '-'],
        ['Sender Address:', invoice.sender_address || 'Kathmandu, Nepal', 'Receiver Address:', invoice.receiver_address || invoice.country],
        ['Sender Email:', invoice.sender_email || 'N/A', 'Consignee Email:', invoice.receiver_email || 'N/A'],
        ['Shipper Entity:', invoice.shipper_name || 'The Courier Station Sadobato', 'AWB / Tracking #:', invoice.awb_no || 'Pending Dispatch'],
        ['Chargeable Weight:', `${invoice.weight} kg`, 'Box Count:', `${invoice.box_count} Box(es)`],
        ['Transport Mode:', invoice.transport_type, 'Port of Loading:', portOfLoading],
      ],
    });

    const detailsInfo = (doc as any).lastAutoTable;
    yPos = detailsInfo ? detailsInfo.finalY + 6 : yPos + 35;

    // Item Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(primaryColor);
    doc.text(version === 'item_list' ? 'DETAILED ITEM PACKING MANIFEST' : 'SHIPMENT ITEMS', margin, yPos);
    yPos += 2.5;

    // Item rows with Box #, Description, Qty, Item Type, Weight
    const mainPdfItems = invoice.items || [];
    const itemRows = mainPdfItems.map((item, idx) => [
      `${idx + 1}`,
      `Box #${item.box_number || 1}`,
      item.item_name,
      `${item.quantity}`,
      item.item_type,
      item.weight_kg ? `${item.weight_kg} kg` : '-',
    ]);

    autoTable(doc, {
      startY: yPos,
      margin: { left: margin, right: margin },
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 2.2 },
      head: [['#', 'Box #', 'Item Name / Description', 'Qty', 'Category', 'Item Net Weight']],
      body: itemRows,
    });

    const itemsInfo = (doc as any).lastAutoTable;
    yPos = itemsInfo ? itemsInfo.finalY + 6 : yPos + 40;
  }

  // Totals Section for Billing V1 & Billing V2
  if (version === 'billing_v1' || version === 'billing_v2') {
    const saleAmt = invoice.sale_amount;
    const purchaseAmt = invoice.purchase_amount;
    const customDuty = invoice.custom_duty_amount ?? (500 * (invoice.box_count || 1));
    const discountAmount = invoice.discount_amount ?? 0;
    const ratePerKg = invoice.rate_per_kg ?? (invoice.weight ? saleAmt / invoice.weight : 0);
    const finalAmount = Math.max(0, saleAmt + customDuty - discountAmount);
    const profitAmt = invoice.profit_amount;

    if (version === 'billing_v1') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(primaryColor);
      doc.text('TOTALS & PROFIT AUDIT (INTERNAL)', margin, yPos);
      yPos += 2.5;

      const pb = getInvoicePurchaseBreakdown(invoice);
      const v1Body: (string[])[] = [
        ['Per Kg Sale Rate:', `${formatCurrency(ratePerKg)} / kg`],
        ['Freight Sale Subtotal:', formatCurrency(saleAmt)],
        ['Custom Clearance Duty:', formatCurrency(customDuty)],
      ];

      if (discountAmount > 0) {
        v1Body.push(['Discount Amount:', `- ${formatCurrency(discountAmount)}`]);
      }

      v1Body.push(
        ['Freight Purchase Cost:', formatCurrency(pb.freightPurchase)],
        ['Custom Clearance Purchase:', formatCurrency(pb.customPurchaseCost)],
        ['Total Purchase Cost:', formatCurrency(purchaseAmt)],
        ['Net Payable Amount:', formatCurrency(finalAmount)],
        ['Net Station Profit:', formatCurrency(profitAmt)]
      );

      autoTable(doc, {
        startY: yPos,
        margin: { left: margin + 80, right: margin },
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
        styles: { fontSize: 8, cellPadding: 2 },
        body: v1Body,
        didParseCell: (data) => {
          if (data.row.index >= v1Body.length - 2) {
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });
    } else if (version === 'billing_v2') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(primaryColor);
      doc.text('TOTALS SUMMARY (INTERNAL)', margin, yPos);
      yPos += 2.5;

      const v2Body: (string[])[] = [
        ['Per Kg Sale Rate:', `${formatCurrency(ratePerKg)} / kg`],
        ['Freight Subtotal:', formatCurrency(saleAmt)],
        ['Custom Clearance Duty:', formatCurrency(customDuty)],
      ];

      if (discountAmount > 0) {
        v2Body.push(['Discount Amount:', `- ${formatCurrency(discountAmount)}`]);
      }

      v2Body.push(['Net Payable Amount:', formatCurrency(finalAmount)]);

      autoTable(doc, {
        startY: yPos,
        margin: { left: margin + 80, right: margin },
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        body: v2Body,
        didParseCell: (data) => {
          if (data.row.index === v2Body.length - 1) {
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });
    }
  }

  // Footer for Customer Invoice: Signature & Stamp boxes
  if (version === 'customer' || version === 'item_list') {
    const footerY = Math.max(yPos + 6, 235); // dynamic position at bottom of page A4

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);

    // Box 1: Customer Signature
    const boxWidth = 80;
    const boxHeight = 28;
    doc.rect(margin, footerY, boxWidth, boxHeight);
    doc.line(margin + 5, footerY + 20, margin + boxWidth - 5, footerY + 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(secondaryColor);
    doc.text('Customer Signature & Verification', margin + boxWidth / 2, footerY + 24.5, { align: 'center' });

    // Box 2: Company Stamp / Authorized Signature
    const box2X = pageWidth - margin - boxWidth;
    doc.rect(box2X, footerY, boxWidth, boxHeight);
    doc.line(box2X + 5, footerY + 20, box2X + boxWidth - 5, footerY + 20);

    doc.text(`Authorized Signature (${shipperName})`, box2X + boxWidth / 2, footerY + 24.5, { align: 'center' });
  }

  // Page Footer Note
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Email: ${companyEmail} • Tel: ${shipperPhone} • ${shipperAddress} • Computer Generated Document`,
    pageWidth / 2,
    pageHeight - 8,
    { align: 'center' }
  );

  return doc;
}

export function downloadInvoicePDF(invoice: Invoice, version: PDFVersion): void {
  const doc = generateInvoicePDF(invoice, version);
  const fileName = `${invoice.invoice_no}_${version}.pdf`;
  doc.save(fileName);
}

export function generateKathmanduBillingPDF(billing: KathmanduBilling): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  const primaryColor = '#0f172a';
  const brandBlue = '#1e3a8a';
  const secondaryColor = '#475569';

  let yPos = margin;

  try {
    doc.addImage(LOGO_URL, 'JPEG', margin, yPos, 16, 16);
  } catch (e) {}

  const textX = margin + 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(primaryColor);
  doc.text('THE COURIER STATION SADOBATO', textX, yPos + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(brandBlue);
  doc.text('Kathmandu Forwarder Purchase Statement & Airport Voucher', textX, yPos + 8.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(secondaryColor);
  doc.text('Address: Sadobato, Lalitpur / Kathmandu, Nepal', textX, yPos + 12.5);
  doc.text('Tel: +977 1-5544332 / 9851012345 | Email: info@courierstationsadobato.com', textX, yPos + 16);

  // Document Badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor('#1e40af');
  doc.text('KATHMANDU BILLING VOUCHER', pageWidth - margin, yPos + 5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(secondaryColor);
  doc.text(`KTM Bill No: ${billing.ktm_invoice_no}`, pageWidth - margin, yPos + 10, { align: 'right' });
  doc.text(`Date: ${billing.ktm_date}`, pageWidth - margin, yPos + 14, { align: 'right' });
  if (billing.customer_invoice_no) {
    doc.text(`Customer Ref: ${billing.customer_invoice_no}`, pageWidth - margin, yPos + 18, { align: 'right' });
  }

  yPos += 26;

  // Horizontal divider
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  yPos += 5;

  // 3 Columns: Sender, Receiver, Forwarder
  const colWidth = (contentWidth - 6) / 3;

  // Box 1: Customer (Sender)
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, yPos, colWidth, 26, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primaryColor);
  doc.text('CUSTOMER (SENDER / SDB)', margin + 3, yPos + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(secondaryColor);
  doc.text(`Name: ${billing.sender_name}`, margin + 3, yPos + 8.5);
  doc.text(`Phone: ${billing.sender_phone || '-'}`, margin + 3, yPos + 12.5);
  doc.text(`Address: ${billing.sender_address || 'Kathmandu / Lalitpur, Nepal'}`, margin + 3, yPos + 16.5, { maxWidth: colWidth - 6 });

  // Box 2: Consignee (Receiver)
  const col2X = margin + colWidth + 3;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(col2X, yPos, colWidth, 26, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primaryColor);
  doc.text('CONSIGNEE (RECEIVER / DESTINATION)', col2X + 3, yPos + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(secondaryColor);
  doc.text(`Name: ${billing.receiver_name}`, col2X + 3, yPos + 8.5);
  doc.text(`Phone: ${billing.receiver_phone || '-'}`, col2X + 3, yPos + 12.5);
  doc.text(`Dest: ${billing.country} (${billing.transport_type || 'AIR'})`, col2X + 3, yPos + 16.5);
  doc.text(`Address: ${billing.receiver_address || '-'}`, col2X + 3, yPos + 20.5, { maxWidth: colWidth - 6 });

  // Box 3: Forwarder & Hub
  const col3X = col2X + colWidth + 3;
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(col3X, yPos, colWidth, 26, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor('#1e40af');
  doc.text('KTM FORWARDER & CARRIER', col3X + 3, yPos + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(secondaryColor);
  doc.text(`Hub: ${billing.forwarder_name || 'Nepal Air Cargo KTM'}`, col3X + 3, yPos + 8.5, { maxWidth: colWidth - 6 });
  doc.text(`AWB: ${billing.awb_no || '-'}`, col3X + 3, yPos + 12.5);
  doc.text(`Status: ${billing.payment_status || 'Paid'} (${billing.payment_method || 'Bank Transfer'})`, col3X + 3, yPos + 16.5);
  if (billing.vehicle_no) {
    doc.text(`Vehicle: ${billing.vehicle_no}`, col3X + 3, yPos + 20.5, { maxWidth: colWidth - 6 });
  }

  yPos += 30;

  // Shipment Specs Banner
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(margin, yPos, contentWidth, 10, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor('#ffffff');
  doc.text(
    `Shipment Specs:  Weight: ${billing.weight} kg  |  Boxes: ${billing.box_count}  |  Mode: ${billing.transport_type}  ${billing.customer_invoice_no ? '|  Linked Cust Ref: ' + billing.customer_invoice_no : ''}`,
    margin + 4,
    yPos + 6.5
  );

  yPos += 14;

  // Items Table
  const items = billing.items || [];
  autoTable(doc, {
    startY: yPos,
    margin: { left: margin, right: margin },
    head: [['#', 'Item Description', 'Category', 'Qty', 'Weight (kg)', 'Box #']],
    body: items.map((it, idx) => [
      (idx + 1).toString(),
      it.item_name,
      it.item_type,
      (it.quantity || 1).toString(),
      it.weight_kg !== undefined ? `${it.weight_kg} kg` : '-',
      `Box ${it.box_number || 1}`,
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 80 },
      2: { cellWidth: 30, halign: 'center' },
      3: { cellWidth: 15, halign: 'center' },
      4: { cellWidth: 25, halign: 'center' },
      5: { cellWidth: 20, halign: 'center' },
    },
  });

  const lastTable = (doc as any).lastAutoTable;
  yPos = lastTable.finalY + 6;

  // Financial Cost Breakdown Table
  const costRows: string[][] = [
    [
      `Air Freight Purchase (${billing.weight} kg ${billing.freight_rate_per_kg ? `@ Rs ${billing.freight_rate_per_kg}/kg` : ''})`,
      formatCurrency(billing.freight_cost),
    ],
    ['Airport Customs Clearance Cost (TIA KTM)', formatCurrency(billing.custom_clearance_cost)],
  ];

  if ((billing.handling_cost || 0) > 0) {
    costRows.push(['Cargo Handling & Airport Security Fee', formatCurrency(billing.handling_cost || 0)]);
  }
  if ((billing.meat_extra_cost || 0) > 0) {
    costRows.push(['Dry Meat Quarantine / Inspection Surcharge', formatCurrency(billing.meat_extra_cost || 0)]);
  }
  if ((billing.medicine_extra_cost || 0) > 0) {
    costRows.push(['Medicine / Pharma Quarantine & Documentation Surcharge', formatCurrency(billing.medicine_extra_cost || 0)]);
  }
  if ((billing.other_surcharges || 0) > 0) {
    costRows.push(['Other Airport / Forwarder Surcharges', formatCurrency(billing.other_surcharges || 0)]);
  }
  if ((billing.discount_amount || 0) > 0) {
    costRows.push(['Forwarder Discount / Rebate', `-${formatCurrency(billing.discount_amount || 0)}`]);
  }
  costRows.push(['TOTAL KATHMANDU BILLING COST', formatCurrency(billing.total_cost)]);

  autoTable(doc, {
    startY: yPos,
    margin: { left: margin + 60, right: margin },
    head: [['Kathmandu Billing & Clearance Statement', 'Cost (NPR)']],
    body: costRows,
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
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'bold' },
      1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: function (data) {
      if (data.row.index === costRows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [190, 18, 60];
        data.cell.styles.fontSize = 8.5;
        data.cell.styles.fillColor = [254, 226, 226];
      }
    },
  });

  const lastCostTable = (doc as any).lastAutoTable;
  yPos = lastCostTable.finalY + 12;

  // Signatures
  const footerY = Math.max(yPos, 240);
  const boxWidth = 75;
  const boxHeight = 26;

  // Prepared By
  doc.rect(margin, footerY, boxWidth, boxHeight);
  doc.line(margin + 5, footerY + 18, margin + boxWidth - 5, footerY + 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(secondaryColor);
  doc.text('Prepared By (Sadobato Hub Desk)', margin + boxWidth / 2, footerY + 22.5, { align: 'center' });

  // Confirmed By KTM
  const box2X = pageWidth - margin - boxWidth;
  doc.rect(box2X, footerY, boxWidth, boxHeight);
  doc.line(box2X + 5, footerY + 18, box2X + boxWidth - 5, footerY + 18);
  doc.text('Received & Verified (Kathmandu Hub)', box2X + boxWidth / 2, footerY + 22.5, { align: 'center' });

  return doc;
}

export function downloadKathmanduBillingPDF(billing: KathmanduBilling): void {
  const doc = generateKathmanduBillingPDF(billing);
  const fileName = `${billing.ktm_invoice_no}_KTM_Billing.pdf`;
  doc.save(fileName);
}
