import React, { useState, useRef } from 'react';
import { Invoice, UserRole, PDFVersion } from '../types';
import {
  formatCurrency,
  getInvoiceWeightBreakdown,
  getInvoiceMeatBreakdown,
} from '../lib/rateCalculator';
import { downloadInvoicePDF } from '../lib/pdfGenerator';
import {
  exportInvoiceToExcel,
  exportPurchaseListBreakdownToExcel,
  exportSalesDocumentationToExcel,
  exportMeatDocumentationToExcel,
} from '../lib/excelExporter';
import { PrintDocument } from './PrintDocument';
import { useReactToPrint } from 'react-to-print';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Printer,
  Download,
  ChevronDown,
  AlertTriangle,
  FileText,
  Package,
  FileSpreadsheet,
  Truck,
  CheckCircle2,
  TrendingUp,
  Layers,
  Scale,
  Building2,
  Phone,
  MessageSquare,
  Share2,
  Copy,
  Check,
} from 'lucide-react';
import {
  formatPhoneForWhatsApp,
  generateCustomerTrackingMessage,
  getWhatsAppTrackingUrl,
  getSmsTrackingUrl,
} from '../lib/trackingUtils';

interface InvoiceDetailProps {
  invoice: Invoice;
  role: UserRole | null;
  onBack: () => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (invoiceId: string) => void;
  onDispatchInvoices?: (
    invoiceIds: string[],
    dispatchDate?: string,
    awbNo?: string,
    notes?: string
  ) => void;
  onGenerateKtmBill?: (customerInvoiceId: string) => void;
}

export const InvoiceDetail: React.FC<InvoiceDetailProps> = ({
  invoice,
  role,
  onBack,
  onEdit,
  onDelete,
  onDispatchInvoices,
  onGenerateKtmBill,
}) => {
  const [selectedVersion, setSelectedVersion] = useState<PDFVersion>('billing_v1');
  const [downloadDropdownOpen, setDownloadDropdownOpen] = useState(false);
  const [excelDropdownOpen, setExcelDropdownOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const wb = getInvoiceWeightBreakdown(invoice);

  const customerPhone = invoice.sender_phone || invoice.phone || '';
  const trackingMessage = generateCustomerTrackingMessage(invoice);
  const whatsappUrl = getWhatsAppTrackingUrl(invoice);
  const smsUrl = getSmsTrackingUrl(invoice);

  const handleCopyTrackingMessage = async () => {
    try {
      await navigator.clipboard.writeText(trackingMessage);
      setCopiedTracking(true);
      setTimeout(() => setCopiedTracking(false), 2500);
    } catch (e) {
      console.error('Failed to copy tracking message:', e);
    }
  };

  // react-to-print hook
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${invoice.invoice_no}_${selectedVersion}`,
  });

  const handleDownload = (version: PDFVersion) => {
    downloadInvoicePDF(invoice, version);
    setDownloadDropdownOpen(false);
  };

  const isDispatched = invoice.status === 'Dispatched';

  const handleQuickDispatch = () => {
    if (onDispatchInvoices) {
      const todayStr = new Date().toISOString().split('T')[0];
      onDispatchInvoices([invoice.id], todayStr);
    }
  };

  const customDuty = invoice.custom_duty_amount ?? (500 * (invoice.box_count || 1));
  const discountAmount = invoice.discount_amount || 0;
  const finalAmount = Math.max(0, invoice.sale_amount + customDuty - discountAmount);
  const ratePerKg = invoice.rate_per_kg || (wb.billableWeight ? invoice.sale_amount / wb.billableWeight : 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Navigation & Prominent Action Toolbar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
              title="Back to Invoice List"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold font-mono text-slate-900">
                  {invoice.invoice_no}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {invoice.country}
                </span>
                {isDispatched ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Dispatched ({invoice.dispatch_date})</span>
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>Billed</span>
                    </span>
                    <button
                      onClick={handleQuickDispatch}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-emerald-600 hover:text-white transition cursor-pointer"
                      title="Click to dispatch with today's automatic date"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Dispatch Now (Auto Date)</span>
                    </button>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Issued on {invoice.invoice_date} • {invoice.sender_name} to {invoice.receiver_name}
                {invoice.receiver_address && <span className="text-slate-700 font-medium"> ({invoice.receiver_address})</span>}
              </p>
            </div>
          </div>

          {/* Prominent Toolbar with Dedicated Quick Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Customer Bill Button */}
            <button
              onClick={() => {
                setSelectedVersion('customer');
                setTimeout(() => handlePrint(), 100);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer"
              title="Print Customer Bill"
            >
              <Printer className="w-4 h-4" />
              <span>Print Customer Bill</span>
            </button>

            {/* Quick Shipper Packing List Button */}
            <button
              onClick={() => {
                setSelectedVersion('item_list');
                setTimeout(() => handlePrint(), 100);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer"
              title="Print Shipper / Carrier Manifest"
            >
              <Package className="w-4 h-4" />
              <span>Print Shipper Item List</span>
            </button>

            {/* Create Kathmandu Bill Button */}
            {onGenerateKtmBill && (
              <button
                onClick={() => onGenerateKtmBill(invoice.id)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-blue-300 border border-blue-500/40 font-bold text-xs rounded-lg transition shadow-xs cursor-pointer"
                title="Create Kathmandu Forwarder Bill for this shipment"
              >
                <Building2 className="w-4 h-4 text-blue-400" />
                <span>+ Kathmandu Bill</span>
              </button>
            )}

            {/* Excel Documentation Dropdown */}
            <div className="relative">
              <button
                onClick={() => setExcelDropdownOpen(!excelDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer"
                title="Excel Exports & Sales Documentation"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Excel</span>
                <ChevronDown className="w-3.5 h-3.5 text-emerald-200 ml-0.5" />
              </button>

              {excelDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Excel Documentation Reports
                  </div>
                  <button
                    onClick={() => {
                      exportSalesDocumentationToExcel([invoice]);
                      setExcelDropdownOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-indigo-700 hover:bg-indigo-50 font-bold transition flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-indigo-600" />
                      <span>Sales Documentation (.xlsx)</span>
                    </div>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-mono">
                      Sales & Profit
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      exportMeatDocumentationToExcel([invoice]);
                      setExcelDropdownOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-amber-800 hover:bg-amber-50 font-bold transition flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                      <span>Meat Clearance Manifest (.xlsx)</span>
                    </div>
                    <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-mono font-bold">
                      🥩 Sukuti
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      exportPurchaseListBreakdownToExcel([invoice]);
                      setExcelDropdownOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-amber-700 hover:bg-amber-50 font-bold transition flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                      <span>Purchase Bill Breakdown (.xlsx)</span>
                    </div>
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono">
                      Net Wt
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      exportInvoiceToExcel(invoice);
                      setExcelDropdownOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-emerald-700 hover:bg-emerald-50 font-bold transition flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>Single Invoice Full Sheet (.xlsx)</span>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono">
                      Full
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Download PDF Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDownloadDropdownOpen(!downloadDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-300 ml-0.5" />
              </button>

              {downloadDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Select Document Version
                  </div>
                  <button
                    onClick={() => handleDownload('customer')}
                    className="w-full text-left px-3.5 py-2 text-xs text-blue-700 hover:bg-blue-50 font-bold transition flex items-center justify-between cursor-pointer"
                  >
                    <span>📄 Customer Bill (For Customer)</span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">PDF</span>
                  </button>
                  <button
                    onClick={() => handleDownload('item_list')}
                    className="w-full text-left px-3.5 py-2 text-xs text-amber-700 hover:bg-amber-50 font-bold transition flex items-center justify-between cursor-pointer"
                  >
                    <span>📦 Shipper Item List (For Carrier)</span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">PDF</span>
                  </button>
                  <div className="border-t border-slate-100 my-1"></div>
                  <button
                    onClick={() => handleDownload('billing_v1')}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-100 font-semibold transition cursor-pointer"
                  >
                    Internal Billing V1 (Full Detail)
                  </button>
                  <button
                    onClick={() => handleDownload('billing_v2')}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-100 font-semibold transition cursor-pointer"
                  >
                    Internal Billing V2 (Simple Detail)
                  </button>
                </div>
              )}
            </div>

            {/* Edit Button */}
            <button
              onClick={() => onEdit(invoice)}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg transition cursor-pointer"
            >
              <Edit className="w-4 h-4 text-slate-500" />
              <span>Edit</span>
            </button>

            {/* Delete Button (Admin restricted) */}
            <button
              onClick={() => role === 'admin' && setShowDeleteModal(true)}
              disabled={role !== 'admin'}
              title={role === 'admin' ? 'Delete Invoice' : 'Admin privilege required to delete'}
              className={`flex items-center gap-1.5 px-2.5 py-2 border rounded-lg text-xs font-semibold transition ${
                role === 'admin'
                  ? 'border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer'
                  : 'border-slate-200 text-slate-400 opacity-50 cursor-not-allowed'
              }`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Version Preview Selector Tabs */}
        <div className="pt-3 border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-slate-500 font-bold uppercase text-[10px] mr-2 shrink-0">Document View:</span>
          {[
            { id: 'customer', label: '📄 Customer Bill (For Customer)' },
            { id: 'item_list', label: '📦 Shipper Packing List (For Carrier)' },
            { id: 'billing_v1', label: '📊 Sales & Profit Audit Documentation (V1)' },
            { id: 'billing_v2', label: '📋 Internal Billing V2 (Simple)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedVersion(tab.id as PDFVersion)}
              className={`px-3 py-1.5 rounded-lg font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                selectedVersion === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Customer Mobile & AWB Tracking Notification Card */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 sm:p-5 rounded-xl border border-blue-800 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-wider">
                📱 Customer Mobile & Tracking Code
              </span>
              {invoice.awb_no ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  AWB: {invoice.awb_no}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  AWB Tracking Pending
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm pt-1">
              <span className="font-semibold text-slate-300">Customer (Sender):</span>
              <span className="font-bold text-white">{invoice.sender_name}</span>
              <span className="text-slate-400 font-mono font-bold flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded">
                <Phone className="w-3.5 h-3.5 text-blue-400" />
                {customerPhone || 'No mobile saved'}
              </span>
            </div>

            <div className="text-xs text-slate-300 flex items-center gap-2 flex-wrap">
              <span>Destination: <strong className="text-white">{invoice.country}</strong></span>
              <span>•</span>
              <span>Receiver: <strong className="text-white">{invoice.receiver_name}</strong></span>
              {invoice.receiver_address && (
                <>
                  <span>•</span>
                  <span className="text-slate-300 truncate max-w-sm">📍 {invoice.receiver_address}</span>
                </>
              )}
            </div>
          </div>

          {/* Quick Tracking Dispatch Buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* WhatsApp Send Button */}
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-lg transition shadow-xs cursor-pointer"
                title={`Send tracking code & invoice details to WhatsApp (${customerPhone})`}
              >
                <MessageSquare className="w-4 h-4 fill-slate-950 text-emerald-500" />
                <span>WhatsApp Tracking</span>
              </a>
            ) : (
              <button
                disabled
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 text-slate-500 font-semibold text-xs rounded-lg opacity-60 cursor-not-allowed"
                title="Add customer phone number to send WhatsApp tracking"
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp Tracking</span>
              </button>
            )}

            {/* SMS Send Button */}
            {smsUrl ? (
              <a
                href={smsUrl}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer"
                title={`Send SMS tracking code to customer phone (${customerPhone})`}
              >
                <Phone className="w-4 h-4" />
                <span>Send SMS</span>
              </a>
            ) : null}

            {/* Copy Tracking Text Button */}
            <button
              onClick={handleCopyTrackingMessage}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs rounded-lg transition cursor-pointer"
              title="Copy formatted customer tracking SMS message to clipboard"
            >
              {copiedTracking ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span>Copy Tracking SMS</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Payment Settlement Status Banner */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-extrabold text-lg shrink-0">
            {(invoice.payment_method || 'Cash') === 'Cash' ? '💵' : (invoice.payment_method || 'Cash') === 'Online / Fonepay / QR' ? '📱' : (invoice.payment_method || 'Cash') === 'Bank Transfer' ? '🏦' : '⏳'}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 font-extrabold uppercase">Payment Mode:</span>
              <span className="text-sm font-extrabold text-slate-900">{invoice.payment_method || 'Cash'}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase ${
                (invoice.payment_status || 'Paid') === 'Paid'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : (invoice.payment_status || 'Paid') === 'Unpaid'
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {invoice.payment_status || 'Paid'}
              </span>
            </div>
            {invoice.online_transaction_id ? (
              <p className="text-xs text-slate-600 font-mono mt-0.5">
                Txn Ref / Remarks: <span className="font-bold text-slate-900">{invoice.online_transaction_id}</span>
              </p>
            ) : (
              <p className="text-[11px] text-slate-400 mt-0.5">
                Settled at billing counter
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 block font-extrabold uppercase">Total Due Amount</span>
          <span className="text-lg font-black text-emerald-600">{formatCurrency(finalAmount)}</span>
        </div>
      </div>

      {/* Summary Cards Grid with Weight Differentiations */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Net Weight Card */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-500 font-bold block uppercase flex items-center justify-between">
            <span>Net Scale Wt</span>
            <Scale className="w-3 h-3 text-slate-400" />
          </span>
          <span className="text-base font-extrabold text-slate-900">{wb.netWeight} kg</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Physical Scale</span>
        </div>

        {/* Volume Weight Card */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-slate-500 font-bold block uppercase flex items-center justify-between">
            <span>Volume Wt</span>
            <Layers className="w-3 h-3 text-indigo-400" />
          </span>
          <span className="text-base font-extrabold text-slate-900">{wb.volumeWeight} kg</span>
          {wb.isVolumetricCharged ? (
            <span className="text-[10px] text-amber-600 font-bold block mt-0.5">
              +{wb.volumeProfitWeight} kg Profit Gain
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 block mt-0.5">L x W x H / 5000</span>
          )}
        </div>

        {/* Chargeable Weight & Rate Card */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-blue-600 font-bold block uppercase">Chargeable Weight</span>
          <span className="text-base font-extrabold text-blue-900">{wb.billableWeight} kg</span>
          <span className="text-[10px] text-blue-600 font-semibold block mt-0.5">{formatCurrency(ratePerKg)} / kg</span>
        </div>

        {/* Custom Duty Card */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] text-amber-600 font-bold block uppercase">Custom Duty</span>
          <span className="text-base font-extrabold text-amber-700">{formatCurrency(customDuty)}</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">{invoice.box_count} Box(es)</span>
        </div>

        {/* Net Payable Card */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs col-span-2 md:col-span-1">
          <span className="text-[10px] text-emerald-600 font-bold block uppercase">Net Payable</span>
          <span className="text-lg font-extrabold text-emerald-700">{formatCurrency(finalAmount)}</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Final Total</span>
        </div>
      </div>

      {/* Meat & Special Commodity Breakdown Banner (When Invoice contains Dry Meat / Sukuti) */}
      {wb.hasMeat && (
        <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 shadow-xs space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-base">🥩</span>
              <div>
                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                  Dry Meat (Sukuti) & Quarantine Goods Calculation
                </h4>
                <p className="text-[11px] text-amber-800">
                  {wb.meatItemDescriptions?.join(', ') || 'Dry Meat / Sukuti Items'}
                </p>
              </div>
            </div>
            <button
              onClick={() => exportMeatDocumentationToExcel([invoice])}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-lg transition flex items-center gap-1 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Meat Manifest (.xlsx)</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-center">
            <div className="bg-white p-2 rounded-lg border border-amber-100">
              <span className="text-[9px] text-slate-500 font-bold uppercase block">Meat Net Wt</span>
              <span className="text-sm font-extrabold text-amber-900">{wb.meatWeight} kg</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-amber-100">
              <span className="text-[9px] text-slate-500 font-bold uppercase block">Normal Net Wt</span>
              <span className="text-sm font-extrabold text-slate-800">{wb.normalWeight} kg</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-amber-100">
              <span className="text-[9px] text-amber-700 font-bold uppercase block">Meat Surcharge</span>
              <span className="text-sm font-extrabold text-amber-900">+{formatCurrency(wb.meatExtraCharge || 0)}</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-amber-100">
              <span className="text-[9px] text-slate-500 font-bold uppercase block">Clearance Cost</span>
              <span className="text-sm font-extrabold text-slate-700">{formatCurrency(wb.meatPurchaseCost || 0)}</span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-emerald-200 col-span-2 sm:col-span-1">
              <span className="text-[9px] text-emerald-700 font-bold uppercase block">Meat Profit</span>
              <span className="text-sm font-black text-emerald-800">{formatCurrency(wb.meatProfit || 0)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Live Printable A4 Document Preview Stage */}
      <div className="bg-slate-800 p-3 sm:p-6 rounded-xl border border-slate-700 overflow-x-auto shadow-inner flex justify-start sm:justify-center">
        <div className="shadow-2xl rounded shrink-0">
          <PrintDocument ref={printRef} invoice={invoice} version={selectedVersion} />
        </div>
      </div>

      {/* Confirmation Modal for Delete */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Delete Invoice?</h3>
                <p className="text-xs text-slate-500">Admin Privilege Action</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed bg-rose-50 p-3 rounded-lg border border-rose-100 font-medium">
              Delete invoice <strong className="text-slate-900">{invoice.invoice_no}</strong>? This cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete(invoice.id);
                  onBack();
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition cursor-pointer"
              >
                Yes, Delete Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
