import React, { useState, useMemo } from 'react';
import { Invoice, PDFVersion } from '../types';
import { formatCurrency } from '../lib/rateCalculator';
import { exportInvoiceToExcel, exportInvoicesDirectoryToExcel, exportPurchaseListBreakdownToExcel } from '../lib/excelExporter';
import { downloadInvoicePDF } from '../lib/pdfGenerator';
import {
  Truck,
  Search,
  Filter,
  Calendar,
  Eye,
  Printer,
  FileSpreadsheet,
  ChevronDown,
  CheckCircle2,
  Package,
  X,
  Edit2,
  Save,
  Download,
  FileText,
  Phone,
  MessageSquare,
} from 'lucide-react';
import { getWhatsAppTrackingUrl } from '../lib/trackingUtils';

interface DispatchedListProps {
  invoices: Invoice[];
  onViewInvoice: (invoiceId: string) => void;
  onPrintInvoice: (invoice: Invoice, version: PDFVersion) => void;
  onUpdateDispatchInfo?: (
    invoiceId: string,
    dispatchDate: string,
    awbNo?: string,
    notes?: string
  ) => void;
  onMarkAsBilled?: (invoiceId: string) => void;
}

export const DispatchedList: React.FC<DispatchedListProps> = ({
  invoices,
  onViewInvoice,
  onPrintInvoice,
  onUpdateDispatchInfo,
  onMarkAsBilled,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Dropdown state for PDF download per row
  const [openPdfDropdownId, setOpenPdfDropdownId] = useState<string | null>(null);

  // Modal state for PDF and document download choices
  const [downloadModalInvoice, setDownloadModalInvoice] = useState<Invoice | null>(null);

  // Edit dispatch info modal state
  const [editingDispatchInvoice, setEditingDispatchInvoice] = useState<Invoice | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editAwb, setEditAwb] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Filter only dispatched invoices
  const dispatchedInvoices = useMemo(() => {
    return invoices.filter((inv) => inv.status === 'Dispatched');
  }, [invoices]);

  // Unique list of countries for dropdown filter
  const countries = useMemo(() => {
    const list = Array.from(new Set(dispatchedInvoices.map((inv) => inv.country))).filter(Boolean);
    return list.sort();
  }, [dispatchedInvoices]);

  // Filtered dataset
  const filteredInvoices = useMemo(() => {
    return dispatchedInvoices.filter((inv) => {
      const search = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !search ||
        inv.invoice_no.toLowerCase().includes(search) ||
        inv.sender_name.toLowerCase().includes(search) ||
        inv.receiver_name.toLowerCase().includes(search) ||
        (inv.receiver_address && inv.receiver_address.toLowerCase().includes(search)) ||
        inv.phone.includes(search) ||
        (inv.awb_no && inv.awb_no.toLowerCase().includes(search)) ||
        (inv.dispatch_notes && inv.dispatch_notes.toLowerCase().includes(search));

      const matchesCountry = countryFilter === 'all' || inv.country === countryFilter;

      let matchesDate = true;
      const dDate = inv.dispatch_date || inv.invoice_date;
      if (startDate) {
        matchesDate = matchesDate && dDate >= startDate;
      }
      if (endDate) {
        matchesDate = matchesDate && dDate <= endDate;
      }

      return matchesSearch && matchesCountry && matchesDate;
    });
  }, [dispatchedInvoices, searchTerm, countryFilter, startDate, endDate]);

  // Summary statistics
  const totalDispatchedWeight = useMemo(
    () => filteredInvoices.reduce((sum, inv) => sum + (inv.weight || 0), 0),
    [filteredInvoices]
  );

  const totalDispatchedBoxes = useMemo(
    () => filteredInvoices.reduce((sum, inv) => sum + (inv.box_count || 1), 0),
    [filteredInvoices]
  );

  const totalDispatchedValue = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => {
      const customDuty = inv.custom_duty_amount ?? (500 * (inv.box_count || 1));
      const discount = inv.discount_amount || 0;
      return sum + Math.max(0, inv.sale_amount + customDuty - discount);
    }, 0);
  }, [filteredInvoices]);

  const openEditModal = (inv: Invoice) => {
    setEditingDispatchInvoice(inv);
    setEditDate(inv.dispatch_date || new Date().toISOString().split('T')[0]);
    setEditAwb(inv.awb_no || '');
    setEditNotes(inv.dispatch_notes || '');
  };

  const handleSaveEdit = () => {
    if (!editingDispatchInvoice || !onUpdateDispatchInfo) return;
    onUpdateDispatchInfo(editingDispatchInvoice.id, editDate, editAwb, editNotes);
    setEditingDispatchInvoice(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <Truck className="w-5 h-5" />
              </div>
              <span>Dispatched Shipments Directory</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                {filteredInvoices.length} Dispatched
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Dedicated record of all dispatched courier parcels, flight tracking details, and dates
            </p>
          </div>

          <button
            onClick={() => exportInvoicesDirectoryToExcel(filteredInvoices)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition shadow-xs"
            title="Export Dispatched Shipments to Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Dispatched to Excel</span>
          </button>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-semibold uppercase text-[10px] block">Total Dispatched</span>
            <strong className="text-slate-900 text-lg font-bold">{filteredInvoices.length} Parcels</strong>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-semibold uppercase text-[10px] block">Total Weight</span>
            <strong className="text-blue-700 text-lg font-bold">{totalDispatchedWeight.toFixed(2)} kg</strong>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-semibold uppercase text-[10px] block">Total Boxes</span>
            <strong className="text-amber-700 text-lg font-bold">{totalDispatchedBoxes} Boxes</strong>
          </div>
          <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200">
            <span className="text-emerald-700 font-semibold uppercase text-[10px] block">Total Billed Value</span>
            <strong className="text-emerald-900 text-lg font-extrabold">{formatCurrency(totalDispatchedValue)}</strong>
          </div>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Invoice #, Customer, AWB tracking..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
            />
          </div>

          {/* Country Filter */}
          <div className="relative">
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none appearance-none bg-white font-medium"
            >
              <option value="all">All Destination Countries ({countries.length})</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filters */}
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <Calendar className="w-3 h-3 text-slate-400 absolute left-2.5 top-3" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-7 pr-2 py-2 border border-slate-300 rounded-lg text-[11px] font-medium"
              />
            </div>
            <span className="text-slate-400 font-bold">-</span>
            <div className="relative flex-1">
              <Calendar className="w-3 h-3 text-slate-400 absolute left-2.5 top-3" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-7 pr-2 py-2 border border-slate-300 rounded-lg text-[11px] font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dispatched Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <Truck className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No Dispatched Shipments Found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Invoices will appear here once you select and mark them as Dispatched from the Invoices page or Dashboard.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Cards View (Visible on small screens) */}
            <div className="block lg:hidden divide-y divide-slate-200">
              {filteredInvoices.map((inv) => {
                const customDuty = inv.custom_duty_amount ?? (500 * (inv.box_count || 1));
                const discountAmount = inv.discount_amount || 0;
                const finalAmount = Math.max(0, inv.sale_amount + customDuty - discountAmount);

                return (
                  <div key={inv.id} className="p-4 space-y-3 hover:bg-slate-50">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-emerald-600" />
                        <button
                          onClick={() => onViewInvoice(inv.id)}
                          className="font-mono font-bold text-blue-700 text-sm hover:underline"
                        >
                          {inv.invoice_no}
                        </button>
                      </div>

                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{inv.dispatch_date || inv.invoice_date}</span>
                      </span>
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
                          AWB & Country
                        </span>
                        {inv.awb_no ? (
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300 font-mono text-[11px] font-bold text-slate-800 block">
                            {inv.awb_no}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px] block">No AWB</span>
                        )}
                        <span className="font-semibold text-slate-800">{inv.country}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Billed Total</span>
                        <span className="text-sm font-extrabold text-slate-900">
                          {formatCurrency(finalAmount)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {onMarkAsBilled && (
                          <button
                            onClick={() => {
                              if (confirm('Revert status back to Billed?')) {
                                onMarkAsBilled(inv.id);
                              }
                            }}
                            className="px-2 py-1 text-blue-700 bg-blue-50 hover:bg-blue-100 font-bold rounded-lg border border-blue-200 text-xs flex items-center gap-1"
                            title="Revert status back to Billed"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Mark Billed</span>
                          </button>
                        )}
                        {onUpdateDispatchInfo && (
                          <button
                            onClick={() => openEditModal(inv)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-slate-200"
                            title="Edit AWB/Date"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onViewInvoice(inv.id)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-slate-200"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onPrintInvoice(inv, 'customer')}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
                          title="Print Customer Bill"
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
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3">Invoice No</th>
                    <th className="p-3">Dispatch Date</th>
                    <th className="p-3">Airway Bill / Tracking</th>
                    <th className="p-3">Sender & Recipient</th>
                    <th className="p-3">Destination</th>
                    <th className="p-3">Weight / Box</th>
                    <th className="p-3 text-right">Billed Amount</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredInvoices.map((inv) => {
                    const customDuty = inv.custom_duty_amount ?? (500 * (inv.box_count || 1));
                    const discountAmount = inv.discount_amount || 0;
                    const finalAmount = Math.max(0, inv.sale_amount + customDuty - discountAmount);

                    return (
                      <tr key={inv.id} className="hover:bg-slate-50 transition">
                        {/* Invoice No */}
                        <td
                          onClick={() => onViewInvoice(inv.id)}
                          className="p-3 font-mono font-bold text-blue-700 cursor-pointer hover:underline"
                        >
                          {inv.invoice_no}
                        </td>

                        {/* Dispatch Date Badge */}
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>{inv.dispatch_date || inv.invoice_date}</span>
                          </span>
                        </td>

                        {/* AWB Tracking */}
                        <td className="p-3 font-mono text-slate-800 font-bold">
                          {inv.awb_no ? (
                            <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                              {inv.awb_no}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-sans italic text-[11px]">No AWB set</span>
                          )}
                        </td>

                        {/* Sender & Receiver */}
                        <td className="p-3">
                          <div className="flex items-center justify-between gap-1">
                            <strong className="text-slate-900 font-bold">{inv.sender_name}</strong>
                            {(inv.sender_phone || inv.phone) && (
                              <a
                                href={getWhatsAppTrackingUrl(inv) || '#'}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => {
                                  if (!getWhatsAppTrackingUrl(inv)) e.preventDefault();
                                }}
                                className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition cursor-pointer"
                                title={`Send WhatsApp tracking code (${inv.sender_phone || inv.phone})`}
                              >
                                <MessageSquare className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          <div className="text-[10.5px] text-blue-700 font-mono font-medium flex items-center gap-1 mt-0.5">
                            <Phone className="w-2.5 h-2.5 text-blue-500" />
                            <span>{inv.sender_phone || inv.phone || 'No Mobile'}</span>
                          </div>
                          <div className="text-slate-500 text-[11px] mt-0.5">
                            To: <strong className="text-slate-800">{inv.receiver_name}</strong>
                            {inv.receiver_address && (
                              <span
                                className="block text-[10px] text-slate-500 truncate max-w-xs mt-0.5"
                                title={inv.receiver_address}
                              >
                                📍 {inv.receiver_address}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Country */}
                        <td className="p-3">
                          <span className="inline-block px-2 py-0.5 rounded text-[10.5px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                            {inv.country}
                          </span>
                        </td>

                        {/* Weight & Boxes */}
                        <td className="p-3 text-slate-700 font-medium">
                          {inv.weight} kg <span className="text-slate-400">({inv.box_count || 1} Box)</span>
                        </td>

                        {/* Billed Amount */}
                        <td className="p-3 text-right font-bold text-slate-900 text-sm">
                          {formatCurrency(finalAmount)}
                        </td>

                        {/* Actions */}
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1.5 relative">
                            {/* Revert to Billed */}
                            {onMarkAsBilled && (
                              <button
                                onClick={() => {
                                  if (confirm('Revert status back to Billed?')) {
                                    onMarkAsBilled(inv.id);
                                  }
                                }}
                                title="Revert status back to Billed"
                                className="px-2 py-1 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition font-bold text-xs flex items-center gap-1"
                              >
                                <FileText className="w-3.5 h-3.5 text-blue-600" />
                                <span>Mark Billed</span>
                              </button>
                            )}

                            {/* Edit Dispatch Details */}
                            {onUpdateDispatchInfo && (
                              <button
                                onClick={() => openEditModal(inv)}
                                title="Edit Dispatch Date or AWB Tracking"
                                className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}

                            {/* View Details */}
                            <button
                              onClick={() => onViewInvoice(inv.id)}
                              title="View Full Invoice Details"
                              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Print Icon */}
                            <button
                              onClick={() => onPrintInvoice(inv, 'customer')}
                              title="Print Customer Bill"
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {/* Download PDF & Excel Modal Trigger */}
                            <button
                              onClick={() => setDownloadModalInvoice(inv)}
                              title="Download PDF or Excel Documents"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition flex items-center gap-1 font-semibold text-xs border border-blue-200"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>PDF</span>
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

      {/* Edit Dispatch Modal */}
      {editingDispatchInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-600" />
                <span>Update Dispatch Details</span>
              </h3>
              <button
                onClick={() => setEditingDispatchInvoice(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Invoice Number</label>
                <input
                  type="text"
                  disabled
                  value={editingDispatchInvoice?.invoice_no || ''}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-slate-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dispatch Date</label>
                <input
                  type="date"
                  value={editDate || ''}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Airway Bill / Tracking AWB #</label>
                <input
                  type="text"
                  value={editAwb || ''}
                  onChange={(e) => setEditAwb(e.target.value)}
                  placeholder="e.g. DHL-99201"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Flight / Carrier Notes</label>
                <input
                  type="text"
                  value={editNotes || ''}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Carrier / Flight details..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setEditingDispatchInvoice(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
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
