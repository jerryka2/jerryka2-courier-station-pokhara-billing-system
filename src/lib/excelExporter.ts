import * as XLSX from 'xlsx';
import { Invoice, KathmanduBilling } from '../types';
import { getInvoicePurchaseBreakdown, getInvoiceWeightBreakdown, getInvoiceMeatBreakdown } from './rateCalculator';

/**
 * Export a single invoice to an Excel (.xlsx) file with full purchase cost, net weight, volume weight & profit breakdown.
 */
export function exportInvoiceToExcel(invoice: Invoice): void {
  const wb = getInvoiceWeightBreakdown(invoice);
  const meat = getInvoiceMeatBreakdown(invoice);
  const customDuty = invoice.custom_duty_amount ?? (500 * (invoice.box_count || 1));
  const discountAmount = invoice.discount_amount || 0;
  const ratePerKg = invoice.rate_per_kg || (wb.billableWeight > 0 ? invoice.sale_amount / wb.billableWeight : 0);
  const finalAmount = Math.max(0, invoice.sale_amount + customDuty - discountAmount);
  const totalPurchase = invoice.purchase_amount;
  const netProfit = invoice.profit_amount;

  const workbook = XLSX.utils.book_new();

  // Invoice Overview Data
  const overviewData = [
    ['INVOICE SUMMARY & BILLING DETAIL - THE COURIER STATION POKHARA'],
    ['Invoice No:', invoice.invoice_no, 'Invoice Date:', invoice.invoice_date],
    ['Sender Name:', invoice.sender_name, 'Receiver Name:', invoice.receiver_name],
    ['Phone Number:', invoice.phone, 'Receiver Address:', invoice.receiver_address || 'N/A'],
    ['Transport Mode:', invoice.transport_type, 'Destination Country:', invoice.country],
    ['Box Count:', invoice.box_count, 'Port of Loading:', invoice.port_of_loading || 'Kathmandu, Nepal'],
    ['Net Weight (Actual Scale kg):', wb.netWeight, 'Volumetric Weight (kg):', wb.volumeWeight],
    ['Billable / Chargeable Wt (kg):', wb.billableWeight, 'Volume Profit Weight (kg):', wb.volumeProfitWeight],
    ['Dry Meat / Sukuti Wt (kg):', meat.meatWeight, 'Normal Items Wt (kg):', meat.normalWeight],
    ['Deal Rate per Kg (NPR):', Math.round(ratePerKg), 'Departure:', invoice.departure || 'Kathmandu (KTM)'],
    ['Payment Mode:', invoice.payment_method || 'Cash', 'Payment Status:', invoice.payment_status || 'Paid'],
    ['Txn Ref / ID:', invoice.online_transaction_id || 'N/A', 'Dispatch Status:', invoice.status || 'Billed'],
    [],
    ['FINANCIAL, WEIGHT & PROFIT BREAKDOWN'],
    ['Metric', 'Value', 'Notes / Explanation'],
    ['Net Weight (Scale)', `${wb.netWeight} kg`, 'Physical weight on scale'],
    ['Volumetric Weight', `${wb.volumeWeight} kg`, 'Computed dimensional weight (L×W×H / 5000)'],
    ['Billable Weight', `${wb.billableWeight} kg`, 'Higher of Net vs Volumetric weight charged'],
    ['Volume Profit Weight', `${wb.volumeProfitWeight} kg`, 'Extra dimensional weight margin billed for profit'],
    ['Dry Meat / Sukuti Net Weight', `${meat.meatWeight} kg`, meat.hasMeat ? 'Special declaration meat items' : 'No meat in consignment'],
    ['Meat Extra Surcharge (Sale)', meat.meatExtraCharge, 'Extra surcharge billed for dry meat/sukuti'],
    ['Meat Carrier Purchase Cost', meat.meatPurchaseCost, 'Quarantine & special handling purchase cost'],
    ['Meat Net Profit', meat.meatProfit, 'Profit margin on meat handling'],
    ['Deal Sale Rate per Kg', `Rs ${Math.round(ratePerKg)} / kg`, `Weight: ${wb.billableWeight} kg`],
    ['Freight Subtotal (Sale)', invoice.sale_amount, 'Base freight revenue'],
    ['Custom Clearance Duty', customDuty, 'Custom clearing charge billed'],
    ['Discount Amount', discountAmount, 'Discount applied to customer'],
    ['Net Payable Billed Amount', finalAmount, 'Total collected from customer'],
    ['Total Purchase Cost', invoice.purchase_amount, 'Direct carrier & clearance purchase cost'],
    ['Net Station Profit', netProfit, 'Net profit earned on invoice'],
  ];

  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);

  // Set column widths
  overviewSheet['!cols'] = [
    { wch: 30 },
    { wch: 28 },
    { wch: 26 },
    { wch: 30 },
  ];

  XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Billing Summary');

  // Items Breakdown Sheet Data
  const itemHeaders = ['#', 'Item Description', 'Quantity', 'Item Category', 'Net Weight (kg)'];
  const itemRows = invoice.items.map((item, idx) => [
    idx + 1,
    item.item_name || 'General Goods',
    item.quantity || 1,
    item.item_type,
    item.weight_kg ? `${item.weight_kg} kg` : 'N/A',
  ]);

  const itemsSheetData = [
    [`INVOICE ITEMS BREAKDOWN - ${invoice.invoice_no}`],
    [`Net Shipment Weight: ${wb.netWeight} kg | Dry Meat Weight: ${meat.meatWeight} kg | Volumetric Weight: ${wb.volumeWeight} kg | Billed Weight: ${wb.billableWeight} kg`],
    [],
    itemHeaders,
    ...itemRows,
  ];

  const itemsSheet = XLSX.utils.aoa_to_sheet(itemsSheetData);
  itemsSheet['!cols'] = [
    { wch: 6 },
    { wch: 35 },
    { wch: 12 },
    { wch: 18 },
    { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Item Details');

  // Trigger download
  const filename = `Invoice_${invoice.invoice_no}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Export dedicated Sales Documentation workbook to Excel (.xlsx).
 * Features:
 * - Sheet 1: Sales Documentation Manifest & Financial Audit
 * - Sheet 2: Volume Weight & Business Profit Analysis (Net Wt vs Volumetric Wt vs Billable Wt)
 * - Sheet 3: Itemized Packing Manifest (with Net Weight per item)
 * - Sheet 4: Dry Meat (Sukuti) & Quarantine Clearances
 */
export function exportSalesDocumentationToExcel(
  invoices: Invoice[],
  reportTitle: string = 'Sales Documentation & Manifest Report'
): void {
  const workbook = XLSX.utils.book_new();

  // -------------------------------------------------------------
  // Sheet 1: Sales Documentation Summary
  // -------------------------------------------------------------
  const salesHeaders = [
    'S.N.',
    'Invoice No',
    'Date',
    'Sender Name',
    'Receiver Name',
    'Receiver Address',
    'Contact Phone',
    'Destination Country',
    'Transport Mode',
    'Port of Loading',
    'Boxes',
    'Net Scale Wt (kg)',
    'Dry Meat Wt (kg)',
    'Normal Items Wt (kg)',
    'Volumetric Wt (kg)',
    'Billable Wt (kg)',
    'Volume Profit Wt (kg)',
    'Rate / kg (Rs)',
    'Meat Extra Surcharge (Rs)',
    'Gross Freight Sales (Rs)',
    'Custom Duty (Rs)',
    'Discount (Rs)',
    'Net Sales Revenue (Rs)',
    'Carrier Purchase Cost (Rs)',
    'Net Station Profit (Rs)',
    'Payment Mode',
    'Payment Status',
    'Txn Ref / Remarks',
    'Dispatch Status',
    'AWB / Tracking #',
  ];

  let sumNetWeight = 0;
  let sumMeatWeight = 0;
  let sumNormalWeight = 0;
  let sumVolWeight = 0;
  let sumBillableWeight = 0;
  let sumVolProfitWeight = 0;
  let sumBoxes = 0;
  let sumMeatExtra = 0;
  let sumGrossFreight = 0;
  let sumCustomDuty = 0;
  let sumDiscount = 0;
  let sumNetSales = 0;
  let sumPurchaseCost = 0;
  let sumNetProfit = 0;

  const salesRows = invoices.map((inv, idx) => {
    const wb = getInvoiceWeightBreakdown(inv);
    const meat = getInvoiceMeatBreakdown(inv);
    const customDuty = inv.custom_duty_amount ?? (500 * (inv.box_count || 1));
    const discountAmount = inv.discount_amount || 0;
    const ratePerKg = inv.rate_per_kg || (wb.billableWeight > 0 ? inv.sale_amount / wb.billableWeight : 0);
    const finalAmount = Math.max(0, inv.sale_amount + customDuty - discountAmount);
    const purchaseCost = inv.purchase_amount || 0;
    const profit = inv.profit_amount || (finalAmount - purchaseCost);

    sumNetWeight += wb.netWeight;
    sumMeatWeight += meat.meatWeight;
    sumNormalWeight += meat.normalWeight;
    sumVolWeight += wb.volumeWeight;
    sumBillableWeight += wb.billableWeight;
    sumVolProfitWeight += wb.volumeProfitWeight;
    sumBoxes += inv.box_count || 1;
    sumMeatExtra += meat.meatExtraCharge;
    sumGrossFreight += inv.sale_amount || 0;
    sumCustomDuty += customDuty;
    sumDiscount += discountAmount;
    sumNetSales += finalAmount;
    sumPurchaseCost += purchaseCost;
    sumNetProfit += profit;

    return [
      idx + 1,
      inv.invoice_no,
      inv.invoice_date,
      inv.sender_name,
      inv.receiver_name,
      inv.receiver_address || '',
      inv.phone,
      inv.country,
      inv.transport_type,
      inv.port_of_loading || 'Kathmandu, Nepal',
      inv.box_count || 1,
      wb.netWeight,
      meat.meatWeight,
      meat.normalWeight,
      wb.volumeWeight,
      wb.billableWeight,
      wb.volumeProfitWeight,
      Math.round(ratePerKg),
      meat.meatExtraCharge,
      inv.sale_amount,
      customDuty,
      discountAmount,
      finalAmount,
      purchaseCost,
      profit,
      inv.payment_method || 'Cash',
      inv.payment_status || 'Paid',
      inv.online_transaction_id || '',
      inv.status || 'Billed',
      inv.awb_no || '',
    ];
  });

  const salesSummaryRow = [
    'TOTAL',
    '--',
    '--',
    '--',
    '--',
    '--',
    '--',
    '--',
    '--',
    '--',
    sumBoxes,
    Number(sumNetWeight.toFixed(2)),
    Number(sumMeatWeight.toFixed(2)),
    Number(sumNormalWeight.toFixed(2)),
    Number(sumVolWeight.toFixed(2)),
    Number(sumBillableWeight.toFixed(2)),
    Number(sumVolProfitWeight.toFixed(2)),
    '--',
    sumMeatExtra,
    sumGrossFreight,
    sumCustomDuty,
    sumDiscount,
    sumNetSales,
    sumPurchaseCost,
    sumNetProfit,
    '--',
    '--',
    '--',
    '--',
    '--',
  ];

  const sheet1Data = [
    ['COURIER STATION POKHARA - OFFICIAL SALES DOCUMENTATION REPORT'],
    [`Generated Date: ${new Date().toLocaleString()} | Total Invoices: ${invoices.length} | Net Collected: Rs. ${sumNetSales.toLocaleString()} | Net Profit: Rs. ${sumNetProfit.toLocaleString()}`],
    [],
    salesHeaders,
    ...salesRows,
    [],
    salesSummaryRow,
  ];

  const sheet1 = XLSX.utils.aoa_to_sheet(sheet1Data);
  sheet1['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 12 },
    { wch: 22 },
    { wch: 22 },
    { wch: 28 },
    { wch: 16 },
    { wch: 18 },
    { wch: 12 },
    { wch: 20 },
    { wch: 8 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 14 },
    { wch: 22 },
    { wch: 20 },
    { wch: 16 },
    { wch: 14 },
    { wch: 22 },
    { wch: 22 },
    { wch: 20 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 14 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(workbook, sheet1, 'Sales Documentation');

  // -------------------------------------------------------------
  // Sheet 2: Volume Weight & Business Profit Analysis
  // -------------------------------------------------------------
  const volumeHeaders = [
    'S.N.',
    'Invoice No',
    'Destination Country',
    'Boxes',
    'Net Scale Weight (kg)',
    'Volumetric Weight (kg)',
    'Billable Weight (kg)',
    'Volume Weight Gain (kg)',
    'Deal Rate / kg (Rs)',
    'Extra Volume Revenue (Rs)',
    'Profit Type',
  ];

  let sumVolRev = 0;
  const volumeRows = invoices.map((inv, idx) => {
    const wb = getInvoiceWeightBreakdown(inv);
    const ratePerKg = inv.rate_per_kg || (wb.billableWeight > 0 ? inv.sale_amount / wb.billableWeight : 0);
    const volRevenue = wb.volumeProfitAmount;
    sumVolRev += volRevenue;

    return [
      idx + 1,
      inv.invoice_no,
      inv.country,
      inv.box_count || 1,
      wb.netWeight,
      wb.volumeWeight,
      wb.billableWeight,
      wb.volumeProfitWeight,
      Math.round(ratePerKg),
      volRevenue,
      wb.isVolumetricCharged ? '🌟 Volumetric Profit Gain' : 'Scale Weight Billed',
    ];
  });

  const volumeSummaryRow = [
    'TOTAL',
    '--',
    '--',
    sumBoxes,
    Number(sumNetWeight.toFixed(2)),
    Number(sumVolWeight.toFixed(2)),
    Number(sumBillableWeight.toFixed(2)),
    Number(sumVolProfitWeight.toFixed(2)),
    '--',
    sumVolRev,
    '--',
  ];

  const sheet2Data = [
    ['DIMENSIONAL VOLUME WEIGHT & BUSINESS PROFIT ANALYSIS'],
    ['When Volumetric Weight (L×W×H/5000) exceeds Net Scale Weight, the extra weight is pure volume profit for Courier Station Pokhara.'],
    [],
    volumeHeaders,
    ...volumeRows,
    [],
    volumeSummaryRow,
  ];

  const sheet2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  sheet2['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 20 },
    { wch: 8 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 16 },
    { wch: 24 },
    { wch: 26 },
  ];
  XLSX.utils.book_append_sheet(workbook, sheet2, 'Volume Profit Analysis');

  // -------------------------------------------------------------
  // Sheet 3: Itemized Packing Manifest (with Net Weight per item)
  // -------------------------------------------------------------
  const itemHeaders = [
    'S.N.',
    'Invoice No',
    'Destination Country',
    'Packed Box #',
    'Item Description',
    'Category / Type',
    'Quantity',
    'Net Item Weight (kg)',
  ];

  const itemRows: any[][] = [];
  let itemSN = 1;

  invoices.forEach((inv) => {
    if (inv.items && inv.items.length > 0) {
      inv.items.forEach((item) => {
        itemRows.push([
          itemSN++,
          inv.invoice_no,
          inv.country,
          `Box #${item.box_number || 1}`,
          item.item_name || 'General Goods',
          item.item_type || 'Normal',
          item.quantity || 1,
          item.weight_kg ? `${item.weight_kg} kg` : 'Included in Box Net Wt',
        ]);
      });
    }
  });

  const sheet3Data = [
    ['SALES DOCUMENTATION - ITEM PACKING MANIFEST'],
    [`Total Registered Line Items: ${itemRows.length}`],
    [],
    itemHeaders,
    ...itemRows,
  ];

  const sheet3 = XLSX.utils.aoa_to_sheet(sheet3Data);
  sheet3['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 18 },
    { wch: 14 },
    { wch: 32 },
    { wch: 18 },
    { wch: 10 },
    { wch: 24 },
  ];
  XLSX.utils.book_append_sheet(workbook, sheet3, 'Item Manifest');

  // -------------------------------------------------------------
  // Sheet 4: Dry Meat (Sukuti) & Quarantine Clearance Audit
  // -------------------------------------------------------------
  const meatHeaders = [
    'S.N.',
    'Invoice No',
    'Date',
    'Sender',
    'Receiver',
    'Country',
    'Total Net Wt (kg)',
    'Meat Net Wt (kg)',
    'Meat Item Description',
    'Meat Surcharge Collected (Rs)',
    'Meat Clearance Cost (Rs)',
    'Estimated Meat Profit (Rs)',
    'Quarantine Status',
  ];

  const meatInvoices = invoices.filter((inv) => {
    const m = getInvoiceMeatBreakdown(inv);
    return m.hasMeat;
  });

  let sumAuditMeatWt = 0;
  let sumAuditMeatExtra = 0;
  let sumAuditMeatCost = 0;
  let sumAuditMeatProfit = 0;

  const meatRows = meatInvoices.map((inv, idx) => {
    const wb = getInvoiceWeightBreakdown(inv);
    const m = getInvoiceMeatBreakdown(inv);

    sumAuditMeatWt += m.meatWeight;
    sumAuditMeatExtra += m.meatExtraCharge;
    sumAuditMeatCost += m.meatPurchaseCost;
    sumAuditMeatProfit += m.meatProfit;

    return [
      idx + 1,
      inv.invoice_no,
      inv.invoice_date,
      inv.sender_name,
      inv.receiver_name,
      inv.country,
      wb.netWeight,
      m.meatWeight,
      m.meatItemDescriptions.join(', ') || 'Dry Meat / Sukuti',
      m.meatExtraCharge,
      m.meatPurchaseCost,
      m.meatProfit,
      'Certified Vacuum Packed & Air Courier Cleared',
    ];
  });

  const meatSummaryRow = [
    'TOTAL',
    '--',
    '--',
    '--',
    '--',
    '--',
    '--',
    Number(sumAuditMeatWt.toFixed(2)),
    '--',
    sumAuditMeatExtra,
    sumAuditMeatCost,
    sumAuditMeatProfit,
    '--',
  ];

  const sheet4Data = [
    ['DRY MEAT (SUKUTI) & SPECIAL COMMODITIES AUDIT REPORT'],
    [`Consignments with Meat/Sukuti: ${meatInvoices.length} | Total Meat Weight: ${sumAuditMeatWt.toFixed(2)} kg | Meat Extra Surcharge: Rs. ${sumAuditMeatExtra.toLocaleString()}`],
    [],
    meatHeaders,
    ...meatRows,
    [],
    meatSummaryRow,
  ];

  const sheet4 = XLSX.utils.aoa_to_sheet(sheet4Data);
  sheet4['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 12 },
    { wch: 22 },
    { wch: 22 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 30 },
    { wch: 24 },
    { wch: 22 },
    { wch: 22 },
    { wch: 35 },
  ];
  XLSX.utils.book_append_sheet(workbook, sheet4, 'Meat & Special Goods Audit');

  // Download File
  const filename = `Sales_Documentation_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Export specialized Dry Meat (Sukuti) Clearance Manifest to Excel (.xlsx).
 */
export function exportMeatDocumentationToExcel(invoices: Invoice[]): void {
  const meatInvoices = invoices.filter((inv) => {
    const m = getInvoiceMeatBreakdown(inv);
    return m.hasMeat;
  });

  const workbook = XLSX.utils.book_new();

  const headers = [
    'S.N.',
    'Invoice No',
    'Date',
    'Sender Name',
    'Receiver Name',
    'Destination Country',
    'AWB / Tracking #',
    'Total Net Wt (kg)',
    'Meat Net Wt (kg)',
    'Normal Wt (kg)',
    'Meat Description',
    'Meat Rate / kg (Rs)',
    'Meat Surcharge (Rs)',
    'Carrier Clearance Cost (Rs)',
    'Meat Profit (Rs)',
    'Clearance Declaration',
  ];

  let sumTotalNet = 0;
  let sumMeatNet = 0;
  let sumNormalNet = 0;
  let sumSurcharge = 0;
  let sumCost = 0;
  let sumProfit = 0;

  const rows = meatInvoices.map((inv, idx) => {
    const wb = getInvoiceWeightBreakdown(inv);
    const m = getInvoiceMeatBreakdown(inv);

    sumTotalNet += wb.netWeight;
    sumMeatNet += m.meatWeight;
    sumNormalNet += m.normalWeight;
    sumSurcharge += m.meatExtraCharge;
    sumCost += m.meatPurchaseCost;
    sumProfit += m.meatProfit;

    return [
      idx + 1,
      inv.invoice_no,
      inv.invoice_date,
      inv.sender_name,
      inv.receiver_name,
      inv.country,
      inv.awb_no || 'Pending',
      wb.netWeight,
      m.meatWeight,
      m.normalWeight,
      m.meatItemDescriptions.join(', ') || 'Dry Meat / Sukuti',
      m.meatRatePerKg,
      m.meatExtraCharge,
      m.meatPurchaseCost,
      m.meatProfit,
      'Vacuum Sealed & Non-Commercial Personal Effects Declaration',
    ];
  });

  const summaryRow = [
    'TOTAL',
    '--',
    '--',
    '--',
    '--',
    '--',
    '--',
    Number(sumTotalNet.toFixed(2)),
    Number(sumMeatNet.toFixed(2)),
    Number(sumNormalNet.toFixed(2)),
    '--',
    '--',
    sumSurcharge,
    sumCost,
    sumProfit,
    '--',
  ];

  const sheetData = [
    ['COURIER STATION POKHARA - DRY MEAT (SUKUTI) SPECIAL CLEARANCE MANIFEST'],
    [`Total Meat Consignments: ${meatInvoices.length} | Net Meat Weight: ${sumMeatNet.toFixed(2)} kg | Generated: ${new Date().toLocaleString()}`],
    [],
    headers,
    ...rows,
    [],
    summaryRow,
  ];

  const sheet = XLSX.utils.aoa_to_sheet(sheetData);
  sheet['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 12 },
    { wch: 22 },
    { wch: 22 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 28 },
    { wch: 18 },
    { wch: 20 },
    { wch: 22 },
    { wch: 18 },
    { wch: 40 },
  ];

  XLSX.utils.book_append_sheet(workbook, sheet, 'Meat Clearance Manifest');

  const filename = `Meat_Sukuti_Clearance_Manifest_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Export directory/list of invoices to Excel (.xlsx) including total purchase and net profit calculations.
 */
export function exportInvoicesDirectoryToExcel(
  invoices: Invoice[],
  reportTitle: string = 'Invoices Directory Report'
): void {
  const workbook = XLSX.utils.book_new();

  const headers = [
    'S.N.',
    'Invoice No',
    'Date',
    'Sender',
    'Receiver',
    'Receiver Address',
    'Phone',
    'Country',
    'Transport',
    'Net Weight (Scale kg)',
    'Meat Net Wt (kg)',
    'Volumetric Wt (kg)',
    'Billable Wt (kg)',
    'Boxes',
    'Rate / kg (Rs)',
    'Freight Subtotal (Rs)',
    'Custom Duty (Rs)',
    'Discount (Rs)',
    'Net Billed Amount (Rs)',
    'Purchase Cost (Rs)',
    'Net Profit (Rs)',
    'Payment Mode',
    'Payment Status',
    'Txn Ref / Remarks',
  ];

  let totalNetWeight = 0;
  let totalMeatWeight = 0;
  let totalVolWeight = 0;
  let totalBillableWeight = 0;
  let totalBoxes = 0;
  let totalFreight = 0;
  let totalCustom = 0;
  let totalDiscount = 0;
  let totalNetBilled = 0;
  let totalPurchase = 0;
  let totalNetProfit = 0;

  const rows = invoices.map((inv, idx) => {
    const wb = getInvoiceWeightBreakdown(inv);
    const meat = getInvoiceMeatBreakdown(inv);
    const customDuty = inv.custom_duty_amount ?? (500 * (inv.box_count || 1));
    const discountAmount = inv.discount_amount || 0;
    const ratePerKg = inv.rate_per_kg || (wb.billableWeight > 0 ? inv.sale_amount / wb.billableWeight : 0);
    const finalAmount = Math.max(0, inv.sale_amount + customDuty - discountAmount);
    const purchaseCost = inv.purchase_amount;
    const profit = inv.profit_amount;

    totalNetWeight += wb.netWeight;
    totalMeatWeight += meat.meatWeight;
    totalVolWeight += wb.volumeWeight;
    totalBillableWeight += wb.billableWeight;
    totalBoxes += inv.box_count || 1;
    totalFreight += inv.sale_amount || 0;
    totalCustom += customDuty;
    totalDiscount += discountAmount;
    totalNetBilled += finalAmount;
    totalPurchase += purchaseCost;
    totalNetProfit += profit;

    return [
      idx + 1,
      inv.invoice_no,
      inv.invoice_date,
      inv.sender_name,
      inv.receiver_name,
      inv.receiver_address || '',
      inv.phone,
      inv.country,
      inv.transport_type,
      wb.netWeight,
      meat.meatWeight,
      wb.volumeWeight,
      wb.billableWeight,
      inv.box_count || 1,
      Math.round(ratePerKg),
      inv.sale_amount,
      customDuty,
      discountAmount,
      finalAmount,
      purchaseCost,
      profit,
      inv.payment_method || 'Cash',
      inv.payment_status || 'Paid',
      inv.online_transaction_id || '',
    ];
  });

  // Summary Row
  const summaryRow = [
    'TOTAL',
    '--',
    '--',
    '--',
    '--',
    '--',
    '--',
    '--',
    '--',
    Number(totalNetWeight.toFixed(2)),
    Number(totalMeatWeight.toFixed(2)),
    Number(totalVolWeight.toFixed(2)),
    Number(totalBillableWeight.toFixed(2)),
    totalBoxes,
    '--',
    totalFreight,
    totalCustom,
    totalDiscount,
    totalNetBilled,
    totalPurchase,
    totalNetProfit,
  ];

  const sheetData = [
    [reportTitle.toUpperCase()],
    [`Generated Date: ${new Date().toLocaleDateString()} | Total Invoices: ${invoices.length}`],
    [],
    headers,
    ...rows,
    [],
    summaryRow,
  ];

  const sheet = XLSX.utils.aoa_to_sheet(sheetData);

  sheet['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 12 },
    { wch: 22 },
    { wch: 22 },
    { wch: 24 },
    { wch: 15 },
    { wch: 14 },
    { wch: 12 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 8 },
    { wch: 14 },
    { wch: 18 },
    { wch: 16 },
    { wch: 14 },
    { wch: 20 },
    { wch: 18 },
    { wch: 16 },
  ];

  XLSX.utils.book_append_sheet(workbook, sheet, 'Invoices Report');

  const filename = `Invoices_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Export detailed Purchase List to an Excel (.xlsx) file.
 * Includes Purchase Costs, Net Weight (Scale kg), Volumetric Weight (kg), Chargeable Weight (kg), and itemized contents.
 */
export function exportPurchaseListBreakdownToExcel(invoices: Invoice[], rates?: any[]): void {
  const workbook = XLSX.utils.book_new();

  // 1. Sheet 1: Purchase List Overview
  const summaryHeaders = [
    'S.N.',
    'Invoice No',
    'Date',
    'Sender',
    'Receiver',
    'Destination Country',
    'Transport Type',
    'Net Weight (Scale kg)',
    'Meat Net Wt (kg)',
    'Volumetric Weight (kg)',
    'Chargeable Weight (kg)',
    'Box Count',
    'Purchase Rate / kg (NPR)',
    'Freight Purchase (NPR)',
    'Custom Clearance Purchase (NPR)',
    'Total Purchase Amount (NPR)',
  ];

  let sumNetWeight = 0;
  let sumMeatWeight = 0;
  let sumVolWeight = 0;
  let sumChargeableWeight = 0;
  let sumBoxes = 0;
  let sumFreightPurchase = 0;
  let sumCustomPurchase = 0;
  let sumPurchaseCost = 0;

  const summaryRows = invoices.map((inv, idx) => {
    const wb = getInvoiceWeightBreakdown(inv);
    const pb = getInvoicePurchaseBreakdown(inv);
    const meat = getInvoiceMeatBreakdown(inv);
    const purchaseCost = inv.purchase_amount || pb.totalPurchase;
    const purchaseRatePerKg = wb.billableWeight > 0 ? (pb.freightPurchase / wb.billableWeight).toFixed(2) : '0';

    sumNetWeight += wb.netWeight;
    sumMeatWeight += meat.meatWeight;
    sumVolWeight += wb.volumeWeight;
    sumChargeableWeight += wb.billableWeight;
    sumBoxes += inv.box_count || 1;
    sumFreightPurchase += pb.freightPurchase;
    sumCustomPurchase += pb.customPurchaseCost;
    sumPurchaseCost += purchaseCost;

    return [
      idx + 1,
      inv.invoice_no,
      inv.invoice_date,
      inv.sender_name,
      inv.receiver_name,
      inv.country,
      inv.transport_type,
      wb.netWeight,
      meat.meatWeight,
      wb.volumeWeight,
      wb.billableWeight,
      inv.box_count || 1,
      Number(purchaseRatePerKg),
      pb.freightPurchase,
      pb.customPurchaseCost,
      purchaseCost,
    ];
  });

  const totalRow = [
    'TOTAL',
    '--',
    '--',
    '--',
    '--',
    '--',
    '--',
    Number(sumNetWeight.toFixed(2)),
    Number(sumMeatWeight.toFixed(2)),
    Number(sumVolWeight.toFixed(2)),
    Number(sumChargeableWeight.toFixed(2)),
    sumBoxes,
    '--',
    sumFreightPurchase,
    sumCustomPurchase,
    sumPurchaseCost,
  ];

  const sheet1Data = [
    ['COURIER STATION POKHARA - PURCHASE AMOUNT LIST REPORT'],
    [`Generated: ${new Date().toLocaleString()} | Invoices Count: ${invoices.length} | Total Purchase: Rs. ${sumPurchaseCost.toLocaleString()}`],
    [],
    summaryHeaders,
    ...summaryRows,
    [],
    totalRow,
  ];

  const sheet1 = XLSX.utils.aoa_to_sheet(sheet1Data);
  sheet1['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 12 },
    { wch: 22 },
    { wch: 22 },
    { wch: 18 },
    { wch: 14 },
    { wch: 22 },
    { wch: 18 },
    { wch: 22 },
    { wch: 22 },
    { wch: 10 },
    { wch: 22 },
    { wch: 22 },
    { wch: 26 },
    { wch: 26 },
  ];
  XLSX.utils.book_append_sheet(workbook, sheet1, 'Purchase Amount List');

  // 2. Sheet 2: Itemized Parcel Box Packing List (Showing Net Weight for Items)
  const itemHeaders = [
    'S.N.',
    'Invoice No',
    'Country',
    'Packed Box #',
    'Item Description',
    'Category / Type',
    'Quantity',
    'Net Weight (kg)',
  ];

  const itemRows: any[][] = [];
  let itemSN = 1;

  invoices.forEach((inv) => {
    if (inv.items && inv.items.length > 0) {
      inv.items.forEach((item) => {
        itemRows.push([
          itemSN++,
          inv.invoice_no,
          inv.country,
          `Box #${item.box_number || 1}`,
          item.item_name || 'General Goods',
          item.item_type || 'Normal',
          item.quantity || 1,
          item.weight_kg ? `${item.weight_kg} kg` : 'Included in Box Net Wt',
        ]);
      });
    }
  });

  const sheet2Data = [
    ['PURCHASE SHIPMENT ITEMS PACKING LIST'],
    [`Total Individual Items: ${itemRows.length}`],
    [],
    itemHeaders,
    ...itemRows,
  ];

  const sheet2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  sheet2['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 15 },
    { wch: 14 },
    { wch: 32 },
    { wch: 18 },
    { wch: 10 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(workbook, sheet2, 'Box Items Breakdown');

  // Download File
  const filename = `Purchase_List_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Export a single Kathmandu Forwarder Billing Voucher to an Excel spreadsheet
 */
export function exportKathmanduBillingToExcel(billing: KathmanduBilling): void {
  const workbook = XLSX.utils.book_new();

  const overviewData = [
    ['KATHMANDU FORWARDER BILLING VOUCHER - THE COURIER STATION POKHARA'],
    ['KTM Bill No:', billing.ktm_invoice_no, 'Bill Date:', billing.ktm_date],
    ['Customer Ref:', billing.customer_invoice_no || 'Standalone', 'AWB No:', billing.awb_no || 'N/A'],
    ['Sender Name:', billing.sender_name, 'Sender Phone:', billing.sender_phone || 'N/A'],
    ['Sender Address:', billing.sender_address || 'Pokhara, Nepal', 'Destination Country:', billing.country],
    ['Receiver Name:', billing.receiver_name, 'Receiver Address:', billing.receiver_address || 'N/A'],
    ['Transport Mode:', billing.transport_type, 'Box Count:', billing.box_count],
    ['Shipment Weight (kg):', billing.weight, 'Forwarder / Hub:', billing.forwarder_name || 'Nepal Air Cargo KTM'],
    ['Payment Method:', billing.payment_method || 'Bank Transfer', 'Payment Status:', billing.payment_status || 'Paid'],
    ['Forwarder PAN:', billing.forwarder_pan || 'N/A', 'Notes / Remarks:', billing.notes || 'N/A'],
    [],
    ['KATHMANDU COST & CHARGES BREAKDOWN'],
    ['Cost Head / Description', 'Amount (NPR)', 'Remarks / Notes'],
    ['Air Freight Cost (Kathmandu)', billing.freight_cost, `${billing.weight} kg @ Rs. ${billing.freight_rate_per_kg || 0}/kg`],
    ['Customs Clearance Duty (Airport TIA)', billing.custom_clearance_cost, 'TIA Airport Customs clearing fees'],
    ['Cargo Handling & Security Fee', billing.handling_cost || 0, 'Terminal & airport security handling'],
    ['Dry Meat / Sukuti Quarantine Surcharge', billing.meat_extra_cost || 0, 'Quarantine & special handling'],
    ['Other Forwarder Surcharges', billing.other_surcharges || 0, 'Documentation / hub surcharges'],
    ['Forwarder Discount / Rebate', billing.discount_amount || 0, 'Rebate from forwarder'],
    ['TOTAL KATHMANDU BILLING COST', billing.total_cost, 'Total payable to Kathmandu carrier/forwarder'],
  ];

  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
  overviewSheet['!cols'] = [
    { wch: 32 },
    { wch: 28 },
    { wch: 35 },
  ];
  XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Billing Voucher');

  if (billing.items && billing.items.length > 0) {
    const itemHeaders = ['#', 'Box Number', 'Item Description', 'Category', 'Quantity', 'Weight (kg)'];
    const itemRows = billing.items.map((it, idx) => [
      idx + 1,
      `Box #${it.box_number || 1}`,
      it.item_name || 'General Cargo',
      it.item_type || 'Normal',
      it.quantity || 1,
      it.weight_kg ? `${it.weight_kg} kg` : 'N/A',
    ]);

    const itemsSheetData = [
      [`PARCEL ITEMS MANIFEST - ${billing.ktm_invoice_no}`],
      [`Total Items: ${billing.items.length} | Total Weight: ${billing.weight} kg | Boxes: ${billing.box_count}`],
      [],
      itemHeaders,
      ...itemRows,
    ];

    const itemsSheet = XLSX.utils.aoa_to_sheet(itemsSheetData);
    itemsSheet['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 35 },
      { wch: 18 },
      { wch: 12 },
      { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Manifest Items');
  }

  const filename = `${billing.ktm_invoice_no}_Kathmandu_Billing.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Export full list of Kathmandu Billings to Excel with Paid Amount, Remaining Balance Due & Settlement Cycle status
 */
export function exportKathmanduBillingsListToExcel(billings: KathmanduBilling[]): void {
  const workbook = XLSX.utils.book_new();

  const headers = [
    'S.N.',
    'KTM Bill No',
    'Date',
    'Customer Ref',
    'AWB Tracking No',
    'Sender Name',
    'Receiver Name',
    'Country',
    'Mode',
    'Weight (kg)',
    'Boxes',
    'Forwarder Hub',
    'Freight Cost (NPR)',
    'Customs Duty (NPR)',
    'Handling Fee (NPR)',
    'Meat Extra (NPR)',
    'Other Charges (NPR)',
    'Discount (NPR)',
    'Total KTM Cost (NPR)',
    'Amount Paid (NPR)',
    'Balance Due / Left (NPR)',
    'Payment Status',
    'Payment Method',
    'Settlement Batch / Cycle',
    'Shipping Status',
  ];

  let sumFreight = 0;
  let sumCustoms = 0;
  let sumHandling = 0;
  let sumMeat = 0;
  let sumOther = 0;
  let sumDiscount = 0;
  let sumTotal = 0;
  let sumPaid = 0;
  let sumDue = 0;

  const rows = billings.map((b, idx) => {
    const totalCost = Number(b.total_cost) || 0;
    const paidAmount = b.amount_paid !== undefined ? Number(b.amount_paid) : (b.payment_status === 'Paid' ? totalCost : 0);
    const dueAmount = b.amount_due !== undefined ? Number(b.amount_due) : Math.max(0, totalCost - paidAmount);

    sumFreight += b.freight_cost || 0;
    sumCustoms += b.custom_clearance_cost || 0;
    sumHandling += b.handling_cost || 0;
    sumMeat += b.meat_extra_cost || 0;
    sumOther += b.other_surcharges || 0;
    sumDiscount += b.discount_amount || 0;
    sumTotal += totalCost;
    sumPaid += paidAmount;
    sumDue += dueAmount;

    return [
      idx + 1,
      b.ktm_invoice_no,
      b.ktm_date,
      b.customer_invoice_no || '-',
      b.awb_no || '-',
      b.sender_name,
      b.receiver_name,
      b.country,
      b.transport_type,
      b.weight,
      b.box_count,
      b.forwarder_name || 'KTM Air Cargo',
      b.freight_cost,
      b.custom_clearance_cost,
      b.handling_cost || 0,
      b.meat_extra_cost || 0,
      b.other_surcharges || 0,
      b.discount_amount || 0,
      totalCost,
      paidAmount,
      dueAmount,
      b.payment_status || (dueAmount === 0 ? 'Paid' : 'Unpaid'),
      b.payment_method || 'Bank Transfer',
      b.settlement_cycle_name || (b.is_settled_archived ? 'Archived Batch' : 'Active Cycle'),
      b.shipping_status || 'Ready at Hub',
    ];
  });

  const totalRow = [
    'TOTAL',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    sumFreight,
    sumCustoms,
    sumHandling,
    sumMeat,
    sumOther,
    sumDiscount,
    sumTotal,
    sumPaid,
    sumDue,
    '',
    '',
    '',
    '',
  ];

  const sheetData = [
    ['THE COURIER STATION POKHARA - KATHMANDU FORWARDER BILLING & LEDGER MANIFEST'],
    [`Generated: ${new Date().toLocaleString()} | Total Bills: ${billings.length} | Total Cost: Rs. ${sumTotal.toLocaleString()} | Total Paid: Rs. ${sumPaid.toLocaleString()} | Balance Due: Rs. ${sumDue.toLocaleString()}`],
    [],
    headers,
    ...rows,
    [],
    totalRow,
  ];

  const sheet = XLSX.utils.aoa_to_sheet(sheetData);
  sheet['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 12 },
    { wch: 15 },
    { wch: 16 },
    { wch: 22 },
    { wch: 22 },
    { wch: 16 },
    { wch: 10 },
    { wch: 12 },
    { wch: 8 },
    { wch: 22 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 14 },
    { wch: 16 },
    { wch: 24 },
    { wch: 20 },
  ];

  XLSX.utils.book_append_sheet(workbook, sheet, 'Kathmandu Ledger');

  const filename = `Kathmandu_Billing_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Export dedicated Kathmandu Shipping Manifest to Excel (.xlsx)
 */
export function exportKathmanduShippingManifestToExcel(
  billings: KathmanduBilling[],
  manifestTitle: string = 'Kathmandu Cargo Shipping & Dispatch Manifest'
): void {
  const workbook = XLSX.utils.book_new();

  const headers = [
    'S.N.',
    'KTM Bill No',
    'Customer Ref',
    'AWB / Tracking #',
    'Departure Flight / Carrier Hub',
    'Sender Name (Pokhara)',
    'Sender Phone',
    'Sender Address',
    'Receiver / Consignee Name',
    'Receiver Phone',
    'Receiver Full Address',
    'Destination Country',
    'Transport Mode',
    'Gross Scale Wt (kg)',
    'Net Weight (kg)',
    'Boxes / Pcs',
    'Manifest Cargo Items',
    'Special Cargo Types',
    'Shipping / Transit Status',
    'Dispatch Date',
    'Vehicle No / Transporter',
    'Driver Contact Phone',
  ];

  let sumGrossWeight = 0;
  let sumNetWeight = 0;
  let sumBoxes = 0;

  const rows = billings.map((b, idx) => {
    sumGrossWeight += Number(b.weight) || 0;
    sumNetWeight += Number(b.net_weight || b.weight) || 0;
    sumBoxes += Number(b.box_count) || 1;

    const itemsSummary = (b.items || []).map((it) => `${it.quantity || 1}x ${it.item_name || 'Goods'}`).join(', ');
    const specialTypes = Array.from(new Set((b.items || []).map((it) => it.item_type))).join(', ');

    return [
      idx + 1,
      b.ktm_invoice_no,
      b.customer_invoice_no || '-',
      b.awb_no || 'Pending AWB',
      b.flight_departure || b.forwarder_name || 'TIA KTM Air Hub',
      b.sender_name || 'Sender',
      b.sender_phone || '-',
      b.sender_address || 'Pokhara, Nepal',
      b.receiver_name || 'Receiver',
      b.receiver_phone || '-',
      b.receiver_address || '-',
      b.country || 'International',
      b.transport_type || 'AIR',
      b.weight,
      b.net_weight || b.weight,
      b.box_count || 1,
      itemsSummary || 'General Cargo Goods',
      specialTypes || 'Normal',
      b.shipping_status || 'Pending Dispatch',
      b.dispatch_date || b.ktm_date,
      b.vehicle_no || 'Pokhara-KTM Transport',
      b.driver_phone || '-',
    ];
  });

  const totalRow = [
    'TOTAL',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    Number(sumGrossWeight.toFixed(2)),
    Number(sumNetWeight.toFixed(2)),
    sumBoxes,
    '',
    '',
    '',
    '',
    '',
    '',
  ];

  const sheetData = [
    ['THE COURIER STATION POKHARA - KATHMANDU SHIPPING & DISPATCH MANIFEST (COMPLETE SENDER & RECEIVER DETAILS)'],
    [`Generated: ${new Date().toLocaleString()} | Consignments: ${billings.length} | Gross Cargo Weight: ${sumGrossWeight.toFixed(1)} kg | Boxes: ${sumBoxes}`],
    [],
    headers,
    ...rows,
    [],
    totalRow,
  ];

  const sheet = XLSX.utils.aoa_to_sheet(sheetData);
  sheet['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 15 },
    { wch: 18 },
    { wch: 24 },
    { wch: 22 },
    { wch: 16 },
    { wch: 28 },
    { wch: 24 },
    { wch: 16 },
    { wch: 34 },
    { wch: 16 },
    { wch: 12 },
    { wch: 16 },
    { wch: 16 },
    { wch: 10 },
    { wch: 35 },
    { wch: 18 },
    { wch: 22 },
    { wch: 14 },
    { wch: 22 },
    { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(workbook, sheet, 'Kathmandu Shipping Manifest');

  const filename = `Kathmandu_Shipping_Manifest_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Clean Customer Shipping List Excel export (excludes internal purchase rates & forwarder costs)
 */
export function exportCustomerShippingListToExcel(billings: KathmanduBilling[]): void {
  const workbook = XLSX.utils.book_new();

  const headers = [
    'S.N.',
    'AWB / Tracking #',
    'Customer Invoice Ref',
    'Sender Name',
    'Sender Phone',
    'Sender Address',
    'Receiver / Consignee',
    'Receiver Phone',
    'Receiver Address',
    'Destination Country',
    'Transport Mode',
    'Gross Weight (kg)',
    'Box Count',
    'Package Contents & Goods Description',
    'Item Categories',
    'Dispatch Date',
    'Shipping Status',
  ];

  let sumGrossWeight = 0;
  let sumBoxes = 0;

  const rows = billings.map((b, idx) => {
    sumGrossWeight += Number(b.weight) || 0;
    sumBoxes += Number(b.box_count) || 1;

    const itemsSummary = (b.items || [])
      .map((it) => `${it.quantity || 1}x ${it.item_name || 'Goods'}`)
      .join(', ');

    const specialTypes = Array.from(new Set((b.items || []).map((it) => it.item_type || 'Normal'))).join(', ');

    return [
      idx + 1,
      b.awb_no || 'Pending AWB',
      b.customer_invoice_no || b.ktm_invoice_no,
      b.sender_name || 'Sender',
      b.sender_phone || '-',
      b.sender_address || 'Pokhara, Nepal',
      b.receiver_name || 'Consignee',
      b.receiver_phone || '-',
      b.receiver_address || '-',
      b.country || 'Nepal',
      b.transport_type || 'AIR',
      b.weight,
      b.box_count || 1,
      itemsSummary || 'General Cargo Goods',
      specialTypes || 'Normal',
      b.dispatch_date || b.ktm_date,
      b.shipping_status || 'In Transit to KTM Hub',
    ];
  });

  const totalRow = [
    'TOTAL',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    Number(sumGrossWeight.toFixed(2)),
    sumBoxes,
    '',
    '',
    '',
    '',
  ];

  const sheetData = [
    ['THE COURIER STATION POKHARA - CUSTOMER CARGO SHIPPING LIST & CONSIGNMENT DISPATCH MANIFEST'],
    [`Generated: ${new Date().toLocaleDateString()} | Total Consignments: ${billings.length} | Gross Cargo Weight: ${sumGrossWeight.toFixed(1)} kg | Total Packages: ${sumBoxes}`],
    [],
    headers,
    ...rows,
    [],
    totalRow,
  ];

  const sheet = XLSX.utils.aoa_to_sheet(sheetData);
  sheet['!cols'] = [
    { wch: 6 },
    { wch: 20 },
    { wch: 20 },
    { wch: 24 },
    { wch: 16 },
    { wch: 28 },
    { wch: 24 },
    { wch: 16 },
    { wch: 34 },
    { wch: 18 },
    { wch: 14 },
    { wch: 16 },
    { wch: 12 },
    { wch: 38 },
    { wch: 18 },
    { wch: 16 },
    { wch: 24 },
  ];

  XLSX.utils.book_append_sheet(workbook, sheet, 'Customer Shipping List');

  const filename = `Customer_Shipping_List_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
}


