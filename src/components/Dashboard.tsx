import React, { useState, useMemo } from 'react';
import { Invoice, Expense, KathmanduBilling } from '../types';
import { formatCurrency, calculateFinancialSummary, calculateTotalPurchaseForInvoices } from '../lib/rateCalculator';
import { QuickGuideModal } from './QuickGuideModal';
import {
  TrendingUp,
  CreditCard,
  CircleDollarSign,
  Receipt,
  Wallet,
  PlusCircle,
  FileSpreadsheet,
  ArrowUpRight,
  Filter,
  Printer,
  X,
  Info,
  Sparkles,
  Search,
  HelpCircle,
  Package,
  Boxes,
  Truck,
  ArrowRight,
  Building2,
  Link as LinkIcon,
  CheckCircle2,
  TrendingDown,
} from 'lucide-react';

interface DashboardProps {
  invoices: Invoice[];
  ktmBillings?: KathmanduBilling[];
  expenses: Expense[];
  onNavigate: (tab: string) => void;
  onViewInvoice: (invoiceId: string) => void;
  onNewKtmBilling?: (customerInvoiceId?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  invoices,
  ktmBillings = [],
  expenses,
  onNavigate,
  onViewInvoice,
  onNewKtmBilling,
}) => {
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');

  // Filtered invoices according to selected date range
  const filteredInvoices = useMemo(() => {
    if (dateRange === 'all') return invoices;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return invoices.filter((inv) => {
      if (!inv.invoice_date) return true;
      if (dateRange === 'today') {
        return inv.invoice_date === todayStr;
      }
      if (dateRange === 'week') {
        const invDate = new Date(inv.invoice_date);
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return invDate >= weekAgo;
      }
      if (dateRange === 'month') {
        const invDate = new Date(inv.invoice_date);
        return (
          invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear()
        );
      }
      return true;
    });
  }, [invoices, dateRange]);

  // Filtered Kathmandu billings according to selected date range
  const filteredKtmBillings = useMemo(() => {
    if (dateRange === 'all') return ktmBillings;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return ktmBillings.filter((kb) => {
      if (!kb.ktm_date) return true;
      if (dateRange === 'today') return kb.ktm_date === todayStr;
      if (dateRange === 'week') {
        const d = new Date(kb.ktm_date);
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return d >= weekAgo;
      }
      if (dateRange === 'month') {
        const d = new Date(kb.ktm_date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [ktmBillings, dateRange]);

  // Filtered expenses according to selected date range
  const filteredExpenses = useMemo(() => {
    if (dateRange === 'all') return expenses;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return expenses.filter((exp) => {
      if (!exp.expense_date) return true;
      if (dateRange === 'today') {
        return exp.expense_date === todayStr;
      }
      if (dateRange === 'week') {
        const expDate = new Date(exp.expense_date);
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return expDate >= weekAgo;
      }
      if (dateRange === 'month') {
        const expDate = new Date(exp.expense_date);
        return (
          expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear()
        );
      }
      return true;
    });
  }, [expenses, dateRange]);

  // Calculate comprehensive Financial Summary using exact formula:
  // Profit = Customer Revenue − Kathmandu Cost/Billing − Expenses
  const financials = useMemo(() => {
    return calculateFinancialSummary(filteredInvoices, filteredKtmBillings, filteredExpenses);
  }, [filteredInvoices, filteredKtmBillings, filteredExpenses]);

  // Search results for fast lookup across both customer invoices & ktm billings
  const searchResults = useMemo(() => {
    const q = quickSearch.trim().toLowerCase();
    if (!q) return [];
    return invoices
      .filter(
        (inv) =>
          inv.invoice_no.toLowerCase().includes(q) ||
          inv.sender_name.toLowerCase().includes(q) ||
          inv.receiver_name.toLowerCase().includes(q) ||
          inv.phone.includes(q) ||
          (inv.awb_no && inv.awb_no.toLowerCase().includes(q))
      )
      .slice(0, 5);
  }, [invoices, quickSearch]);

  const purchaseSummary = useMemo(
    () => calculateTotalPurchaseForInvoices(filteredInvoices),
    [filteredInvoices]
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Financial Overview & Dual Billing Analytics</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time profit tracking for The Courier Station Pokhara
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Beginner Help Button */}
          <button
            type="button"
            onClick={() => setIsGuideOpen(true)}
            className="px-3.5 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 flex items-center gap-1.5 transition"
          >
            <HelpCircle className="w-4 h-4 text-blue-600" />
            <span>💡 How Billing Works</span>
          </button>

          {/* Date Filter Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 self-start sm:self-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1" />
            <button
              onClick={() => setDateRange('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                dateRange === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setDateRange('month')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                dateRange === 'month'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setDateRange('week')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                dateRange === 'week'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setDateRange('today')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                dateRange === 'today'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
          </div>
        </div>
      </div>

      {/* DUAL BILLING PROFIT FORMULA BANNER (Unified Single Financial Summary) */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-300">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block">
                Financial Accounting Standard
              </span>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Net Profit = Customer Revenue − Kathmandu Cost − Expenses
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('billing')}
              className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Customer Bill</span>
            </button>
            <button
              onClick={() => onNavigate('kathmandu_billing')}
              className="px-3.5 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-blue-300 border border-blue-400/30 rounded-lg transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>+ Kathmandu Bill</span>
            </button>
          </div>
        </div>

        {/* Live Calculation Formula Visualizer Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* 1. Customer Revenue */}
          <div
            onClick={() => onNavigate('invoices')}
            className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 rounded-xl p-4 space-y-1 transition cursor-pointer group"
            title="Click to view Customer Invoices"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">1. Customer Revenue</span>
              <Receipt className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-emerald-400">
              +{formatCurrency(financials.totalCustomerRevenue)}
            </p>
            <p className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>{financials.customerInvoicesCount} Customer Invoices</span>
              <span className="text-emerald-400 font-semibold group-hover:underline text-[10px]">View &rarr;</span>
            </p>
          </div>

          {/* 2. Kathmandu Cost */}
          <div
            onClick={() => onNavigate('kathmandu_billing')}
            className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-rose-500/50 rounded-xl p-4 space-y-1 transition cursor-pointer group"
            title="Click to view Kathmandu Billing records"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">2. Kathmandu Cost / Billing</span>
              <Building2 className="w-4 h-4 text-rose-400 group-hover:scale-110 transition" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-rose-400">
              −{formatCurrency(financials.totalKathmanduCost)}
            </p>
            <p className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>{financials.kathmanduBillingsCount} KTM Bills</span>
              <span className="text-rose-400 font-semibold group-hover:underline text-[10px]">View &rarr;</span>
            </p>
          </div>

          {/* 3. Expenses */}
          <div
            onClick={() => onNavigate('expenses')}
            className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/50 rounded-xl p-4 space-y-1 transition cursor-pointer group"
            title="Click to view Station Expenses"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">3. Station Expenses</span>
              <Wallet className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-amber-400">
              −{formatCurrency(financials.totalExpenses)}
            </p>
            <p className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>{financials.expensesCount} expenses</span>
              <span className="text-amber-400 font-semibold group-hover:underline text-[10px]">View &rarr;</span>
            </p>
          </div>

          {/* 4. Net Profit */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 border border-blue-400/40 rounded-xl p-4 space-y-1 shadow-md">
            <div className="flex items-center justify-between text-blue-100">
              <span className="font-bold uppercase tracking-wider text-[10px]">= Overall Net Profit</span>
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <p className={`text-xl sm:text-2xl font-black ${financials.netProfit >= 0 ? 'text-white' : 'text-amber-200'}`}>
              {formatCurrency(financials.netProfit)}
            </p>
            <p className="text-[11px] text-blue-100 flex items-center justify-between">
              <span>Gross Profit: {formatCurrency(financials.grossProfit)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* EASY 1-CLICK BILLING HERO BANNER */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-2xl p-5 sm:p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-[11px] font-extrabold uppercase tracking-wider text-blue-100">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>New: Super Simple Guided Mode</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
            Create courier bills in 3 easy steps!
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
            Anyone aged 13+ can create, calculate, and print official courier invoices. Just choose destination country, pick weight, and click items!
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          <button
            type="button"
            onClick={() => onNavigate('billing')}
            className="px-6 py-3 bg-white hover:bg-blue-50 text-blue-700 font-black text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2 group cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
            <span>Start Easy Billing Now</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* INSTANT INVOICE SEARCH BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            placeholder="Quick search invoice by Sender, Receiver, Phone, Invoice # or AWB tracking..."
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
          />
          {quickSearch && (
            <button
              onClick={() => setQuickSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Results Preview */}
        {quickSearch && (
          <div className="pt-2 border-t border-slate-100">
            {searchResults.length > 0 ? (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Matching Invoices ({searchResults.length}):
                </span>
                {searchResults.map((inv) => (
                  <div
                    key={inv.id}
                    onClick={() => onViewInvoice(inv.id)}
                    className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl transition cursor-pointer flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-blue-600">{inv.invoice_no}</span>
                      <span className="font-bold text-slate-800">{inv.sender_name} → {inv.receiver_name}</span>
                      <span className="text-[10px] px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md font-semibold">
                        {inv.country} ({inv.weight} kg)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 font-mono">
                        {formatCurrency(inv.sale_amount + (inv.custom_duty_amount || 0) - (inv.discount_amount || 0))}
                      </span>
                      <span className="text-blue-600 text-[11px] font-bold hover:underline">
                        View & Print →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-1 italic">
                No invoices match "{quickSearch}". Try typing a phone number or customer name.
              </p>
            )}
          </div>
        )}
      </div>



      {/* Quick Action Shortcuts & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Operations Panel */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="font-bold text-slate-900 text-sm tracking-tight border-b border-slate-100 pb-2">
            Quick Operations
          </h2>
          <div className="space-y-3">
            <button
              onClick={() => onNavigate('billing')}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 text-white rounded-lg font-bold">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700 flex items-center gap-1.5">
                    <span>Customer Billing</span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] uppercase font-bold">Flow 1</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Create customer invoices, calculate rates & discounts
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={() => onNavigate('kathmandu_billing')}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-blue-200 bg-blue-50/40 hover:bg-blue-100/60 transition group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-900 text-blue-300 rounded-lg font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700 flex items-center gap-1.5">
                    <span>Kathmandu Billing</span>
                    <span className="px-1.5 py-0.2 rounded bg-blue-200 text-blue-800 text-[9px] uppercase font-bold">Flow 2</span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Auto-fetch customer data & log forwarder purchase cost
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={() => onNavigate('documents')}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg font-bold">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 flex items-center gap-1.5">
                    <span>Documents & Manifests</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Packing list manifests & export documentation
                  </div>
                </div>
              </div>
            </button>

            <button
              onClick={() => onNavigate('expenses')}
              className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-rose-500 hover:bg-rose-50/50 transition group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-100 text-rose-700 rounded-lg font-bold">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-rose-700">
                    Log Station Expense
                  </div>
                  <div className="text-[11px] text-slate-500">Track packaging, utilities, rent</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Invoices Feed */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-2">
              <Receipt className="w-4 h-4 text-blue-600" />
              <span>Recent Customer Invoices ({filteredInvoices.length})</span>
            </h2>
            <button
              onClick={() => onNavigate('invoices')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View All Invoices &rarr;
            </button>
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No invoices recorded for the selected date range.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredInvoices.slice(0, 5).map((inv) => {
                const billedAmt = Math.max(0, inv.sale_amount + (inv.custom_duty_amount || 0) - (inv.discount_amount || 0));
                const hasKtmBill = ktmBillings.some(
                  (k) => k.customer_invoice_id === inv.id || (k.customer_invoice_no && inv.invoice_no && k.customer_invoice_no.toLowerCase() === inv.invoice_no.toLowerCase())
                );

                return (
                  <div
                    key={inv.id}
                    onClick={() => onViewInvoice(inv.id)}
                    className="py-3 flex items-center justify-between hover:bg-slate-50/80 px-2 rounded-lg cursor-pointer transition"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-700">
                          {inv.invoice_no}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                          {inv.country}
                        </span>
                        {hasKtmBill ? (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-0.5">
                            <LinkIcon className="w-2.5 h-2.5" />
                            <span>KTM Billed</span>
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            Unlinked KTM
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        Customer: <strong className="text-slate-800">{inv.sender_name}</strong> •{' '}
                        {inv.weight} kg ({inv.box_count} Box)
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-slate-900 text-xs">
                        {formatCurrency(billedAmt)}
                      </div>
                      <div className="text-[10px] text-blue-600 font-semibold">
                        Profit: {formatCurrency(inv.profit_amount)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Beginner Quick Guide Modal */}
      <QuickGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onStartEasyBill={() => {
          setIsGuideOpen(false);
          onNavigate('billing');
        }}
      />
    </div>
  );
};
