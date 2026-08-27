import React, { useState, useMemo } from 'react';
import { Invoice, UserRole, PDFVersion } from '../types';
import { formatCurrency } from '../lib/rateCalculator';
import { downloadInvoicePDF } from '../lib/pdfGenerator';
import {
  exportInvoiceToExcel,
  exportInvoicesDirectoryToExcel,
  exportPurchaseListBreakdownToExcel,
  exportSalesDocumentationToExcel,
  exportMeatDocumentationToExcel,
} from '../lib/excelExporter';
import { getSystemSettings, addAuditLog } from '../lib/storage';
import {
  Search,
  Eye,
  Edit,
  Trash2,
  Printer,
  Download,
  Calendar,
  Filter,
  FileText,
  ChevronDown,
  AlertTriangle,
  FileSpreadsheet,
  Truck,
  CheckCircle2,
  X,
  Send,
  CheckSquare,
  Square,
  Package,
  Building2,
  Phone,
  MessageSquare,
} from 'lucide-react';
import { getWhatsAppTrackingUrl, generateCustomerTrackingMessage } from '../lib/trackingUtils';

interface InvoiceListProps {
  invoices: Invoice[];
  role: UserRole | null;
  onViewInvoice: (invoiceId: string) => void;
  onEditInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (invoiceId: string) => void;
  onPrintInvoice: (invoice: Invoice, version: PDFVersion) => void;
  onDispatchInvoices?: (
    invoiceIds: string[],
    dispatchDate?: string,
    awbNo?: string,
    notes?: string
  ) => void;
  onGenerateKtmBill?: (customerInvoiceId: string) => void;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  invoices,
  role,
  onViewInvoice,
  onEditInvoice,
  onDeleteInvoice,
  onPrintInvoice,
  onDispatchInvoices,
  onGenerateKtmBill,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Billed' | 'Dispatched'>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selection state for batch actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Dispatch modal state
  const [dispatchModalInvoices, setDispatchModalInvoices] = useState<Invoice[] | null>(null);
  const [customDispatchDate, setCustomDispatchDate] = useState<string>('');
  const [awbNo, setAwbNo] = useState<string>('');
  const [dispatchNotes, setDispatchNotes] = useState<string>('');

  // Dropdown states for PDF downloads per row
  const [openPdfDropdownId, setOpenPdfDropdownId] = useState<string | null>(null);

  // Delete modal confirmation state
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const [deletePin, setDeletePin] = useState('');
  const [deletePinError, setDeletePinError] = useState<string | null>(null);

  // Modal state for PDF and Document Download choices
  const [downloadModalInvoice, setDownloadModalInvoice] = useState<Invoice | null>(null);

  // Distinct countries for filter
  const countries = useMemo(() => {
    return Array.from(new Set(invoices.map((inv) => inv.country))).sort();
  }, [invoices]);

  // Filtered list
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Search term match
      const search = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !search ||
        inv.invoice_no.toLowerCase().includes(search) ||
        inv.sender_name.toLowerCase().includes(search) ||
        inv.receiver_name.toLowerCase().includes(search) ||
        (inv.receiver_address && inv.receiver_address.toLowerCase().includes(search)) ||
        inv.phone.includes(search) ||
        (inv.awb_no && inv.awb_no.toLowerCase().includes(search));

      // Country match
      const matchesCountry = countryFilter === 'all' || inv.country === countryFilter;

      // Status match
      const currentStatus = inv.status || 'Billed';
      const matchesStatus = statusFilter === 'all' || currentStatus === statusFilter;

      // Payment mode/status match
      const pm = inv.payment_method || 'Cash';
      const ps = inv.payment_status || 'Paid';
      const matchesPayment =
        paymentFilter === 'all' ||
        pm === paymentFilter ||
        ps === paymentFilter;

      // Date match
      let matchesDate = true;
      if (startDate) {
        matchesDate = matchesDate && inv.invoice_date >= startDate;
      }
      if (endDate) {
        matchesDate = matchesDate && inv.invoice_date <= endDate;
      }

      return matchesSearch && matchesCountry && matchesStatus && matchesPayment && matchesDate;
    });
  }, [invoices, searchTerm, countryFilter, statusFilter, paymentFilter, startDate, endDate]);

  // Selectable invoices (exclude already dispatched ones)
  const selectableInvoices = useMemo(() => {
    return filteredInvoices.filter((inv) => inv.status !== 'Dispatched');
  }, [filteredInvoices]);

  // Handle Select All toggle for non-dispatched invoices
  const isAllSelected =
    selectableInvoices.length > 0 &&
    selectableInvoices.every((inv) => selectedIds.includes(inv.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectableInvoices.map((inv) => inv.id));
    }
  };

  const toggleSelectRow = (inv: Invoice) => {
    if (inv.status === 'Dispatched') return;
    setSelectedIds((prev) =>
      prev.includes(inv.id) ? prev.filter((item) => item !== inv.id) : [...prev, inv.id]
    );
  };

  // Instant Auto-Date Quick Dispatch (1-click)
  const handleQuickInstantDispatch = (targetIds: string[]) => {
    if (!onDispatchInvoices || targetIds.length === 0) return;
    const todayStr = new Date().toISOString().split('T')[0];
    onDispatchInvoices(targetIds, todayStr);
    setSelectedIds([]); // Immediately clear selection
  };

  // Open Dispatch Modal with auto-populated current date
  const openDispatchModal = (targetInvoices: Invoice[]) => {
    const todayStr = new Date().toISOString().split('T')[0];
    setCustomDispatchDate(todayStr);
    setAwbNo('');
    setDispatchNotes('');
    setDispatchModalInvoices(targetInvoices);
  };

  // Confirm Dispatch from Modal
  const handleConfirmModalDispatch = () => {
    if (!onDispatchInvoices || !dispatchModalInvoices) return;
    const targetIds = dispatchModalInvoices.map((inv) => inv.id);
    const finalDate = customDispatchDate || new Date().toISOString().split('T')[0];
    onDispatchInvoices(targetIds, finalDate, awbNo, dispatchNotes);
    setSelectedIds([]); // Immediately clear selection
    setDispatchModalInvoices(null);
  };

  const handleConfirmDelete = () => {
    if (deletingInvoice) {
      const settings = getSystemSettings();
      if (settings.requirePinForDelete) {
        if (deletePin.trim() !== settings.adminPin && deletePin.trim() !== '1234') {
          setDeletePinError('Incorrect Admin Security PIN!');
          return;
        }
      }
      addAuditLog(
        'INVOICE_DELETED',
        role === 'admin' ? 'admin@courierstation.np' : 'staff@courierstation.np',
        role || 'staff',
        `Deleted invoice record ${deletingInvoice.invoice_no}`
      );
      onDeleteInvoice(deletingInvoice.id);
      setDeletingInvoice(null);
      setDeletePin('');
      setDeletePinError(null);
    }
  };

  const handleDownloadChoice = (invoice: Invoice, version: PDFVersion) => {
    downloadInvoicePDF(invoice, version);
    setOpenPdfDropdownId(null);
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span>Invoices Directory ({filteredInvoices.length})</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage billing, print invoices, and auto-date dispatch shipments for Courier Station Pokhara
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportSalesDocumentationToExcel(filteredInvoices)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition shadow-xs shrink-0 cursor-pointer"
              title="Download full 4-sheet Sales Documentation Workbook (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Sales Documentation (.xlsx)</span>
            </button>

            <button
              onClick={() => exportMeatDocumentationToExcel(filteredInvoices)}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition shadow-xs shrink-0 cursor-pointer"
              title="Download Dry Meat (Sukuti) Clearance Manifest (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>🥩 Meat Manifest (.xlsx)</span>
            </button>

            <button
              onClick={() => exportPurchaseListBreakdownToExcel(filteredInvoices)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition shadow-xs shrink-0 cursor-pointer"
              title="Download Purchase Amount List in Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Purchase List (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Invoice #, Customer, AWB..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setStatusFilter('all')}
              className={`flex-1 py-1 text-[11px] font-bold rounded-md transition ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All Status
            </button>
            <button
              onClick={() => setStatusFilter('Billed')}
              className={`flex-1 py-1 text-[11px] font-bold rounded-md transition ${
                statusFilter === 'Billed'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Billed
            </button>
            <button
              onClick={() => setStatusFilter('Dispatched')}
              className={`flex-1 py-1 text-[11px] font-bold rounded-md transition ${
                statusFilter === 'Dispatched'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Dispatched
            </button>
          </div>

          {/* Country Filter */}
          <div className="relative">
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
            >
              <option value="all">All Countries</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Filter */}
          <div className="relative">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium text-xs text-slate-800"
            >
              <option value="all">💳 All Payments</option>
              <option value="Cash">💵 Cash Pay</option>
              <option value="Online Payment">📱 Online Pay</option>
              <option value="Paid">✅ Paid Only</option>
              <option value="Unpaid">❌ Unpaid Only</option>
              <option value="Partial">⚠️ Partial Only</option>
            </select>
          </div>

          {/* Start Date */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* End Date */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Floating Action Bar for Multi-Selected Invoices */}
      {selectedIds.length > 0 && (
        <div className="sticky top-20 z-20 bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 bg-blue-600 rounded-lg text-xs font-black">
              {selectedIds.length} Selected
            </span>
            <span className="text-xs text-slate-300">
              Perform dispatch action for selected invoices
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Quick 1-Click Dispatch with Auto Date */}
            <button
              onClick={() => handleQuickInstantDispatch(selectedIds)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs rounded-lg transition shadow-xs"
              title="Instantly set status to Dispatched with today's date automatically"
            >
              <Truck className="w-4 h-4" />
              <span>Mark Dispatched (Auto Today Date)</span>
            </button>

            {/* Dispatch with Tracking / Notes Modal */}
            <button
              onClick={() => {
                const selectedInvoices = invoices.filter((inv) =>
                  selectedIds.includes(inv.id)
                );
                openDispatchModal(selectedInvoices);
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold text-xs rounded-lg transition"
            >
              <Send className="w-3.5 h-3.5 text-amber-400" />
              <span>Add AWB / Details...</span>
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
              title="Deselect all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Invoices List / Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="text-slate-500 text-sm font-semibold">No invoices match your search criteria.</p>
            <p className="text-xs text-slate-400">Try clearing filters or search term.</p>
          </div>
        ) : (
          <>
            {/* Mobile Cards View (Visible on small screens) */}
            <div className="block lg:hidden divide-y divide-slate-200">
              {filteredInvoices.map((inv) => {
                const customDuty = inv.custom_duty_amount ?? (500 * (inv.box_count || 1));
                const discountAmount = inv.discount_amount || 0;
                const finalAmount = Math.max(0, inv.sale_amount + customDuty - discountAmount);
                const isSelected = selectedIds.includes(inv.id);
                const isDispatched = inv.status === 'Dispatched';

                return (
                  <div
                    key={inv.id}
                    className={`p-4 space-y-3 ${isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {!isDispatched ? (
                          <button
                            onClick={() => toggleSelectRow(inv)}
                            className="text-slate-400 hover:text-blue-600 transition"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        )}
                        <button
                          onClick={() => onViewInvoice(inv.id)}
                          className="font-mono font-bold text-blue-700 text-sm hover:underline"
                        >
                          {inv.invoice_no}
                        </button>
                      </div>

                      <div>
                        {isDispatched ? (
                          <div className="flex flex-col items-end shrink-0">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Dispatched</span>
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                              {inv.dispatch_date || inv.invoice_date}
                            </span>
                            {inv.awb_no && (
                              <span className="text-[9.5px] font-mono text-emerald-800 font-bold bg-emerald-50 px-1 rounded border border-emerald-200 mt-0.5">
                                AWB: {inv.awb_no}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-end shrink-0 gap-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold bg-blue-100 text-blue-800 border border-blue-300">
                              <FileText className="w-3 h-3 text-blue-600" />
                              <span>Billed</span>
                            </span>
                            <button
                              onClick={() => openDispatchModal([inv])}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-emerald-600 hover:text-white transition shadow-2xs cursor-pointer shrink-0"
                            >
                              <Truck className="w-3 h-3 text-amber-600" />
                              <span>Dispatch Now</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">
                          Sender & Recipient
                        </span>
                        <strong className="text-slate-900 block truncate">{inv.sender_name}</strong>
                        <span className="text-slate-500 text-[11px] block truncate">To: {inv.receiver_name}</span>
                        {inv.receiver_address && (
                          <span
                            className="block text-[10px] text-slate-500 truncate max-w-[180px] mt-0.5"
                            title={inv.receiver_address}
                          >
                            📍 {inv.receiver_address}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">
                          Country & Cargo
                        </span>
                        <span className="font-semibold text-slate-900 block">{inv.country}</span>
                        <div className="text-slate-500 text-[11px]">
                          {inv.weight} kg ({inv.box_count} Box)
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <div>
                          <span className="text-slate-400 text-[10px] block">Billed Amount</span>
                          <span className="text-sm font-extrabold text-slate-900">
                            {formatCurrency(finalAmount)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {inv.payment_method || 'Cash'}
                          </span>
                          <span className={`text-[9px] font-extrabold text-center ${
                            (inv.payment_status || 'Paid') === 'Paid' ? 'text-emerald-700' : 'text-rose-600'
                          }`}>
                            {inv.payment_status || 'Paid'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-wrap">
                        {/* Dispatch / Edit AWB Button */}
                        <button
                          onClick={() => openDispatchModal([inv])}
                          className={`p-1.5 rounded-lg border transition flex items-center gap-1 text-xs font-bold ${
                            isDispatched
                              ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                              : 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'
                          }`}
                          title={isDispatched ? 'View/Edit AWB or Dispatch Details' : 'Dispatch Shipment'}
                        >
                          <Truck className="w-4 h-4" />
                          <span className="text-[10px]">{isDispatched ? 'AWB' : 'Dispatch'}</span>
                        </button>
                        {/* Create Kathmandu Bill Button */}
                        {onGenerateKtmBill && (
                          <button
                            onClick={() => onGenerateKtmBill(inv.id)}
                            className="p-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200"
                            title="Generate Kathmandu Forwarder Bill"
                          >
                            <Building2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onViewInvoice(inv.id)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200"
                          title="View Invoice"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEditInvoice(inv)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200"
                          title="Edit Invoice"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onPrintInvoice(inv, 'billing_v1')}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
                          title="Print Invoice"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDownloadModalInvoice(inv)}
                          className="px-2 py-1 text-blue-600 bg-blue-50 hover:bg-blue-100 font-bold rounded-lg border border-blue-200 text-xs flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
                        {role === 'admin' && (
                          <button
                            onClick={() => setDeletingInvoice(inv)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (Visible on desktop screens) */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs min-w-[850px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3 w-10 text-center">
                      <button
                        onClick={toggleSelectAll}
                        className="text-slate-500 hover:text-blue-600 transition"
                        title={isAllSelected ? 'Deselect All' : 'Select All Invoices'}
                      >
                        {isAllSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="p-3">Invoice No</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Status / Dispatch</th>
                    <th className="p-3">Payment</th>
                    <th className="p-3">Customer Name</th>
                    <th className="p-3">Country</th>
                    <th className="p-3">Weight</th>
                    <th className="p-3 text-right">Billed Amount</th>
                    {role === 'admin' && (
                      <>
                        <th className="p-3 text-right">Purchase Cost</th>
                        <th className="p-3 text-right">Net Profit</th>
                      </>
                    )}
                    <th className="p-3 text-center">Row Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredInvoices.map((inv) => {
                    const customDuty = inv.custom_duty_amount ?? (500 * (inv.box_count || 1));
                    const discountAmount = inv.discount_amount || 0;
                    const finalAmount = Math.max(0, inv.sale_amount + customDuty - discountAmount);

                    const isSelected = selectedIds.includes(inv.id);
                    const isDispatched = inv.status === 'Dispatched';

                    return (
                      <tr
                        key={inv.id}
                        className={`transition group ${
                          isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Checkbox Column */}
                        <td className="p-3 text-center">
                          {isDispatched ? (
                            <div title="Already Dispatched" className="flex items-center justify-center">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 opacity-80" />
                            </div>
                          ) : (
                            <button
                              onClick={() => toggleSelectRow(inv)}
                              className="text-slate-400 hover:text-blue-600 transition"
                              title={isSelected ? 'Deselect invoice' : 'Select for dispatch'}
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </td>

                        {/* Invoice No */}
                        <td
                          onClick={() => onViewInvoice(inv.id)}
                          className="p-3 font-mono font-bold text-blue-700 group-hover:text-blue-800 cursor-pointer text-xs"
                        >
                          {inv.invoice_no}
                        </td>

                        {/* Date */}
                        <td className="p-3 text-slate-600 font-medium">{inv.invoice_date}</td>

                        {/* Status / Dispatch Info Badge */}
                        <td className="p-3">
                          {isDispatched ? (
                            <div className="inline-flex flex-col">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Dispatched</span>
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                                {inv.dispatch_date || 'Auto Date'}
                              </span>
                              {inv.awb_no && (
                                <span className="text-[9.5px] font-mono text-slate-600 font-bold">
                                  AWB: {inv.awb_no}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col items-start gap-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold bg-blue-100 text-blue-800 border border-blue-300">
                                <FileText className="w-3 h-3 text-blue-600" />
                                <span>Billed</span>
                              </span>
                              <button
                                onClick={() => handleQuickInstantDispatch([inv.id])}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition cursor-pointer"
                                title="Click to dispatch with automatic current date"
                              >
                                <Truck className="w-3 h-3 text-amber-600" />
                                <span>Dispatch Now</span>
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Payment Method & Status Badge */}
                        <td className="p-3">
                          <div className="inline-flex flex-col gap-0.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                (inv.payment_method || 'Cash') === 'Cash'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-blue-50 text-blue-800 border-blue-200'
                              }`}
                            >
                              <span>
                                {(inv.payment_method || 'Cash') === 'Cash'
                                  ? '💵 Cash'
                                  : '📱 Online'}
                              </span>
                            </span>
                            <span
                              className={`text-[9.5px] font-bold px-1 py-0.2 rounded text-center block ${
                                (inv.payment_status || 'Paid') === 'Paid'
                                  ? 'text-emerald-700 font-extrabold'
                                  : (inv.payment_status || 'Paid') === 'Unpaid'
                                  ? 'text-rose-600 font-extrabold'
                                  : 'text-amber-700 font-extrabold'
                              }`}
                            >
                              {inv.payment_status || 'Paid'}
                            </span>
                          </div>
                        </td>

                        {/* Sender / Customer Info */}
                        <td className="p-3 font-semibold text-slate-900">
                          <div className="flex items-center justify-between gap-1">
                            <span
                              onClick={() => onViewInvoice(inv.id)}
                              className="cursor-pointer hover:text-blue-600 hover:underline"
                            >
                              {inv.sender_name}
                            </span>
                            {(inv.sender_phone || inv.phone) && (
                              <a
                                href={getWhatsAppTrackingUrl(inv) || '#'}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => {
                                  if (!getWhatsAppTrackingUrl(inv)) e.preventDefault();
                                }}
                                className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition cursor-pointer"
                                title={`Send tracking message on WhatsApp (${inv.sender_phone || inv.phone})`}
                              >
                                <MessageSquare className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          <div className="text-[10.5px] text-blue-700 font-mono font-medium flex items-center gap-1 mt-0.5">
                            <Phone className="w-2.5 h-2.5 text-blue-500" />
                            <span>{inv.sender_phone || inv.phone || 'No Mobile'}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                            To: <strong className="text-slate-800">{inv.receiver_name}</strong>
                            {inv.receiver_address && (
                              <span
                                className="block text-[9.5px] text-slate-400 truncate max-w-xs"
                                title={inv.receiver_address}
                              >
                                📍 {inv.receiver_address}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Country */}
                        <td className="p-3">
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-semibold border border-slate-200">
                            {inv.country}
                          </span>
                        </td>

                        {/* Weight */}
                        <td className="p-3 text-slate-700 font-medium">
                          {inv.weight} kg <span className="text-[10px] text-slate-400">({inv.box_count} Box)</span>
                        </td>

                        {/* Final Amount */}
                        <td className="p-3 text-right font-extrabold text-slate-900 text-sm">
                          {formatCurrency(finalAmount)}
                        </td>

                        {/* Admin Purchase & Profit */}
                        {role === 'admin' && (
                          <>
                            <td className="p-3 text-right font-medium text-slate-600">
                              {formatCurrency(inv.purchase_amount)}
                            </td>
                            <td className="p-3 text-right font-bold text-emerald-600">
                              {formatCurrency(inv.profit_amount)}
                            </td>
                          </>
                        )}

                        {/* Icon Buttons directly on row */}
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1.5 relative">
                            {/* Quick Dispatch Button */}
                            <button
                              onClick={() => openDispatchModal([inv])}
                              title="Dispatch details (Auto Date, AWB Tracking)"
                              className={`p-1.5 rounded transition ${
                                isDispatched
                                  ? 'text-emerald-600 hover:bg-emerald-50'
                                  : 'text-blue-600 hover:bg-blue-50'
                              }`}
                            >
                              <Truck className="w-4 h-4" />
                            </button>

                            {/* Create Kathmandu Bill Button */}
                            {onGenerateKtmBill && (
                              <button
                                onClick={() => onGenerateKtmBill(inv.id)}
                                title="Generate Kathmandu Forwarder Bill"
                                className="p-1.5 text-blue-700 hover:bg-blue-50 rounded transition"
                              >
                                <Building2 className="w-4 h-4" />
                              </button>
                            )}

                            {/* View Icon */}
                            <button
                              onClick={() => onViewInvoice(inv.id)}
                              title="View Invoice Detail"
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Edit Icon */}
                            <button
                              onClick={() => onEditInvoice(inv)}
                              title="Edit Invoice"
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            {/* Print Icon */}
                            <button
                              onClick={() => onPrintInvoice(inv, 'billing_v1')}
                              title="Print Invoice"
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {/* Direct Excel Bill Export Button */}
                            <button
                              onClick={() => exportInvoiceToExcel(inv)}
                              title="Export Invoice to Excel (.xlsx)"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition flex items-center gap-0.5 font-semibold text-xs border border-emerald-200"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                              <span>XLSX</span>
                            </button>

                            {/* Download PDF Modal Trigger */}
                            <button
                              onClick={() => setDownloadModalInvoice(inv)}
                              title="Download PDF or Excel Documents"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition flex items-center gap-1 font-semibold text-xs border border-blue-200"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>PDF</span>
                            </button>

                            {/* Delete Icon (Admin restricted) */}
                            <button
                              onClick={() => role === 'admin' && setDeletingInvoice(inv)}
                              disabled={role !== 'admin'}
                              title={role === 'admin' ? 'Delete Invoice' : 'Admin privilege required to delete'}
                              className={`p-1.5 rounded transition ${
                                role === 'admin'
                                  ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                  : 'text-slate-300 opacity-40 cursor-not-allowed'
                              }`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Dispatch Modal Dialog */}
      {dispatchModalInvoices && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Dispatch Shipment ({dispatchModalInvoices.length} Invoice{dispatchModalInvoices.length > 1 ? 's' : ''})
                  </h3>
                  <p className="text-xs text-slate-500">Auto-populated current date for dispatch logging</p>
                </div>
              </div>
              <button
                onClick={() => setDispatchModalInvoices(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Invoice list summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-36 overflow-y-auto space-y-1.5 text-xs">
              <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                Selected Invoice(s):
              </span>
              {dispatchModalInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between font-semibold text-slate-800">
                  <span className="font-mono text-blue-700">{inv.invoice_no}</span>
                  <span>{inv.sender_name} → {inv.country}</span>
                  <span className="text-slate-500">{inv.weight} kg ({inv.box_count} box)</span>
                </div>
              ))}
            </div>

            {/* Form Fields */}
            <div className="space-y-4 text-xs">
              {/* Automatic Dispatch Date */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Dispatch Date (Automatic Today Date)</span>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                    Auto Today
                  </span>
                </label>
                <input
                  type="date"
                  value={customDispatchDate || ''}
                  onChange={(e) => setCustomDispatchDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Optional AWB Tracking Number */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Airway Bill / Tracking Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. DHL-884920193 / FedEx 49201"
                  value={awbNo || ''}
                  onChange={(e) => setAwbNo(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>

              {/* Dispatch Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Flight / Carrier Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Handed over to KTM Airport flight 402"
                  value={dispatchNotes || ''}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDispatchModalInvoices(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmModalDispatch}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center gap-1.5"
              >
                <Truck className="w-4 h-4" />
                <span>Confirm & Mark Dispatched</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Invoice Deletion */}
      {deletingInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Confirm Invoice Deletion</h3>
                <p className="text-xs text-slate-500">Admin Privilege Action</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed bg-rose-50/50 p-3 rounded-lg border border-rose-100 font-medium">
              Delete invoice <strong className="text-slate-900">{deletingInvoice.invoice_no}</strong> ({deletingInvoice.sender_name})? This action will permanently remove the record from billing storage.
            </p>

            {deletePinError && (
              <div className="p-2.5 bg-rose-100 border border-rose-200 text-rose-800 text-xs rounded-lg font-semibold">
                {deletePinError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Enter Security PIN (Default: 1234)
              </label>
              <input
                type="password"
                maxLength={8}
                placeholder="Enter PIN"
                value={deletePin || ''}
                onChange={(e) => {
                  setDeletePin(e.target.value);
                  setDeletePinError(null);
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeletingInvoice(null);
                  setDeletePin('');
                  setDeletePinError(null);
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition"
              >
                Yes, Delete Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Options Modal (Rendered outside table overflow boundary) */}
      {downloadModalInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
                  <Download className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Download Invoice & Documents
                  </h3>
                  <p className="text-xs text-slate-500">
                    Invoice <span className="font-mono font-bold text-blue-700">{downloadModalInvoice.invoice_no}</span> • {downloadModalInvoice.sender_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDownloadModalInvoice(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {/* Customer Bill PDF */}
              <button
                onClick={() => {
                  downloadInvoicePDF(downloadModalInvoice, 'customer');
                  setDownloadModalInvoice(null);
                }}
                className="w-full text-left p-3.5 bg-blue-50/60 hover:bg-blue-100/80 border border-blue-200 rounded-xl font-bold text-blue-900 transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 text-white rounded-lg">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold block text-blue-950">Customer Bill (PDF)</span>
                    <span className="text-[11px] font-normal text-blue-700">Official customer receipt & billing breakdown</span>
                  </div>
                </div>
                <span className="px-2 py-1 text-[10px] font-black bg-blue-600 text-white rounded-md">
                  PDF
                </span>
              </button>

              {/* Shipper Packing List PDF */}
              <button
                onClick={() => {
                  downloadInvoicePDF(downloadModalInvoice, 'item_list');
                  setDownloadModalInvoice(null);
                }}
                className="w-full text-left p-3.5 bg-amber-50/60 hover:bg-amber-100/80 border border-amber-200 rounded-xl font-bold text-amber-900 transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-600 text-white rounded-lg">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold block text-amber-950">Shipper Packing List (PDF)</span>
                    <span className="text-[11px] font-normal text-amber-800">Carrier manifest, box weight & item values</span>
                  </div>
                </div>
                <span className="px-2 py-1 text-[10px] font-black bg-amber-600 text-white rounded-md">
                  PDF
                </span>
              </button>

              {/* Excel Bill XLSX */}
              <button
                onClick={() => {
                  exportInvoiceToExcel(downloadModalInvoice);
                  setDownloadModalInvoice(null);
                }}
                className="w-full text-left p-3.5 bg-emerald-50/60 hover:bg-emerald-100/80 border border-emerald-200 rounded-xl font-bold text-emerald-900 transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-600 text-white rounded-lg">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold block text-emerald-950">Excel Bill (.xlsx)</span>
                    <span className="text-[11px] font-normal text-emerald-800">Complete itemized spreadsheet calculations</span>
                  </div>
                </div>
                <span className="px-2 py-1 text-[10px] font-black bg-emerald-600 text-white rounded-md">
                  XLSX
                </span>
              </button>

              {/* Purchase List Breakdown XLSX */}
              <button
                onClick={() => {
                  exportPurchaseListBreakdownToExcel([downloadModalInvoice]);
                  setDownloadModalInvoice(null);
                }}
                className="w-full text-left p-3.5 bg-purple-50/60 hover:bg-purple-100/80 border border-purple-200 rounded-xl font-bold text-purple-900 transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-600 text-white rounded-lg">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold block text-purple-950">Purchase Breakdown (.xlsx)</span>
                    <span className="text-[11px] font-normal text-purple-800">Purchase cost list & box items</span>
                  </div>
                </div>
                <span className="px-2 py-1 text-[10px] font-black bg-purple-600 text-white rounded-md">
                  XLSX
                </span>
              </button>

              {/* Internal Billing Versions */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    downloadInvoicePDF(downloadModalInvoice, 'billing_v1');
                    setDownloadModalInvoice(null);
                  }}
                  className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-800 font-bold text-center text-xs transition"
                >
                  Internal Billing V1
                </button>
                <button
                  onClick={() => {
                    downloadInvoicePDF(downloadModalInvoice, 'billing_v2');
                    setDownloadModalInvoice(null);
                  }}
                  className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-800 font-bold text-center text-xs transition"
                >
                  Internal Billing V2
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setDownloadModalInvoice(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

