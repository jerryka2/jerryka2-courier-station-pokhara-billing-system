import React from 'react';
import { Invoice, PDFVersion } from '../types';
import {
  formatCurrency,
  getInvoicePurchaseBreakdown,
  getInvoiceWeightBreakdown,
  isAustraliaCountry,
  isUSACanadaCountry,
} from '../lib/rateCalculator';
import { LOGO_URL, COMPANY_DETAILS } from '../assets/logo';
import { Globe, Package, Mail, Phone, MapPin, CheckCircle2 } from 'lucide-react';

interface PrintDocumentProps {
  invoice: Invoice;
  version: PDFVersion;
}

export const PrintDocument = React.forwardRef<HTMLDivElement, PrintDocumentProps>(
  ({ invoice, version }, ref) => {
    const purchaseBreakdown = getInvoicePurchaseBreakdown(invoice);
    const wb = getInvoiceWeightBreakdown(invoice);
    const defaultDutyPerBox = isAustraliaCountry(invoice.country) ? 1500 : (isUSACanadaCountry(invoice.country) ? 750 : 500);
    const customDuty = invoice.custom_duty_amount ?? (defaultDutyPerBox * (invoice.box_count || 1));
    const discountAmount = invoice.discount_amount || 0;
    const saleAmount = invoice.sale_amount;
    const finalAmount = Math.max(0, saleAmount + customDuty - discountAmount);
    const totalPurchase = invoice.purchase_amount;
    const profitAmount = invoice.profit_amount ?? (finalAmount - totalPurchase);
    const ratePerKg = invoice.rate_per_kg || (wb.billableWeight ? saleAmount / wb.billableWeight : 0);
    const safeItems = invoice.items || [];

    // Shipper & Company Entity Resolution
    const shipperName = invoice.shipper_name || COMPANY_DETAILS.name;
    const shipperTagline = invoice.shipper_name ? 'Authorized Carrier Forwarder & Express Desk' : COMPANY_DETAILS.tagline;
    const shipperAddress = invoice.shipper_address || COMPANY_DETAILS.address;
    const shipperPhone = invoice.shipper_phone || COMPANY_DETAILS.phone;
    const companyEmail = invoice.shipper_email || COMPANY_DETAILS.email;
    const portOfLoading = invoice.port_of_loading || COMPANY_DETAILS.portOfLoading;

    return (
      <div
        ref={ref}
        className="w-[210mm] min-h-[297mm] p-8 bg-white text-slate-900 font-sans mx-auto text-sm print:p-6 print:w-full print:bg-white"
        style={{ boxSizing: 'border-box' }}
      >
        {/* Company Professional Header Block */}
        <div className="border-b-2 border-slate-900 pb-5 mb-5">
          <div className="flex justify-between items-start gap-4">
            {/* Brand Logo & Station Details */}
            <div className="flex items-start gap-4">
              <img
                src={LOGO_URL}
                alt="The Courier Station Sadobato Logo"
                className="w-16 h-16 object-contain rounded-lg border border-slate-300 bg-white p-1 shadow-2xs shrink-0"
                referrerPolicy="no-referrer"
              />
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-950 uppercase font-sans">
                  {shipperName}
                </h1>
                <p className="text-[11px] font-semibold text-slate-700 tracking-wide mt-0.5">
                  {shipperTagline}
                </p>
                <div className="text-xs text-slate-600 space-y-0.5 mt-1">
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{shipperAddress}</span>
                  </p>
                  <p className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5 text-slate-400" />
                      {shipperPhone}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="w-2.5 h-2.5 text-slate-400" />
                      <strong className="text-slate-700">{companyEmail}</strong>
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Document Version & Invoice Metadata */}
            <div className="text-right flex flex-col items-end">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-900 text-white font-bold text-xs uppercase rounded tracking-wider">
                <Globe className="w-3 h-3 text-slate-300" />
                {version === 'billing_v1' && 'Internal Billing V1 (Full)'}
                {version === 'billing_v2' && 'Internal Billing V2 (Simple)'}
                {version === 'customer' && 'Official Commercial Invoice'}
                {version === 'item_list' && 'Shipment Packing Manifest'}
              </span>
              <div className="mt-2 text-xs text-slate-700 bg-slate-50 px-3 py-1.5 rounded border border-slate-200 text-right space-y-0.5">
                <p>
                  <span className="text-slate-500">Invoice No:</span>{' '}
                  <span className="font-mono font-bold text-slate-950">{invoice.invoice_no}</span>
                </p>
                <p>
                  <span className="text-slate-500">Issue Date:</span> <span className="font-medium text-slate-900">{invoice.invoice_date}</span>
                </p>
                {invoice.awb_no && (
                  <p>
                    <span className="text-slate-500">AWB Tracking:</span> <span className="font-mono font-bold text-slate-900">{invoice.awb_no}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CUSTOMER INVOICE VERSION */}
        {/* ========================================================================= */}
        {version === 'customer' && (
          <div className="space-y-5">
            {/* Shipment Specifications & Address Info Header */}
            <div className="grid grid-cols-2 gap-4 text-xs text-slate-700">
              {/* Shipper & Sender Info (Left) */}
              <div className="space-y-2 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                  <h3 className="font-bold text-slate-950 text-xs uppercase tracking-wider">
                    Sender / Shipper Information
                  </h3>
                  <span className="text-[10px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-mono font-semibold">Origin</span>
                </div>
                <div className="space-y-1 text-[11.5px]">
                  <p>
                    <span className="text-slate-500">Sender Name:</span>{' '}
                    <strong className="text-slate-950">{invoice.sender_name}</strong>
                  </p>
                  {invoice.sender_phone && (
                    <p>
                      <span className="text-slate-500">Sender Mobile:</span>{' '}
                      <strong className="text-slate-900 font-mono">{invoice.sender_phone}</strong>
                    </p>
                  )}
                  {invoice.sender_address && (
                    <p>
                      <span className="text-slate-500">Address:</span>{' '}
                      <span className="text-slate-800">{invoice.sender_address}</span>
                    </p>
                  )}
                  {invoice.sender_email && (
                    <p>
                      <span className="text-slate-500">Sender Email:</span>{' '}
                      <span className="font-medium text-slate-900">{invoice.sender_email}</span>
                    </p>
                  )}
                  <p>
                    <span className="text-slate-500">Station Phone:</span>{' '}
                    <span className="text-slate-800">{shipperPhone}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">Port of Loading:</span>{' '}
                    <span className="text-slate-800 font-medium">{portOfLoading}</span>
                  </p>
                </div>
              </div>

              {/* Consignee / Receiver Info (Right) */}
              <div className="space-y-2 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                  <h3 className="font-bold text-slate-950 text-xs uppercase tracking-wider">
                    Consignee / Destination
                  </h3>
                  <span className="text-[10px] bg-slate-900 text-white px-2 py-0.5 rounded font-mono font-semibold">Receiver</span>
                </div>
                <div className="space-y-1 text-[11.5px]">
                  <p>
                    <span className="text-slate-500">Receiver Name:</span>{' '}
                    <strong className="text-slate-950">{invoice.receiver_name}</strong>
                  </p>
                  {invoice.receiver_address && (
                    <p className="leading-snug">
                      <span className="text-slate-500">Delivery Address:</span>{' '}
                      <span className="text-slate-900 font-medium">{invoice.receiver_address}</span>
                    </p>
                  )}
                  <p>
                    <span className="text-slate-500">Consignee Email:</span>{' '}
                    <span className="font-medium text-slate-900">{invoice.receiver_email || 'N/A'}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">Contact Phone:</span>{' '}
                    <strong className="text-slate-950">{invoice.receiver_phone || invoice.phone}</strong>
                  </p>
                  <p>
                    <span className="text-slate-500">Destination:</span>{' '}
                    <strong className="text-slate-950 underline">{invoice.country}</strong>
                  </p>
                  {invoice.pcc_number && (
                    <p className="pt-0.5">
                      <span className="text-slate-500">PCC Clearance Code:</span>{' '}
                      <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-slate-300 text-slate-900">{invoice.pcc_number}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Shipment Key Metrics Ribbon */}
            <div className="bg-slate-900 text-white rounded-lg p-2.5 px-4 flex flex-wrap justify-between items-center gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-300 uppercase font-semibold">Chargeable Weight:</span>
                <span className="font-mono font-bold text-sm text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  {wb.billableWeight} kg
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-300">Net Scale:</span>
                <span className="font-mono font-semibold text-white bg-slate-800 px-1.5 py-0.5 rounded">{wb.netWeight} kg</span>
                <span className="text-slate-300 ml-1">Volumetric:</span>
                <span className="font-mono font-semibold text-white bg-slate-800 px-1.5 py-0.5 rounded">{wb.volumeWeight} kg</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-300 uppercase font-semibold">Boxes:</span>
                <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  {invoice.box_count} Box(es)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-slate-700 text-white px-2 py-0.5 rounded font-semibold text-[11px] uppercase">
                  {invoice.transport_type || 'AIR FREIGHT'}
                </span>
              </div>
            </div>

            {/* Subtotal & Financial Billing Breakdown Stack */}
            <div className="flex justify-between items-start pt-1 gap-5">
              {/* Operational note & Payment Settlement */}
              <div className="flex-1 space-y-3">
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1 text-xs">
                  <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wide">
                    Consignment Handling & Priority Care
                  </h4>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    This parcel is registered under authorized international courier regulations. For tracking inquiries, quote invoice #{invoice.invoice_no}.
                  </p>
                  <p className="text-[11px] text-slate-500 pt-1">
                    Support Email: <strong className="text-slate-800">{companyEmail}</strong>
                  </p>
                </div>

                {/* Payment Settlement Box */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] space-y-1 text-slate-700">
                  <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-200 pb-1 flex justify-between items-center">
                    <span>Payment Settlement</span>
                    <span className="font-normal text-[10px] text-slate-500">Verified</span>
                  </h5>
                  <div className="text-[11px] space-y-1 pt-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Payment Mode:</span>
                      <strong className="text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">{invoice.payment_method || 'Cash'}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Payment Status:</span>
                      <strong className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                        (invoice.payment_status || 'Paid') === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : (invoice.payment_status || 'Paid') === 'Unpaid'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {invoice.payment_status || 'Paid'}
                      </strong>
                    </div>
                    {invoice.online_transaction_id && (
                      <div className="flex items-center justify-between pt-0.5 border-t border-slate-200">
                        <span className="text-slate-500">Txn Ref / Remarks:</span>
                        <strong className="text-slate-900 font-mono text-[10.5px]">{invoice.online_transaction_id}</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Aligned Transparent Financial Calculation Table */}
              <div className="w-80 space-y-1.5 text-xs bg-white p-3.5 rounded-lg border border-slate-300 shadow-2xs">
                <h5 className="font-bold text-slate-950 uppercase tracking-wider text-[11px] border-b border-slate-200 pb-1">
                  Billing & Payable Summary
                </h5>

                {/* Unit Rate per kg */}
                <div className="flex justify-between items-center py-1 text-slate-600">
                  <span>Unit Deal Rate:</span>
                  <span className="font-mono text-slate-900 font-semibold">{formatCurrency(ratePerKg)} / kg</span>
                </div>

                {/* Main Air Freight Charge */}
                {(() => {
                  const meatExtra = invoice.meat_extra_charge || 0;
                  const baseFreight = Math.max(0, saleAmount - meatExtra);
                  return (
                    <>
                      <div className="flex justify-between items-center py-1 text-slate-700 font-medium border-t border-slate-100">
                        <span>Main Freight ({invoice.weight} kg):</span>
                        <span className="font-mono text-slate-900 font-semibold">{formatCurrency(baseFreight)}</span>
                      </div>

                      {/* Meat / Special Charge */}
                      {meatExtra > 0 && (
                        <div className="flex justify-between items-center py-1 text-amber-900 font-semibold bg-amber-50 px-2 rounded border border-amber-200">
                          <span>Meat / Sukuti Surcharge:</span>
                          <span className="font-mono">+ {formatCurrency(meatExtra)}</span>
                        </div>
                      )}

                      {/* Subtotal */}
                      <div className="flex justify-between items-center py-1 text-slate-800 font-semibold border-t border-slate-100">
                        <span>Freight Subtotal:</span>
                        <span className="font-mono text-slate-900">{formatCurrency(saleAmount)}</span>
                      </div>
                    </>
                  );
                })()}

                {/* Custom Duty Charge */}
                <div className="flex justify-between items-center py-1 text-slate-700 font-medium border-t border-slate-100">
                  <span>Custom Clearance Duty:</span>
                  <span className="font-mono text-slate-900 font-semibold">+ {formatCurrency(customDuty)}</span>
                </div>

                {/* Applied Discount */}
                {discountAmount > 0 && (
                  <div className="flex justify-between items-center py-1 text-emerald-700 font-semibold border-t border-slate-100">
                    <span>Discount Applied:</span>
                    <span className="font-mono">- {formatCurrency(discountAmount)}</span>
                  </div>
                )}

                {/* Prominent TOTAL DUE Banner */}
                <div className="bg-slate-900 text-white rounded p-2.5 flex justify-between items-center mt-2">
                  <span className="font-bold uppercase tracking-wider text-xs">TOTAL DUE AMOUNT:</span>
                  <span className="text-lg font-bold font-mono text-amber-300">
                    {formatCurrency(finalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Terms & Signature Section */}
            <div className="border-t border-slate-300 pt-3 space-y-3">
              <div className="grid grid-cols-3 gap-4 text-[10px] text-slate-600 leading-tight">
                <div className="space-y-0.5">
                  <strong className="text-slate-900 block font-semibold text-[10.5px]">Address Correction</strong>
                  <p>Correction fee €30 (EU) / $20 per parcel billed if address is invalid.</p>
                </div>
                <div className="space-y-0.5">
                  <strong className="text-slate-900 block font-semibold text-[10.5px]">Lost Parcel Claim</strong>
                  <p>Maximum liability capped at 100 USD + courier freight refund.</p>
                </div>
                <div className="space-y-0.5">
                  <strong className="text-slate-900 block font-semibold text-[10.5px]">Customs & Delays</strong>
                  <p>No liability for delays caused by airline space, weather or customs inspection.</p>
                </div>
              </div>

              {/* Stamp & Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-1">
                <div className="border border-slate-300 rounded h-16 p-2 flex flex-col justify-end text-center bg-slate-50/50">
                  <div className="border-t border-slate-400 pt-0.5">
                    <span className="text-[10px] font-semibold text-slate-700 uppercase">
                      Customer Signature
                    </span>
                  </div>
                </div>
                <div className="border border-slate-300 rounded h-16 p-2 flex flex-col justify-end text-center bg-slate-50/50">
                  <div className="border-t border-slate-400 pt-0.5">
                    <span className="text-[10px] font-semibold text-slate-700 uppercase">
                      Authorized Signatory ({shipperName})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* DETAILS FOR BILLING V1, BILLING V2, AND ITEM LIST */}
        {/* ========================================================================= */}
        {version !== 'customer' && (
          <div className="space-y-5">
            {/* Shipment Grid */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 grid grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Sender Name:</span>
                <strong className="text-slate-950 text-sm">{invoice.sender_name}</strong>
                {invoice.sender_phone && (
                  <span className="text-slate-800 block text-[11px] font-mono font-bold">{invoice.sender_phone}</span>
                )}
                {invoice.sender_email && (
                  <span className="text-slate-500 block text-[10.5px]">{invoice.sender_email}</span>
                )}
              </div>
              <div>
                <span className="text-slate-500 block">Receiver Details:</span>
                <strong className="text-slate-950 text-sm">{invoice.receiver_name}</strong>
                {invoice.receiver_address && (
                  <span className="text-slate-700 block text-[11px] font-medium leading-tight mt-0.5">{invoice.receiver_address}</span>
                )}
                {invoice.receiver_email && (
                  <span className="text-slate-600 block text-[10.5px]">{invoice.receiver_email}</span>
                )}
              </div>
              <div>
                <span className="text-slate-500 block">Contact Phone:</span>
                <span className="text-slate-800 font-medium">{invoice.receiver_phone || invoice.phone}</span>
                <span className="text-slate-500 block text-[10.5px] mt-1">Shipper Entity:</span>
                <strong className="text-slate-900 text-[11px]">{shipperName}</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Destination:</span>
                <strong className="text-slate-950 text-sm">{invoice.country}</strong>
                <span className="text-slate-600 block text-[11px]">Mode: {invoice.transport_type}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Net Scale Weight:</span>
                <strong className="text-slate-950 text-sm">{wb.netWeight} kg</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Volumetric Weight:</span>
                <strong className="text-slate-950 text-sm">{wb.volumeWeight} kg</strong>
              </div>
              <div>
                <span className="text-slate-500 block">Chargeable Weight:</span>
                <span className="text-slate-950 font-bold bg-white px-2 py-0.5 rounded border border-slate-300 inline-block">
                  {wb.billableWeight} kg
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Box Count:</span>
                <span className="text-slate-900 font-semibold">{invoice.box_count} Box(es)</span>
              </div>
            </div>

            {/* Volume Profit Gain Callout */}
            {wb.isVolumetricCharged && (
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-2 px-3 text-xs text-amber-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold">Volume Profit Margin:</span>
                  <span>
                    Volumetric Weight ({wb.volumeWeight} kg) exceeds Net Scale Weight ({wb.netWeight} kg) by{' '}
                    <strong>+{wb.volumeProfitWeight} kg</strong>.
                  </span>
                </div>
                <span className="font-mono font-bold text-amber-950 bg-amber-200 px-2 py-0.5 rounded">
                  + {formatCurrency(wb.volumeProfitAmount)} Volume Margin
                </span>
              </div>
            )}

            {/* ITEM TABLE (With Net Weight Column) */}
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex justify-between items-center">
                <span>Shipment Items Manifest ({safeItems.length})</span>
                <span className="text-[11px] font-medium text-slate-500">
                  Total Net Scale: <strong className="text-slate-900">{wb.netWeight} kg</strong>
                </span>
              </h2>
              <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold">
                    <th className="p-2 border-r border-slate-300">#</th>
                    <th className="p-2 border-r border-slate-300">Box #</th>
                    <th className="p-2 border-r border-slate-300">Item Name / Description</th>
                    <th className="p-2 border-r border-slate-300">Quantity</th>
                    <th className="p-2 border-r border-slate-300">Category</th>
                    <th className="p-2">Net Weight (kg)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {safeItems.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50">
                      <td className="p-2 border-r border-slate-200 text-slate-500 font-medium">
                        {idx + 1}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-slate-700 font-mono text-[11px]">
                        Box #{item.box_number || 1}
                      </td>
                      <td className="p-2 border-r border-slate-200 font-medium text-slate-950">
                        {item.item_name}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-slate-800">
                        {item.quantity}
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10.5px] font-medium bg-slate-100 text-slate-800 border border-slate-200">
                          {item.item_type}
                        </span>
                      </td>
                      <td className="p-2 text-slate-800 font-medium">
                        {item.weight_kg ? `${item.weight_kg} kg` : 'Included in Net Wt'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* TOTALS SECTION FOR BILLING V1 & V2 */}
            {version === 'billing_v1' && (
              <div className="pt-2 flex justify-end">
                <div className="w-88 border border-slate-300 rounded-lg p-3.5 bg-slate-50 space-y-1.5 text-xs">
                  <h3 className="font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1 mb-1.5 flex justify-between items-center">
                    <span>Full Billing & Profit Audit</span>
                    <span className="text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-mono">
                      V1 Audit
                    </span>
                  </h3>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Rate / kg:</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(ratePerKg)} / kg</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Net Scale Weight:</span>
                    <span className="font-semibold text-slate-800">{wb.netWeight} kg</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Volumetric Weight:</span>
                    <span className="font-semibold text-slate-800">{wb.volumeWeight} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Freight Subtotal ({wb.billableWeight} kg):</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(saleAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Custom Clearance Duty:</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(customDuty)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Discount:</span>
                      <span>- {formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-200 pt-1.5 text-slate-600">
                    <span>Freight Purchase Cost:</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(purchaseBreakdown.freightPurchase)}</span>
                  </div>
                  {purchaseBreakdown.customPurchaseCost > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Custom Purchase ({isAustraliaCountry(invoice.country) ? 'Aus 500/box' : 'USA/Can 750/box'}):</span>
                      <span className="font-semibold text-amber-800">+ {formatCurrency(purchaseBreakdown.customPurchaseCost)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Total Carrier Cost:</span>
                    <span>{formatCurrency(totalPurchase)}</span>
                  </div>
                  <div className="border-t border-slate-300 pt-1.5 flex justify-between font-bold text-sm">
                    <span className="text-slate-950">Net Payable Amount:</span>
                    <span className="text-slate-950">{formatCurrency(finalAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-emerald-700 border-t border-slate-200 pt-1.5">
                    <span>Net Station Margin:</span>
                    <span>{formatCurrency(profitAmount)}</span>
                  </div>
                </div>
              </div>
            )}

            {version === 'billing_v2' && (
              <div className="pt-2 flex justify-end">
                <div className="w-80 border border-slate-300 rounded-lg p-3.5 bg-slate-50 space-y-1.5 text-xs">
                  <h3 className="font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1 mb-1.5">
                    Internal Totals Summary
                  </h3>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Rate / kg:</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(ratePerKg)} / kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Freight Subtotal:</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(saleAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Custom Clearance Duty:</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(customDuty)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Discount:</span>
                      <span>- {formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-300 pt-1.5 flex justify-between font-bold text-sm text-slate-950">
                    <span>Net Payable Amount:</span>
                    <span className="text-emerald-700">{formatCurrency(finalAmount)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Professional Computer Generated Footer */}
        <div className="mt-8 text-center text-[10px] text-slate-500 border-t border-slate-200 pt-3">
          Official Carrier Documentation • {shipperName} • Email: {companyEmail} • Tel: {shipperPhone} • {shipperAddress}
        </div>
      </div>
    );
  }
);

PrintDocument.displayName = 'PrintDocument';
