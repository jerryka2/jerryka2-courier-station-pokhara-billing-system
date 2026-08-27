import React, { useState, useRef, useEffect } from 'react';
import { KathmanduBilling, KathmanduSettlementCycle, KathmanduPaymentRecord, Invoice, UserRole, PaymentMethod } from '../types';
import { formatCurrency } from '../lib/rateCalculator';
import { downloadKathmanduBillingPDF } from '../lib/pdfGenerator';
import {
  exportKathmanduBillingToExcel,
  exportKathmanduBillingsListToExcel,
  exportKathmanduShippingManifestToExcel,
  exportCustomerShippingListToExcel,
} from '../lib/excelExporter';
import {
  downloadKathmanduShippingManifestPDF,
  downloadCustomerShippingListPDF,
  downloadSingleConsignmentShippingSlipPDF,
} from '../lib/pdfShippingManifestGenerator';
import {
  getKathmanduSettlementCycles,
  createKathmanduSettlementCycle,
  reopenKathmanduSettlementCycle,
  recordKathmanduPayment,
  saveKathmanduBillings,
} from '../lib/storage';
import { PrintKathmanduShippingManifest } from './PrintKathmanduShippingManifest';
import { PrintKathmanduSettlement } from './PrintKathmanduSettlement';
import {
  Building2,
  Receipt,
  Search,
  Plus,
  Filter,
  FileSpreadsheet,
  Printer,
  Edit2,
  Trash2,
  Plane,
  Package,
  Calendar,
  DollarSign,
  TrendingUp,
  Link as LinkIcon,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  ExternalLink,
  Info,
  Download,
  Database,
  Truck,
  RotateCcw,
  CreditCard,
  History,
  Archive,
  Layers,
  ChevronRight,
  AlertCircle,
  X,
  Sparkles,
  Send,
} from 'lucide-react';

interface KathmanduBillingListProps {
  billings: KathmanduBilling[];
  customerInvoices: Invoice[];
  role?: UserRole;
  onNewBilling: () => void;
  onEditBilling: (billing: KathmanduBilling) => void;
  onDeleteBilling: (id: string) => void;
  onPrintBilling: (billing: KathmanduBilling) => void;
  onDownloadPDF?: (billing: KathmanduBilling) => void;
  onViewCustomerInvoice?: (invoiceNo: string) => void;
}

export const KathmanduBillingList: React.FC<KathmanduBillingListProps> = ({
  billings,
  customerInvoices,
  role,
  onNewBilling,
  onEditBilling,
  onDeleteBilling,
  onPrintBilling,
  onDownloadPDF,
  onViewCustomerInvoice,
}) => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'active' | 'shipping' | 'settlements' | 'all'>('active');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Paid' | 'Unpaid' | 'Partial'>('all');
  const [shippingFilter, setShippingFilter] = useState<string>('all');
  const [linkFilter, setLinkFilter] = useState<'all' | 'linked' | 'standalone'>('all');

  // Modals state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [paymentModalBilling, setPaymentModalBilling] = useState<KathmanduBilling | null>(null);
  const [paymentHistoryBilling, setPaymentHistoryBilling] = useState<KathmanduBilling | null>(null);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [viewingSettlementCycle, setViewingSettlementCycle] = useState<KathmanduSettlementCycle | null>(null);
  const [printingManifestBillings, setPrintingManifestBillings] = useState<KathmanduBilling[] | null>(null);
  const [printingSettlement, setPrintingSettlement] = useState<{ cycle: KathmanduSettlementCycle; billings: KathmanduBilling[] } | null>(null);

  // Settlement Cycles from storage
  const [settlementCycles, setSettlementCycles] = useState<KathmanduSettlementCycle[]>([]);

  // Payment Form States
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('Bank Transfer');
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [payRef, setPayRef] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');

  // Settlement Form States
  const [cycleName, setCycleName] = useState<string>('');
  const [settledDate, setSettledDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [settleForwarderName, setSettleForwarderName] = useState<string>('Kathmandu Air Cargo Terminal');
  const [settlePaymentMethod, setSettlePaymentMethod] = useState<PaymentMethod>('Bank Transfer');
  const [settleRefNo, setSettleRefNo] = useState<string>('');
  const [settleNotes, setSettleNotes] = useState<string>('');
  const [markAllRemainingPaid, setMarkAllRemainingPaid] = useState<boolean>(true);

  // Success notification toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Refs for printing
  const shippingPrintRef = useRef<HTMLDivElement>(null);
  const settlementPrintRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load settlements on mount & on update
  const refreshSettlements = () => {
    const cycles = getKathmanduSettlementCycles();
    setSettlementCycles(cycles);
  };

  useEffect(() => {
    refreshSettlements();
    window.addEventListener('csp_data_updated', refreshSettlements);
    return () => window.removeEventListener('csp_data_updated', refreshSettlements);
  }, []);

  // Split billings into active vs archived
  const activeBillings = billings.filter((b) => !b.is_settled_archived);
  const archivedBillings = billings.filter((b) => b.is_settled_archived);

  // Determine current working list based on tab
  const currentList =
    activeTab === 'active'
      ? activeBillings
      : activeTab === 'shipping'
      ? activeBillings
      : activeTab === 'all'
      ? billings
      : activeBillings;

  // Active Batch Summary Metrics
  const activeTotalCost = activeBillings.reduce((sum, b) => sum + (Number(b.total_cost) || 0), 0);
  const activeTotalPaid = activeBillings.reduce((sum, b) => {
    const paid = b.amount_paid !== undefined ? Number(b.amount_paid) : (b.payment_status === 'Paid' ? Number(b.total_cost) || 0 : 0);
    return sum + paid;
  }, 0);
  const activeBalanceDue = Math.max(0, activeTotalCost - activeTotalPaid);
  const activeTotalWeight = activeBillings.reduce((sum, b) => sum + (Number(b.weight) || 0), 0);

  // Filtered List based on Search & Status
  const filteredBillings = currentList.filter((b) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (b.ktm_invoice_no || '').toLowerCase().includes(term) ||
      (b.customer_invoice_no || '').toLowerCase().includes(term) ||
      (b.sender_name || '').toLowerCase().includes(term) ||
      (b.receiver_name || '').toLowerCase().includes(term) ||
      (b.country || '').toLowerCase().includes(term) ||
      (b.awb_no || '').toLowerCase().includes(term) ||
      (b.forwarder_name || '').toLowerCase().includes(term) ||
      (b.vehicle_no || '').toLowerCase().includes(term);

    const totalCost = Number(b.total_cost) || 0;
    const paid = b.amount_paid !== undefined ? Number(b.amount_paid) : (b.payment_status === 'Paid' ? totalCost : 0);
    const due = b.amount_due !== undefined ? Number(b.amount_due) : Math.max(0, totalCost - paid);
    const effectiveStatus: 'Paid' | 'Unpaid' | 'Partial' = due === 0 ? 'Paid' : (paid > 0 ? 'Partial' : 'Unpaid');

    const matchesStatus = statusFilter === 'all' || effectiveStatus === statusFilter;
    const matchesShipping = shippingFilter === 'all' || (b.shipping_status || 'Pending Dispatch') === shippingFilter;
    const matchesLink =
      linkFilter === 'all' ||
      (linkFilter === 'linked' && (b.customer_invoice_id || b.customer_invoice_no)) ||
      (linkFilter === 'standalone' && !b.customer_invoice_id && !b.customer_invoice_no);

    return matchesSearch && matchesStatus && matchesShipping && matchesLink;
  });

  // Open Payment Modal
  const handleOpenPaymentModal = (billing: KathmanduBilling) => {
    const totalCost = Number(billing.total_cost) || 0;
    const paid = billing.amount_paid !== undefined ? Number(billing.amount_paid) : (billing.payment_status === 'Paid' ? totalCost : 0);
    const due = billing.amount_due !== undefined ? Number(billing.amount_due) : Math.max(0, totalCost - paid);

    setPaymentModalBilling(billing);
    setPayAmount(due); // default to remaining due
    setPayMethod(billing.payment_method || 'Bank Transfer');
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayRef('');
    setPayNotes('');
  };

  // Submit Payment Record
  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalBilling || payAmount <= 0) return;

    const updatedBilling = recordKathmanduPayment(paymentModalBilling.id, {
      date: payDate,
      amount: Number(payAmount),
      payment_method: payMethod,
      reference_no: payRef.trim() || undefined,
      notes: payNotes.trim() || undefined,
    });

    if (updatedBilling) {
      showToast(
        `Payment of ${formatCurrency(payAmount)} recorded for ${updatedBilling.ktm_invoice_no}. Remaining balance: ${formatCurrency(updatedBilling.amount_due || 0)}.`
      );
    }
    setPaymentModalBilling(null);
  };

  // Open Settle Batch Modal
  const handleOpenSettlementModal = () => {
    const batchNum = settlementCycles.length + 1;
    const monthYear = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    setCycleName(`Kathmandu Batch #${batchNum} - ${monthYear}`);
    setSettledDate(new Date().toISOString().split('T')[0]);
    setSettleForwarderName(activeBillings[0]?.forwarder_name || 'Kathmandu Air Cargo Terminal');
    setSettlePaymentMethod('Bank Transfer');
    setSettleRefNo('');
    setSettleNotes('');
    setMarkAllRemainingPaid(true);
    setIsSettlementModalOpen(true);
  };

  // Submit Settlement & Start New List
  const handleSettlementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeBillings.length === 0) return;

    // If markAllRemainingPaid is true, update each bill's amount_paid to total_cost
    if (markAllRemainingPaid) {
      activeBillings.forEach((b) => {
        const total = Number(b.total_cost) || 0;
        const paid = b.amount_paid || 0;
        if (paid < total) {
          recordKathmanduPayment(b.id, {
            date: settledDate,
            amount: total - paid,
            payment_method: settlePaymentMethod,
            reference_no: settleRefNo || undefined,
            notes: 'Settlement cycle final clearance',
          });
        }
      });
    }

    const billIds = activeBillings.map((b) => b.id);
    const totalBilled = activeTotalCost;
    const finalPaid = markAllRemainingPaid ? activeTotalCost : activeTotalPaid;
    const finalDue = markAllRemainingPaid ? 0 : activeBalanceDue;

    const { cycle } = createKathmanduSettlementCycle({
      cycle_name: cycleName.trim() || `Settlement Batch #${settlementCycles.length + 1}`,
      settled_date: settledDate,
      total_billed: totalBilled,
      total_paid: finalPaid,
      remaining_due: finalDue,
      bill_count: activeBillings.length,
      bill_ids: billIds,
      forwarder_name: settleForwarderName.trim() || undefined,
      payment_method: settlePaymentMethod,
      reference_no: settleRefNo.trim() || undefined,
      notes: settleNotes.trim() || undefined,
    });

    setIsSettlementModalOpen(false);
    showToast(
      `Batch "${cycle.cycle_name}" settled successfully! Active list is reset and ready for new Kathmandu consignments.`
    );
    setActiveTab('settlements');
  };

  // Reopen past settlement cycle
  const handleReopenCycle = (cycleId: string, cycleName: string) => {
    if (window.confirm(`Are you sure you want to reopen "${cycleName}"? Bills will return to the active list.`)) {
      reopenKathmanduSettlementCycle(cycleId);
      showToast(`Settlement cycle "${cycleName}" reopened to active list.`);
      refreshSettlements();
      setActiveTab('active');
    }
  };

  // Update shipping status inline
  const handleUpdateShippingStatus = (
    billingId: string,
    newStatus: 'Pending Dispatch' | 'In Transit to KTM' | 'Received at KTM Hub' | 'Customs Cleared at TIA' | 'Dispatched / Air Shipped' | 'Delivered'
  ) => {
    const updated = billings.map((b) => (b.id === billingId ? { ...b, shipping_status: newStatus, updated_at: new Date().toISOString() } : b));
    saveKathmanduBillings(updated);
    showToast(`Shipping status updated to "${newStatus}".`);
  };

  // Print Shipping Manifest Handler
  const handlePrintShippingManifest = () => {
    if (shippingPrintRef.current) {
      window.print();
    }
  };

  // Print Settlement Voucher Handler
  const handlePrintSettlementVoucher = () => {
    if (settlementPrintRef.current) {
      window.print();
    }
  };

  const handleDeleteConfirm = (id: string) => {
    onDeleteBilling(id);
    setDeletingId(null);
    showToast('Kathmandu bill deleted successfully.');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between text-xs font-semibold animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-200 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner & Header Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                Kathmandu Billing & Airport Cargo Logistics
              </h2>
              <p className="text-xs text-slate-500">
                Forwarder purchase invoices, payment ledger reconciliation, settlement cycles & cargo dispatch manifest
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap sm:flex-nowrap">
          {/* Settle Batch & Start Fresh List Button */}
          {activeBillings.length > 0 && activeTab !== 'settlements' && (
            <button
              onClick={handleOpenSettlementModal}
              title="Settle current Kathmandu billing batch and start a fresh new active list"
              className="px-3.5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Settle Batch & Start New List</span>
            </button>
          )}

          {/* Dedicated Customer Shipping List Quick Downloads */}
          <div className="flex items-center gap-1.5 bg-emerald-50/70 p-1 rounded-lg border border-emerald-200">
            <button
              onClick={() => downloadCustomerShippingListPDF(activeTab === 'shipping' ? filteredBillings : activeBillings)}
              disabled={activeBillings.length === 0}
              title="Download clean Customer Shipping List (PDF) with full sender & receiver details to send to customers"
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md text-xs flex items-center justify-center gap-1.5 shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Customer Shipping List (PDF)</span>
            </button>

            <button
              onClick={() => exportCustomerShippingListToExcel(activeTab === 'shipping' ? filteredBillings : activeBillings)}
              disabled={activeBillings.length === 0}
              title="Export Customer Shipping List to Excel (.xlsx)"
              className="p-2 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-md text-xs flex items-center justify-center transition disabled:opacity-50 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            </button>
          </div>

          {/* Forwarder Cargo Manifest PDF */}
          <button
            onClick={() => downloadKathmanduShippingManifestPDF(activeBillings)}
            disabled={activeBillings.length === 0}
            title="Download Forwarder Cargo Dispatch & Airport Manifest (PDF)"
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-xs transition disabled:opacity-50 cursor-pointer"
          >
            <Truck className="w-3.5 h-3.5 text-slate-700" />
            <span>Forwarder Manifest</span>
          </button>

          <button
            onClick={onNewBilling}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Kathmandu Bill</span>
          </button>
        </div>
      </div>

      {/* Navigation View Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'active'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Active Billing Ledger ({activeBillings.length})</span>
          {activeBalanceDue > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'active' ? 'bg-blue-800 text-blue-100' : 'bg-amber-100 text-amber-800'}`}>
              Due: {formatCurrency(activeBalanceDue)}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('shipping')}
          className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'shipping'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Kathmandu Shipping Manifest / List ({activeBillings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settlements')}
          className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'settlements'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          <span>Settlement Archive & Past Batches ({settlementCycles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>All Records ({billings.length})</span>
        </button>
      </div>

      {/* Financial Metric Overview Cards (For Active Batch) */}
      {activeTab !== 'settlements' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="flex justify-between items-center text-slate-500 mb-1">
              <span className="text-xs font-semibold">Active Batch Bills</span>
              <Receipt className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{activeBillings.length}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Weight: <span className="font-bold text-slate-800">{activeTotalWeight.toFixed(1)} kg</span>
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="flex justify-between items-center text-slate-500 mb-1">
              <span className="text-xs font-semibold">Total Kathmandu Cost</span>
              <DollarSign className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(activeTotalCost)}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Freight, airport customs & handling
            </p>
          </div>

          <div className="bg-white rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 shadow-xs">
            <div className="flex justify-between items-center text-emerald-800 mb-1">
              <span className="text-xs font-semibold">Amount Paid So Far</span>
              <CreditCard className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-700 tracking-tight">
              {formatCurrency(activeTotalPaid)}
            </p>
            <div className="w-full bg-emerald-200/60 rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all"
                style={{ width: `${activeTotalCost > 0 ? Math.min(100, Math.round((activeTotalPaid / activeTotalCost) * 100)) : 0}%` }}
              ></div>
            </div>
          </div>

          <div className={`rounded-xl border p-4 shadow-xs ${activeBalanceDue > 0 ? 'bg-amber-50/40 border-amber-300' : 'bg-white border-slate-200'}`}>
            <div className="flex justify-between items-center text-amber-900 mb-1">
              <span className="text-xs font-semibold">Remaining Balance Left</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <p className={`text-2xl font-black tracking-tight ${activeBalanceDue > 0 ? 'text-amber-900' : 'text-slate-900'}`}>
              {formatCurrency(activeBalanceDue)}
            </p>
            <p className="text-[11px] text-amber-700 mt-0.5 font-medium">
              {activeBalanceDue > 0 ? 'Due to Kathmandu cargo forwarders' : 'All batch invoices fully settled ✓'}
            </p>
          </div>
        </div>
      )}

      {/* VIEW: Settlement Archive & Past Batches Tab */}
      {activeTab === 'settlements' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Settled Batches & Past Kathmandu Cycles ({settlementCycles.length})
              </h3>
              <p className="text-xs text-slate-500">
                Review historical settled batches, how much was paid, remaining balances, and reprint settlement vouchers
              </p>
            </div>
            {activeBillings.length > 0 && (
              <button
                onClick={handleOpenSettlementModal}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Settle Current Active List</span>
              </button>
            )}
          </div>

          {settlementCycles.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Archive className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Settlement Cycles Created Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                When you finish paying or want to freeze a batch of Kathmandu invoices, click "Settle Batch & Start New List" to record how much was paid and start over fresh.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {settlementCycles.map((cycle) => {
                const cycleBills = billings.filter((b) => (cycle.bill_ids || []).includes(b.id));

                return (
                  <div
                    key={cycle.id}
                    className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-blue-300 transition space-y-4"
                  >
                    <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                          Settlement Cycle
                        </span>
                        <h4 className="text-base font-bold text-slate-900 mt-1">
                          {cycle.cycle_name}
                        </h4>
                        <p className="text-xs text-slate-500">
                          Settled on <span className="font-semibold text-slate-700">{cycle.settled_date}</span> • {cycle.bill_count} Bills
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setPrintingSettlement({ cycle, billings })}
                          title="Print Settlement Voucher"
                          className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded transition cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleReopenCycle(cycle.id, cycle.cycle_name)}
                          title="Re-open Cycle (Move bills back to active list)"
                          className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded transition cursor-pointer text-xs flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Financial stats of this cycle */}
                    <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Total Billed</span>
                        <span className="font-bold text-slate-800">{formatCurrency(cycle.total_billed)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-700 font-semibold block">Paid in Batch</span>
                        <span className="font-bold text-emerald-700">{formatCurrency(cycle.total_paid)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-800 block">Balance Left</span>
                        <span className="font-bold text-amber-900">{formatCurrency(cycle.remaining_due)}</span>
                      </div>
                    </div>

                    {cycle.notes && (
                      <p className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded">
                        "{cycle.notes}"
                      </p>
                    )}

                    <div className="flex justify-between items-center pt-2 text-xs">
                      <span className="text-slate-500 font-mono text-[11px]">
                        Ref: {cycle.reference_no || cycle.id}
                      </span>
                      <button
                        onClick={() => setViewingSettlementCycle(cycle)}
                        className="text-blue-600 hover:underline font-bold flex items-center gap-1"
                      >
                        <span>View {cycleBills.length} Invoices</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW: Active Ledger, Shipping Manifest, & All Records Tables */}
      {activeTab !== 'settlements' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by KTM Bill #, Customer Ref, Consignee, Country, AWB #, Vehicle..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {activeTab === 'shipping' ? (
                <select
                  value={shippingFilter}
                  onChange={(e) => setShippingFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-700"
                >
                  <option value="all">All Shipping Statuses</option>
                  <option value="Pending Dispatch">Pending Dispatch</option>
                  <option value="In Transit to KTM">In Transit to KTM</option>
                  <option value="Received at KTM Hub">Received at KTM Hub</option>
                  <option value="Customs Cleared at TIA">Customs Cleared at TIA</option>
                  <option value="Dispatched / Air Shipped">Dispatched / Air Shipped</option>
                  <option value="Delivered">Delivered</option>
                </select>
              ) : (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-700"
                >
                  <option value="all">All Payment Statuses</option>
                  <option value="Paid">Fully Paid (Settled)</option>
                  <option value="Partial">Partially Paid</option>
                  <option value="Unpaid">Unpaid / Credit Due</option>
                </select>
              )}

              <select
                value={linkFilter}
                onChange={(e) => setLinkFilter(e.target.value as any)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-700"
              >
                <option value="all">All Records</option>
                <option value="linked">Linked to Customer Bill</option>
                <option value="standalone">Standalone KTM Bills</option>
              </select>

              {activeTab === 'shipping' && (
                <button
                  onClick={() => setPrintingManifestBillings(filteredBillings)}
                  disabled={filteredBillings.length === 0}
                  className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Load Sheet</span>
                </button>
              )}
            </div>
          </div>

          {/* MAIN TABLE: Active Ledger / All Records Table */}
          {activeTab !== 'shipping' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              {filteredBillings.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">No Kathmandu Bills Found</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {searchTerm || statusFilter !== 'all'
                      ? 'No records match your filter criteria.'
                      : activeTab === 'active'
                      ? 'No active Kathmandu bills. All previous bills may have been settled. Click "New Kathmandu Bill" to start adding consignments!'
                      : 'No billing records found.'}
                  </p>
                  <button
                    onClick={onNewBilling}
                    className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs inline-flex items-center gap-1.5 transition shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Kathmandu Bill</span>
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-4">KTM Invoice #</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Customer & Linked Ref</th>
                        <th className="py-3 px-4">Consignee & Country</th>
                        <th className="py-3 px-4">Weight / Boxes</th>
                        <th className="py-3 px-4">Forwarder & AWB</th>
                        <th className="py-3 px-4 text-right">Total Cost</th>
                        <th className="py-3 px-4 text-right">Paid</th>
                        <th className="py-3 px-4 text-right">Balance Left</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Payment Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredBillings.map((bill) => {
                        const totalCost = Number(bill.total_cost) || 0;
                        const paid = bill.amount_paid !== undefined ? Number(bill.amount_paid) : (bill.payment_status === 'Paid' ? totalCost : 0);
                        const due = bill.amount_due !== undefined ? Number(bill.amount_due) : Math.max(0, totalCost - paid);
                        const effectiveStatus = due === 0 ? 'Paid' : (paid > 0 ? 'Partial' : 'Unpaid');

                        return (
                          <tr key={bill.id} className="hover:bg-slate-50/70 transition">
                            {/* KTM Invoice # */}
                            <td className="py-3.5 px-4 font-bold text-blue-700 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span>{bill.ktm_invoice_no}</span>
                              </div>
                              {bill.is_settled_archived && (
                                <span className="inline-block mt-0.5 text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200 font-medium">
                                  Archived Batch
                                </span>
                              )}
                            </td>

                            {/* Date */}
                            <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                              {bill.ktm_date}
                            </td>

                            {/* Customer & Linked Customer Ref */}
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-slate-900">{bill.sender_name}</div>
                              {bill.customer_invoice_no ? (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded border border-blue-200">
                                    Ref: {bill.customer_invoice_no}
                                  </span>
                                  {onViewCustomerInvoice && (
                                    <button
                                      onClick={() => onViewCustomerInvoice(bill.customer_invoice_no!)}
                                      className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                                      title="View Customer Invoice"
                                    >
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400">Standalone</span>
                              )}
                            </td>

                            {/* Consignee & Country */}
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-slate-900">{bill.receiver_name}</div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <span className="font-medium text-slate-700">{bill.country}</span>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-400">{bill.transport_type}</span>
                              </div>
                            </td>

                            {/* Weight / Boxes */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="font-bold text-slate-800">{bill.weight} kg</div>
                              <div className="text-[10px] text-slate-500">{bill.box_count} Box(es)</div>
                            </td>

                            {/* Forwarder & AWB */}
                            <td className="py-3.5 px-4">
                              <div className="font-medium text-slate-800 truncate max-w-[140px]">
                                {bill.forwarder_name || 'KTM Air Cargo'}
                              </div>
                              {bill.awb_no ? (
                                <div className="text-[10px] font-mono text-slate-600 font-bold">
                                  {bill.awb_no}
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400">No AWB yet</span>
                              )}
                            </td>

                            {/* Total Cost */}
                            <td className="py-3.5 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                              {formatCurrency(totalCost)}
                            </td>

                            {/* Paid */}
                            <td className="py-3.5 px-4 text-right font-bold text-emerald-700 whitespace-nowrap">
                              {formatCurrency(paid)}
                            </td>

                            {/* Balance Left */}
                            <td className={`py-3.5 px-4 text-right font-black whitespace-nowrap ${due > 0 ? 'text-amber-900 bg-amber-50/40' : 'text-slate-400'}`}>
                              {formatCurrency(due)}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <span
                                className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                  effectiveStatus === 'Paid'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : effectiveStatus === 'Partial'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {effectiveStatus === 'Paid' ? 'Paid' : effectiveStatus === 'Partial' ? 'Partial' : 'Unpaid'}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                {/* Record Payment Button */}
                                {due > 0 ? (
                                  <button
                                    onClick={() => handleOpenPaymentModal(bill)}
                                    title="Record payment & decrease balance left"
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold flex items-center gap-1 transition shadow-xs cursor-pointer"
                                  >
                                    <CreditCard className="w-3 h-3" />
                                    <span>Pay</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setPaymentHistoryBilling(bill)}
                                    title="View payment receipt history"
                                    className="p-1 text-emerald-700 hover:bg-emerald-50 rounded transition"
                                  >
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  </button>
                                )}

                                {bill.payment_history && bill.payment_history.length > 0 && (
                                  <button
                                    onClick={() => setPaymentHistoryBilling(bill)}
                                    title="View Payment Logs & History"
                                    className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded transition"
                                  >
                                    <History className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <button
                                  onClick={() => downloadKathmanduBillingPDF(bill)}
                                  title="Download PDF"
                                  className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded transition cursor-pointer"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onPrintBilling(bill)}
                                  title="Print Document"
                                  className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded transition cursor-pointer"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onEditBilling(bill)}
                                  title="Edit Bill"
                                  className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded transition cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeletingId(bill.id)}
                                  title="Delete Bill"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* VIEW: Dedicated Kathmandu Shipping Manifest & Cargo List Table */}
          {activeTab === 'shipping' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              {filteredBillings.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Truck className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">No Shipping Consignments Found</h3>
                  <p className="text-xs text-slate-500">
                    No active cargo shipments currently match your filters.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-4">KTM Bill #</th>
                        <th className="py-3 px-4">AWB / Tracking #</th>
                        <th className="py-3 px-4">Shipper / Sender (Pokhara)</th>
                        <th className="py-3 px-4">Receiver / Consignee Details</th>
                        <th className="py-3 px-4 text-center">Weight & Boxes</th>
                        <th className="py-3 px-4">Manifest Cargo Items</th>
                        <th className="py-3 px-4">Vehicle & Contact</th>
                        <th className="py-3 px-4 text-center">Shipping Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredBillings.map((bill) => {
                        const itemsSummary = (bill.items || []).map((it) => `${it.quantity || 1}x ${it.item_name}`).join(', ');
                        const specialItems = (bill.items || []).filter((it) => it.item_type !== 'Normal');

                        return (
                          <tr key={bill.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-3.5 px-4 font-bold text-blue-700 whitespace-nowrap">
                              <div>{bill.ktm_invoice_no}</div>
                              {bill.customer_invoice_no && (
                                <span className="text-[10px] text-slate-500 font-normal">
                                  Ref: {bill.customer_invoice_no}
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-slate-800">
                              {bill.awb_no ? (
                                <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-800">
                                  {bill.awb_no}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-sans text-[11px]">Pending AWB</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 max-w-[220px]">
                              <div className="font-semibold text-slate-900">{bill.sender_name}</div>
                              {bill.sender_phone && (
                                <div className="text-[10.5px] text-slate-600 font-medium">Tel: {bill.sender_phone}</div>
                              )}
                              {bill.sender_address && (
                                <div className="text-[10px] text-slate-500 line-clamp-2">{bill.sender_address}</div>
                              )}
                            </td>

                            <td className="py-3.5 px-4 max-w-[240px]">
                              <div className="font-semibold text-slate-900">{bill.receiver_name}</div>
                              {bill.receiver_phone && (
                                <div className="text-[10.5px] text-slate-600 font-medium">Tel: {bill.receiver_phone}</div>
                              )}
                              {bill.receiver_address && (
                                <div className="text-[10px] text-slate-500 line-clamp-2">{bill.receiver_address}</div>
                              )}
                              <div className="text-[10.5px] text-blue-800 font-bold mt-0.5">
                                {bill.country} ({bill.transport_type || 'AIR'})
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <div className="font-bold text-slate-900">{bill.weight} kg</div>
                              <div className="text-[10px] text-slate-500">{bill.box_count || 1} Box(es)</div>
                            </td>

                            <td className="py-3.5 px-4 max-w-[200px]">
                              <div className="line-clamp-1 text-slate-800" title={itemsSummary}>
                                {itemsSummary || 'General Cargo Goods'}
                              </div>
                              {specialItems.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {specialItems.map((s, idx) => (
                                    <span
                                      key={idx}
                                      className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-50 text-amber-800 border border-amber-200 rounded"
                                    >
                                      {s.item_type} ({s.quantity}x)
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="font-medium text-slate-800">
                                {bill.vehicle_no || 'Pokhara Transport'}
                              </div>
                              {bill.driver_phone && (
                                <div className="text-[10px] text-slate-500">Tel: {bill.driver_phone}</div>
                              )}
                            </td>

                            {/* Interactive Shipping Status Selector */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <select
                                value={bill.shipping_status || 'Pending Dispatch'}
                                onChange={(e) => handleUpdateShippingStatus(bill.id, e.target.value as any)}
                                className={`text-[10px] font-bold rounded-lg px-2 py-1 border transition cursor-pointer ${
                                  bill.shipping_status === 'Delivered'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : bill.shipping_status === 'Dispatched / Air Shipped'
                                    ? 'bg-blue-50 text-blue-800 border-blue-300'
                                    : bill.shipping_status === 'Customs Cleared at TIA'
                                    ? 'bg-purple-50 text-purple-800 border-purple-300'
                                    : bill.shipping_status === 'In Transit to KTM'
                                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                                    : 'bg-slate-100 text-slate-700 border-slate-300'
                                }`}
                              >
                                <option value="Pending Dispatch">Pending Dispatch</option>
                                <option value="In Transit to KTM">In Transit to KTM</option>
                                <option value="Received at KTM Hub">Received at KTM Hub</option>
                                <option value="Customs Cleared at TIA">Customs Cleared at TIA</option>
                                <option value="Dispatched / Air Shipped">Dispatched / Air Shipped</option>
                                <option value="Delivered">Delivered</option>
                              </select>
                            </td>

                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => downloadSingleConsignmentShippingSlipPDF(bill)}
                                  title="Download Customer Shipping Slip (PDF) to share with customer"
                                  className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                                >
                                  <Send className="w-3 h-3 text-emerald-600" />
                                  <span>Customer Slip</span>
                                </button>
                                <button
                                  onClick={() => downloadKathmanduShippingManifestPDF([bill])}
                                  title="Download Shipping Manifest PDF for this Consignment"
                                  className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded transition cursor-pointer"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onPrintBilling(bill)}
                                  title="Print Document"
                                  className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded transition cursor-pointer"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onEditBilling(bill)}
                                  title="Edit Dispatch Details"
                                  className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded transition cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: RECORD PAYMENT & DECREASE AMOUNT LEFT MODAL           */}
      {/* ------------------------------------------------------------- */}
      {paymentModalBilling && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm sm:text-base">
                  Record Kathmandu Payment ({paymentModalBilling.ktm_invoice_no})
                </h3>
              </div>
              <button
                onClick={() => setPaymentModalBilling(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="p-5 space-y-4 text-xs">
              {/* Reconciliation Card */}
              {(() => {
                const totalCost = Number(paymentModalBilling.total_cost) || 0;
                const paid = paymentModalBilling.amount_paid !== undefined ? Number(paymentModalBilling.amount_paid) : 0;
                const due = Math.max(0, totalCost - paid);

                return (
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Customer / Consignee:</span>
                      <span className="font-bold text-slate-900">{paymentModalBilling.sender_name} ➔ {paymentModalBilling.receiver_name}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Total Billed Amount:</span>
                      <span className="font-bold text-slate-900">{formatCurrency(totalCost)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Amount Paid So Far:</span>
                      <span className="font-bold text-emerald-700">{formatCurrency(paid)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-amber-900 font-bold">
                      <span>Current Remaining Balance Left:</span>
                      <span className="text-sm font-black text-amber-900">{formatCurrency(due)}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Quick Fill Preset Buttons */}
              {(() => {
                const totalCost = Number(paymentModalBilling.total_cost) || 0;
                const paid = paymentModalBilling.amount_paid !== undefined ? Number(paymentModalBilling.amount_paid) : 0;
                const due = Math.max(0, totalCost - paid);

                return (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium">Quick Fill:</span>
                    <button
                      type="button"
                      onClick={() => setPayAmount(due)}
                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded border border-emerald-300 transition"
                    >
                      Pay Full Left ({formatCurrency(due)})
                    </button>
                    {due > 100 && (
                      <button
                        type="button"
                        onClick={() => setPayAmount(Math.round(due / 2))}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded border border-slate-300 transition"
                      >
                        Pay 50% ({formatCurrency(Math.round(due / 2))})
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Payment Amount Input */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Payment Amount to Deduct (NPR) *
                </label>
                <input
                  type="number"
                  min="1"
                  max={paymentModalBilling.total_cost}
                  value={payAmount || ''}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-black text-emerald-700"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800"
                  >
                    <option value="Bank Transfer">Bank Transfer (e.g. Nabil/Global)</option>
                    <option value="eSewa / Khalti">eSewa / Khalti</option>
                    <option value="Cash">Cash at Counter</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Bank Reference / Slip / Txn ID (Optional)
                </label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="e.g. NABIL-TXN-884920"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. Settled with KTM forwarder counter manager"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800"
                />
              </div>

              <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPaymentModalBilling(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Deduct Balance</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: SETTLE BATCH & START NEW LIST MODAL                   */}
      {/* ------------------------------------------------------------- */}
      {isSettlementModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-200" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    Settle Kathmandu Batch & Start New List
                  </h3>
                  <p className="text-[11px] text-amber-100">
                    Freeze current bills into a settlement cycle and start fresh
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSettlementModalOpen(false)}
                className="text-amber-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSettlementSubmit} className="p-5 space-y-4 text-xs">
              {/* Batch Financial Reconciliation Summary */}
              <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 space-y-2.5">
                <h4 className="font-black text-amber-900 uppercase text-[11px] tracking-wider">
                  Active Batch Clearance Overview
                </h4>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div>
                    <span className="text-slate-500 block">Total Invoices in Batch:</span>
                    <span className="font-bold text-slate-900">{activeBillings.length} Consignments</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Total Cargo Weight:</span>
                    <span className="font-bold text-slate-900">{activeTotalWeight.toFixed(1)} kg</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Total Billed Cost:</span>
                    <span className="font-bold text-rose-700 text-sm">{formatCurrency(activeTotalCost)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Total Paid So Far:</span>
                    <span className="font-bold text-emerald-700 text-sm">{formatCurrency(activeTotalPaid)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-200/80 flex justify-between items-center">
                  <span className="font-semibold text-amber-900">Current Remaining Balance Due:</span>
                  <span className="font-black text-amber-950 text-sm">{formatCurrency(activeBalanceDue)}</span>
                </div>
              </div>

              {/* Settlement Form Inputs */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Settlement Batch Name / Label *
                </label>
                <input
                  type="text"
                  value={cycleName}
                  onChange={(e) => setCycleName(e.target.value)}
                  placeholder="e.g. Kathmandu Batch #1 - Aug 2026"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Settlement Date *</label>
                  <input
                    type="date"
                    value={settledDate}
                    onChange={(e) => setSettledDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={settlePaymentMethod}
                    onChange={(e) => setSettlePaymentMethod(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="eSewa / Khalti">eSewa / Khalti</option>
                    <option value="Cash">Cash at Counter</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Forwarder / Cargo Hub</label>
                  <input
                    type="text"
                    value={settleForwarderName}
                    onChange={(e) => setSettleForwarderName(e.target.value)}
                    placeholder="e.g. Kathmandu Air Cargo"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Voucher / Bank Slip Ref</label>
                  <input
                    type="text"
                    value={settleRefNo}
                    onChange={(e) => setSettleRefNo(e.target.value)}
                    placeholder="e.g. BANK-SLIP-9921"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800"
                  />
                </div>
              </div>

              {/* Checkbox: Mark all remaining as paid now */}
              {activeBalanceDue > 0 && (
                <label className="flex items-center gap-2 p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={markAllRemainingPaid}
                    onChange={(e) => setMarkAllRemainingPaid(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-emerald-900 block">
                      Pay remaining balance of {formatCurrency(activeBalanceDue)} in full now
                    </span>
                    <span className="text-[10px] text-emerald-700">
                      Marks all {activeBillings.length} invoices as 100% cleared and paid in this settlement voucher
                    </span>
                  </div>
                </label>
              )}

              <div>
                <label className="block font-medium text-slate-700 mb-1">Settlement Remarks</label>
                <input
                  type="text"
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  placeholder="e.g. All Kathmandu forwarder dues cleared for this week's dispatches"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800"
                />
              </div>

              <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsSettlementModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition shadow-xs flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Archive Batch & Start New List</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: PAYMENT RECEIPT HISTORY MODAL                         */}
      {/* ------------------------------------------------------------- */}
      {paymentHistoryBilling && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm sm:text-base">
                  Payment History - {paymentHistoryBilling.ktm_invoice_no}
                </h3>
              </div>
              <button
                onClick={() => setPaymentHistoryBilling(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center">
                <div>
                  <span className="text-slate-500 block">Total Cost:</span>
                  <span className="font-bold text-slate-900 text-sm">{formatCurrency(paymentHistoryBilling.total_cost)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Paid:</span>
                  <span className="font-bold text-emerald-700 text-sm">{formatCurrency(paymentHistoryBilling.amount_paid || 0)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Remaining Due:</span>
                  <span className="font-bold text-amber-900 text-sm">{formatCurrency(paymentHistoryBilling.amount_due || 0)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 uppercase text-[11px]">
                  Payment Receipts Log:
                </h4>
                {paymentHistoryBilling.payment_history && paymentHistoryBilling.payment_history.length > 0 ? (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                    {paymentHistoryBilling.payment_history.map((rec, idx) => (
                      <div key={rec.id || idx} className="p-3 bg-white hover:bg-slate-50 flex justify-between items-center">
                        <div>
                          <div className="font-bold text-slate-900">{formatCurrency(rec.amount)}</div>
                          <div className="text-[11px] text-slate-500">
                            {rec.date} • {rec.payment_method} {rec.reference_no && `• Ref: ${rec.reference_no}`}
                          </div>
                          {rec.notes && (
                            <div className="text-[10px] text-slate-600 italic mt-0.5">{rec.notes}</div>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Recorded
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-lg text-center text-slate-500">
                    No partial payment receipts logged yet.
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setPaymentHistoryBilling(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 4: VIEW INVOICES IN SETTLED CYCLE                       */}
      {/* ------------------------------------------------------------- */}
      {viewingSettlementCycle && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[85vh] flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm sm:text-base">
                  {viewingSettlementCycle.cycle_name}
                </h3>
                <p className="text-xs text-slate-400">
                  Settled on {viewingSettlementCycle.settled_date} • {viewingSettlementCycle.bill_count} Bills
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setPrintingSettlement({ cycle: viewingSettlementCycle, billings });
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Voucher</span>
                </button>
                <button
                  onClick={() => setViewingSettlementCycle(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="py-2 px-3">KTM Bill #</th>
                    <th className="py-2 px-3">Customer / Consignee</th>
                    <th className="py-2 px-3">Country</th>
                    <th className="py-2 px-3 text-center">Weight</th>
                    <th className="py-2 px-3 text-right">Billed Cost</th>
                    <th className="py-2 px-3 text-right">Paid Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {billings
                    .filter((b) => (viewingSettlementCycle.bill_ids || []).includes(b.id))
                    .map((b) => (
                      <tr key={b.id}>
                        <td className="py-2.5 px-3 font-bold text-blue-700">{b.ktm_invoice_no}</td>
                        <td className="py-2.5 px-3">{b.sender_name} ➔ {b.receiver_name}</td>
                        <td className="py-2.5 px-3">{b.country}</td>
                        <td className="py-2.5 px-3 text-center font-bold">{b.weight} kg</td>
                        <td className="py-2.5 px-3 text-right font-semibold">{formatCurrency(b.total_cost)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{formatCurrency(b.amount_paid || b.total_cost)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setViewingSettlementCycle(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PRINT PREVIEW MODAL: KATHMANDU SHIPPING MANIFEST               */}
      {/* ------------------------------------------------------------- */}
      {printingManifestBillings && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                  <span>Kathmandu Shipping & Dispatch Manifest</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-600 text-white font-mono">
                    {printingManifestBillings.length} Consignments
                  </span>
                </h3>
                <p className="text-xs text-slate-300">
                  Ready for A4 printer or cargo dispatch loading sheet
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintShippingManifest}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Manifest</span>
                </button>
                <button
                  onClick={() => exportKathmanduShippingManifestToExcel(printingManifestBillings)}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export Excel</span>
                </button>
                <button
                  onClick={() => setPrintingManifestBillings(null)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-100 flex justify-center">
              <div className="bg-white shadow-lg rounded-lg max-w-3xl w-full p-2 border border-slate-200">
                <PrintKathmanduShippingManifest
                  ref={shippingPrintRef}
                  billings={printingManifestBillings}
                  title="Kathmandu Cargo Dispatch Manifest"
                />
              </div>
            </div>

            <div className="p-3 bg-white border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setPrintingManifestBillings(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-lg transition cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PRINT PREVIEW MODAL: KATHMANDU SETTLEMENT VOUCHER              */}
      {/* ------------------------------------------------------------- */}
      {printingSettlement && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                  <span>Kathmandu Settlement Clearance Voucher</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-600 text-white font-mono">
                    {printingSettlement.cycle.cycle_name}
                  </span>
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintSettlementVoucher}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Voucher</span>
                </button>
                <button
                  onClick={() => setPrintingSettlement(null)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-100 flex justify-center">
              <div className="bg-white shadow-lg rounded-lg max-w-2xl w-full p-2 border border-slate-200">
                <PrintKathmanduSettlement
                  ref={settlementPrintRef}
                  cycle={printingSettlement.cycle}
                  billings={printingSettlement.billings}
                />
              </div>
            </div>

            <div className="p-3 bg-white border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setPrintingSettlement(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-lg transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Delete Kathmandu Bill</h4>
                <p className="text-xs text-slate-500">
                  Are you sure you want to delete this Kathmandu billing record?
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200">
              The overall profit and Kathmandu purchase cost calculations will update immediately.
            </p>

            <div className="flex justify-end items-center gap-2 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteConfirm(deletingId)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
