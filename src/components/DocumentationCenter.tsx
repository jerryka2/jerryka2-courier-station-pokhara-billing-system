import React, { useState, useMemo, useRef } from 'react';
import { Invoice, UserRole, PDFVersion } from '../types';
import {
  formatCurrency,
  getInvoiceWeightBreakdown,
  getInvoiceMeatBreakdown,
  getInvoicePurchaseBreakdown,
} from '../lib/rateCalculator';
import {
  exportSalesDocumentationToExcel,
  exportMeatDocumentationToExcel,
  exportPurchaseListBreakdownToExcel,
  exportInvoiceToExcel,
} from '../lib/excelExporter';
import { downloadInvoicePDF } from '../lib/pdfGenerator';
import { PrintDocument } from './PrintDocument';
import { useReactToPrint } from 'react-to-print';
import {
  FileSpreadsheet,
  FileText,
  Printer,
  Download,
  Search,
  Filter,
  Scale,
  Layers,
  TrendingUp,
  Package,
  Eye,
  X,
  Boxes,
  Truck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  Globe,
  Calendar,
  Sparkles,
  Building2,
  Mail,
} from 'lucide-react';

interface DocumentationCenterProps {
  invoices: Invoice[];
  role: UserRole | null;
  onViewInvoice: (id: string) => void;
  onEditInvoice: (inv: Invoice) => void;
  onPrintInvoice: (inv: Invoice, version: PDFVersion) => void;
}

type DocTab = 'sales_master' | 'customer_bills' | 'meat_clearance' | 'packing_manifest' | 'purchase_bills';

export const DocumentationCenter: React.FC<DocumentationCenterProps> = ({
  invoices,
  role,
  onViewInvoice,
  onEditInvoice,
  onPrintInvoice,
}) => {
  const [activeDocTab, setActiveDocTab] = useState<DocTab>('sales_master');
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState('ALL');
  const [shipperFilter, setShipperFilter] = useState('ALL');
  const [commodityFilter, setCommodityFilter] = useState<'ALL' | 'MEAT' | 'VOL_PROFIT' | 'UNPAID' | 'DISPATCHED'>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH'>('ALL');

  // Quick Document Preview Modal State
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [previewVersion, setPreviewVersion] = useState<PDFVersion>('customer');

  const printModalRef = useRef<HTMLDivElement>(null);
  const handlePrintPreview = useReactToPrint({
    contentRef: printModalRef,
    documentTitle: previewInvoice ? `${previewInvoice.invoice_no}_${previewVersion}` : 'Document',
  });

  // Extract unique countries
  const countries = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((inv) => {
      if (inv.country) set.add(inv.country.trim());
    });
    return Array.from(set).sort();
  }, [invoices]);

  // Extract unique shippers
  const shippers = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((inv) => {
      if (inv.shipper_name) set.add(inv.shipper_name.trim());
    });
    return Array.from(set).sort();
  }, [invoices]);

  // Overall Global Documentation Calculations
  const stats = useMemo(() => {
    let totalInvoices = invoices.length;
    let totalBoxes = 0;
    let totalNetWeight = 0;
    let totalVolWeight = 0;
    let totalBillableWeight = 0;
    let totalVolProfitWeight = 0;
    let totalVolProfitAmount = 0;

    let meatInvoiceCount = 0;
    let totalMeatWeight = 0;
    let totalMeatSurcharges = 0;
    let totalMeatPurchaseCost = 0;
    let totalMeatProfit = 0;

    let totalGrossSales = 0;
    let totalCustomDuty = 0;
    let totalDiscounts = 0;
    let totalNetRevenue = 0;
    let totalPurchaseCost = 0;
    let totalNetProfit = 0;

    invoices.forEach((inv) => {
      const wb = getInvoiceWeightBreakdown(inv);
      const meat = getInvoiceMeatBreakdown(inv);
      const customDuty = inv.custom_duty_amount ?? (500 * (inv.box_count || 1));
      const discount = inv.discount_amount || 0;
      const netBilled = Math.max(0, inv.sale_amount + customDuty - discount);
      const purchase = inv.purchase_amount || 0;
      const profit = inv.profit_amount || (netBilled - purchase);

      totalBoxes += inv.box_count || 1;
      totalNetWeight += wb.netWeight;
      totalVolWeight += wb.volumeWeight;
      totalBillableWeight += wb.billableWeight;
      totalVolProfitWeight += wb.volumeProfitWeight;
      totalVolProfitAmount += wb.volumeProfitAmount;

      if (meat.hasMeat) {
        meatInvoiceCount += 1;
        totalMeatWeight += meat.meatWeight;
        totalMeatSurcharges += meat.meatExtraCharge;
        totalMeatPurchaseCost += meat.meatPurchaseCost;
        totalMeatProfit += meat.meatProfit;
      }

      totalGrossSales += inv.sale_amount || 0;
      totalCustomDuty += customDuty;
      totalDiscounts += discount;
      totalNetRevenue += netBilled;
      totalPurchaseCost += purchase;
      totalNetProfit += profit;
    });

    return {
      totalInvoices,
      totalBoxes,
      totalNetWeight: Number(totalNetWeight.toFixed(2)),
      totalVolWeight: Number(totalVolWeight.toFixed(2)),
      totalBillableWeight: Number(totalBillableWeight.toFixed(2)),
      totalVolProfitWeight: Number(totalVolProfitWeight.toFixed(2)),
      totalVolProfitAmount,
      meatInvoiceCount,
      totalMeatWeight: Number(totalMeatWeight.toFixed(2)),
      totalMeatSurcharges,
      totalMeatPurchaseCost,
      totalMeatProfit,
      totalGrossSales,
      totalCustomDuty,
      totalDiscounts,
      totalNetRevenue,
      totalPurchaseCost,
      totalNetProfit,
    };
  }, [invoices]);

  // Filtered List for Current Tab
  const filteredInvoices = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return invoices.filter((inv) => {
      // Search
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchNo = (inv.invoice_no || '').toLowerCase().includes(q);
        const matchSender = (inv.sender_name || '').toLowerCase().includes(q);
        const matchReceiver = (inv.receiver_name || '').toLowerCase().includes(q);
        const matchPhone = (inv.phone || '').toLowerCase().includes(q);
        const matchAwb = (inv.awb_no || '').toLowerCase().includes(q);
        const matchCountry = (inv.country || '').toLowerCase().includes(q);
        const matchItem = (inv.items || []).some((it) => (it.item_name || '').toLowerCase().includes(q));

        if (!matchNo && !matchSender && !matchReceiver && !matchPhone && !matchAwb && !matchCountry && !matchItem) {
          return false;
        }
      }

      // Country filter
      if (countryFilter !== 'ALL' && inv.country !== countryFilter) {
        return false;
      }

      // Shipper filter
      if (shipperFilter !== 'ALL') {
        const invShipper = inv.shipper_name || 'The Courier Station Pokhara';
        if (invShipper !== shipperFilter) return false;
      }

      // Commodity / Feature filter
      const wb = getInvoiceWeightBreakdown(inv);
      const meat = getInvoiceMeatBreakdown(inv);

      if (commodityFilter === 'MEAT' && !meat.hasMeat) return false;
      if (commodityFilter === 'VOL_PROFIT' && !wb.isVolumetricCharged) return false;
      if (commodityFilter === 'UNPAID' && inv.payment_status === 'Paid') return false;
      if (commodityFilter === 'DISPATCHED' && inv.status !== 'Dispatched') return false;

      // Date filter
      if (dateFilter === 'TODAY' && inv.invoice_date !== todayStr) return false;
      if (dateFilter === 'THIS_WEEK') {
        const invDate = new Date(inv.invoice_date);
        const diffDays = (now.getTime() - invDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 7 || diffDays < 0) return false;
      }
      if (dateFilter === 'THIS_MONTH') {
        const invDate = new Date(inv.invoice_date);
        if (invDate.getMonth() !== now.getMonth() || invDate.getFullYear() !== now.getFullYear()) return false;
      }

      // Tab specific filters
      if (activeDocTab === 'meat_clearance' && !meat.hasMeat) return false;

      return true;
    });
  }, [invoices, searchTerm, countryFilter, commodityFilter, dateFilter, activeDocTab]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Fast Export Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl shadow-2xs">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  <span>Documentation & Manifests Center</span>
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200 font-semibold">
                    Live Records
                  </span>
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Sales Documentation, Dry Meat Quarantine Manifests, Item Packing Lists & Carrier Cost Audits
                </p>
              </div>
            </div>
          </div>

          {/* Master Export Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportSalesDocumentationToExcel(filteredInvoices)}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
              title="Download full 4-sheet Sales Documentation Workbook (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Sales Documentation (.xlsx)</span>
            </button>

            <button
              onClick={() => exportMeatDocumentationToExcel(filteredInvoices)}
              className="flex items-center gap-2 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
              title="Download Dry Meat (Sukuti) Clearance Manifest (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Meat & Sukuti Manifest (.xlsx)</span>
            </button>

            <button
              onClick={() => exportPurchaseListBreakdownToExcel(filteredInvoices)}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
              title="Download Carrier Purchase & Cost Breakdown (.xlsx)"
            >
              <Download className="w-4 h-4" />
              <span>Purchase Bill (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Global Documentation KPI Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-3 border-t border-slate-100">
          {/* Total Invoices */}
          <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Documents</span>
            <span className="text-base font-extrabold text-slate-900">{stats.totalInvoices} Invoices</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">{stats.totalBoxes} Boxes</span>
          </div>

          {/* Scale Net Weight */}
          <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 font-bold uppercase block flex items-center justify-between">
              <span>Scale Net Wt</span>
              <Scale className="w-3 h-3 text-slate-400" />
            </span>
            <span className="text-base font-extrabold text-slate-900">{stats.totalNetWeight} kg</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Physical Scale</span>
          </div>

          {/* Volumetric Weight */}
          <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100">
            <span className="text-[10px] text-indigo-700 font-bold uppercase block flex items-center justify-between">
              <span>Volume Wt</span>
              <Layers className="w-3 h-3 text-indigo-500" />
            </span>
            <span className="text-base font-extrabold text-indigo-950">{stats.totalVolWeight} kg</span>
            <span className="text-[10px] text-indigo-600 font-bold block mt-0.5">
              +{stats.totalVolProfitWeight} kg Vol Margin
            </span>
          </div>

          {/* Dry Meat (Sukuti) Weight */}
          <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/80">
            <span className="text-[10px] text-amber-800 font-bold uppercase block flex items-center justify-between">
              <span>🥩 Dry Meat Net Wt</span>
              <span className="text-[9px] bg-amber-200 text-amber-900 px-1 rounded font-bold">{stats.meatInvoiceCount} Inv</span>
            </span>
            <span className="text-base font-extrabold text-amber-950">{stats.totalMeatWeight} kg</span>
            <span className="text-[10px] text-amber-700 font-bold block mt-0.5">
              +{formatCurrency(stats.totalMeatSurcharges)} Surcharge
            </span>
          </div>

          {/* Net Billed Sales */}
          <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Sales</span>
            <span className="text-base font-extrabold text-blue-900">{formatCurrency(stats.totalNetRevenue)}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Customer Billed</span>
          </div>

          {/* Total Purchase Cost */}
          <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-500 font-bold uppercase block">Carrier Cost</span>
            <span className="text-base font-extrabold text-slate-800">{formatCurrency(stats.totalPurchaseCost)}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Purchase Total</span>
          </div>

          {/* Total Net Profit */}
          <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-emerald-700 font-bold uppercase block flex items-center justify-between">
              <span>Net Station Profit</span>
              <TrendingUp className="w-3 h-3 text-emerald-600" />
            </span>
            <span className="text-base font-black text-emerald-800">{formatCurrency(stats.totalNetProfit)}</span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">Documented Margin</span>
          </div>
        </div>
      </div>

      {/* Main Documentation Navigation View Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'sales_master', label: '📊 Master Sales Documentation', count: invoices.length },
              { id: 'customer_bills', label: '📄 Commercial Customer Bills', count: invoices.length },
              { id: 'meat_clearance', label: '🥩 Dry Meat (Sukuti) Clearances', count: stats.meatInvoiceCount, highlight: true },
              { id: 'packing_manifest', label: '📦 Cargo Item Manifests', count: invoices.length },
              { id: 'purchase_bills', label: '📋 Carrier Purchase Audits', count: invoices.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveDocTab(tab.id as DocTab)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeDocTab === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  activeDocTab === tab.id
                    ? 'bg-white/20 text-white'
                    : tab.highlight
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 font-bold'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-500 font-semibold">
            Showing <strong className="text-slate-900">{filteredInvoices.length}</strong> of {invoices.length} Record(s)
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Invoice No, Sender, Consignee, Phone, AWB Tracking # or Item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Shipper & Country Filter Strip */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Shipper Station Filter */}
            <select
              value={shipperFilter}
              onChange={(e) => setShipperFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 cursor-pointer w-full sm:w-auto"
            >
              <option value="ALL">🏢 All Shipper Stations</option>
              {shippers.map((s) => (
                <option key={s} value={s}>
                  🏢 {s}
                </option>
              ))}
            </select>

            {/* Country Filter */}
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 cursor-pointer w-full sm:w-auto"
            >
              <option value="ALL">🌍 All Destination Countries</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Commodity / Trait Filter */}
            <select
              value={commodityFilter}
              onChange={(e) => setCommodityFilter(e.target.value as any)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 cursor-pointer w-full sm:w-auto"
            >
              <option value="ALL">⚡ All Goods Types</option>
              <option value="MEAT">🥩 Dry Meat / Sukuti Only</option>
              <option value="VOL_PROFIT">🌟 Volumetric Margin Only</option>
              <option value="UNPAID">⏳ Unpaid / Partial Only</option>
              <option value="DISPATCHED">🚚 Dispatched Invoices</option>
            </select>

            {/* Date Range */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 cursor-pointer w-full sm:w-auto"
            >
              <option value="ALL">📅 All Dates</option>
              <option value="TODAY">Today</option>
              <option value="THIS_WEEK">This Week (7 Days)</option>
              <option value="THIS_MONTH">This Month</option>
            </select>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: MASTER SALES DOCUMENTATION TABLE */}
        {/* ========================================================================= */}
        {activeDocTab === 'sales_master' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">Invoice No</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Sender / Consignee</th>
                  <th className="py-3 px-3">Destination</th>
                  <th className="py-3 px-3 text-center">Boxes</th>
                  <th className="py-3 px-3 text-right">Net Wt</th>
                  <th className="py-3 px-3 text-right">Meat Wt</th>
                  <th className="py-3 px-3 text-right">Vol Wt</th>
                  <th className="py-3 px-3 text-right">Billed Wt</th>
                  <th className="py-3 px-3 text-right">Freight Sales</th>
                  <th className="py-3 px-3 text-right">Duty</th>
                  <th className="py-3 px-3 text-right">Net Sales</th>
                  <th className="py-3 px-3 text-right">Purchase</th>
                  <th className="py-3 px-3 text-right">Net Profit</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="py-12 text-center text-slate-400 font-medium">
                      No invoices found matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv, idx) => {
                    const wb = getInvoiceWeightBreakdown(inv);
                    const meat = getInvoiceMeatBreakdown(inv);
                    const customDuty = inv.custom_duty_amount ?? (500 * (inv.box_count || 1));
                    const discount = inv.discount_amount || 0;
                    const netBilled = Math.max(0, inv.sale_amount + customDuty - discount);
                    const purchase = inv.purchase_amount || 0;
                    const profit = inv.profit_amount || (netBilled - purchase);

                    return (
                      <tr
                        key={inv.id}
                        className="hover:bg-blue-50/40 transition group cursor-pointer"
                        onClick={() => {
                          setPreviewInvoice(inv);
                          setPreviewVersion('customer');
                        }}
                      >
                        <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-blue-600 block">{inv.invoice_no}</span>
                          <span className="inline-block text-[9.5px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded mt-0.5" title={inv.shipper_name || 'The Courier Station Pokhara'}>
                            🏢 {inv.shipper_name || 'The Courier Station Pokhara'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 text-[11px] whitespace-nowrap">{inv.invoice_date}</td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900 leading-tight">{inv.sender_name}</p>
                          {inv.sender_email && <p className="text-[9.5px] text-slate-400 font-mono leading-tight truncate max-w-[130px]">{inv.sender_email}</p>}
                          <p className="text-[10px] text-slate-500 leading-tight mt-0.5">➡️ {inv.receiver_name}</p>
                          {inv.receiver_address && (
                            <p className="text-[9.5px] text-slate-500 leading-tight truncate max-w-[140px] mt-0.5" title={inv.receiver_address}>
                              📍 {inv.receiver_address}
                            </p>
                          )}
                          {inv.receiver_email && <p className="text-[9.5px] text-slate-400 font-mono leading-tight truncate max-w-[130px]">{inv.receiver_email}</p>}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-800">{inv.country}</span>
                          <span className="block text-[10px] text-slate-400">{inv.transport_type}</span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">{inv.box_count || 1}</td>
                        <td className="py-3 px-3 text-right font-mono text-slate-800">{wb.netWeight} kg</td>
                        <td className="py-3 px-3 text-right font-mono">
                          {meat.hasMeat ? (
                            <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[11px]">
                              {meat.meatWeight} kg
                            </span>
                          ) : (
                            <span className="text-slate-300">--</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-indigo-900">
                          {wb.volumeWeight} kg
                          {wb.isVolumetricCharged && (
                            <span className="block text-[9px] text-emerald-600 font-bold leading-none">
                              +{wb.volumeProfitWeight} kg gain
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-blue-900">
                          {wb.billableWeight} kg
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-800">
                          {formatCurrency(inv.sale_amount)}
                          {meat.meatExtraCharge > 0 && (
                            <span className="block text-[9px] text-amber-600 font-bold leading-none">
                              +{formatCurrency(meat.meatExtraCharge)} Meat
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600">{formatCurrency(customDuty)}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">{formatCurrency(netBilled)}</td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700">{formatCurrency(purchase)}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700 bg-emerald-50/50">
                          {formatCurrency(profit)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap ${
                            (inv.payment_status || 'Paid') === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {inv.payment_status || 'Paid'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setPreviewInvoice(inv);
                                setPreviewVersion('customer');
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                              title="Live Document Preview & Print"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => exportInvoiceToExcel(inv)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                              title="Export Single Document (.xlsx)"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onViewInvoice(inv.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                              title="Open Full Detail Page"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: COMMERCIAL CUSTOMER BILLS GALLERY */}
        {/* ========================================================================= */}
        {activeDocTab === 'customer_bills' && (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInvoices.map((inv) => {
              const wb = getInvoiceWeightBreakdown(inv);
              const meat = getInvoiceMeatBreakdown(inv);
              const customDuty = inv.custom_duty_amount ?? (500 * (inv.box_count || 1));
              const discount = inv.discount_amount || 0;
              const finalAmount = Math.max(0, inv.sale_amount + customDuty - discount);

              return (
                <div
                  key={inv.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-sm text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          {inv.invoice_no}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-[140px]" title={inv.shipper_name || 'The Courier Station Pokhara'}>
                          🏢 {inv.shipper_name || 'CSP Pokhara'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-semibold">{inv.invoice_date}</span>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 text-sm leading-snug">{inv.sender_name}</h4>
                      {inv.sender_email && (
                        <p className="text-[10.5px] text-slate-500 font-mono flex items-center gap-1">
                          <Mail className="w-2.5 h-2.5 text-slate-400" />
                          <span>{inv.sender_email}</span>
                        </p>
                      )}
                      <p className="text-xs text-slate-600 mt-1">
                        Consignee: <strong className="text-slate-900">{inv.receiver_name}</strong> ({inv.country})
                      </p>
                      {inv.receiver_email && (
                        <p className="text-[10.5px] text-slate-500 font-mono flex items-center gap-1">
                          <Mail className="w-2.5 h-2.5 text-slate-400" />
                          <span>{inv.receiver_email}</span>
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-center bg-slate-50 p-2 rounded-lg border border-slate-100 text-[11px]">
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase font-bold">Net Wt</span>
                        <span className="font-mono font-bold text-slate-800">{wb.netWeight} kg</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase font-bold">Chargeable</span>
                        <span className="font-mono font-bold text-blue-700">{wb.billableWeight} kg</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 block uppercase font-bold">Boxes</span>
                        <span className="font-mono font-bold text-slate-800">{inv.box_count || 1} Box</span>
                      </div>
                    </div>

                    {meat.hasMeat && (
                      <div className="bg-amber-50/80 p-2 rounded-lg border border-amber-200 text-[11px] flex items-center justify-between text-amber-900">
                        <span className="font-bold">🥩 Meat Net Wt:</span>
                        <span className="font-mono font-extrabold">{meat.meatWeight} kg (+{formatCurrency(meat.meatExtraCharge)})</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Net Payable</span>
                      <span className="text-sm font-black text-emerald-700">{formatCurrency(finalAmount)}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setPreviewInvoice(inv);
                          setPreviewVersion('customer');
                        }}
                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview Bill</span>
                      </button>
                      <button
                        onClick={() => exportInvoiceToExcel(inv)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                        title="Excel export"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: DRY MEAT (SUKUTI) & QUARANTINE CLEARANCES */}
        {/* ========================================================================= */}
        {activeDocTab === 'meat_clearance' && (
          <div>
            <div className="bg-amber-50/60 p-4 border-b border-amber-200/80 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <h3 className="font-bold text-sm text-amber-950 flex items-center gap-2">
                  <span>🥩 Dry Meat (Sukuti) & Quarantine Clearance Manifest</span>
                  <span className="text-xs bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-extrabold">
                    {stats.meatInvoiceCount} Consignments
                  </span>
                </h3>
                <p className="text-xs text-amber-800">
                  Total Meat Weight: <strong>{stats.totalMeatWeight} kg</strong> | Surcharges Collected:{' '}
                  <strong>{formatCurrency(stats.totalMeatSurcharges)}</strong> | Net Meat Profit:{' '}
                  <strong>{formatCurrency(stats.totalMeatProfit)}</strong>
                </p>
              </div>

              <button
                onClick={() => exportMeatDocumentationToExcel(filteredInvoices)}
                className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Meat Clearance Manifest (.xlsx)</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="py-3 px-3">#</th>
                    <th className="py-3 px-3">Invoice No</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Sender / Receiver</th>
                    <th className="py-3 px-3">Destination</th>
                    <th className="py-3 px-3 text-right">Shipment Net Wt</th>
                    <th className="py-3 px-3 text-right">Dry Meat Net Wt</th>
                    <th className="py-3 px-3 text-right">Normal Net Wt</th>
                    <th className="py-3 px-3">Meat Description</th>
                    <th className="py-3 px-3 text-right">Meat Surcharge</th>
                    <th className="py-3 px-3 text-right">Clearance Cost</th>
                    <th className="py-3 px-3 text-right">Meat Profit</th>
                    <th className="py-3 px-3 text-center">Quarantine Declaration</th>
                    <th className="py-3 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="py-12 text-center text-slate-400 font-medium">
                        No consignments containing dry meat/sukuti found.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv, idx) => {
                      const wb = getInvoiceWeightBreakdown(inv);
                      const meat = getInvoiceMeatBreakdown(inv);

                      return (
                        <tr
                          key={inv.id}
                          className="hover:bg-amber-50/30 transition cursor-pointer"
                          onClick={() => {
                            setPreviewInvoice(inv);
                            setPreviewVersion('customer');
                          }}
                        >
                          <td className="py-3 px-3 font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-3 px-3 font-mono font-bold text-amber-900">{inv.invoice_no}</td>
                          <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{inv.invoice_date}</td>
                          <td className="py-3 px-3">
                            <p className="font-bold text-slate-900">{inv.sender_name}</p>
                            <p className="text-[10px] text-slate-500">➡️ {inv.receiver_name}</p>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-800">{inv.country}</td>
                          <td className="py-3 px-3 text-right font-mono text-slate-800">{wb.netWeight} kg</td>
                          <td className="py-3 px-3 text-right font-mono font-extrabold text-amber-800 bg-amber-50">
                            {meat.meatWeight} kg
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-600">{meat.normalWeight} kg</td>
                          <td className="py-3 px-3 text-slate-700 font-medium">
                            {meat.meatItemDescriptions.join(', ') || 'Dry Meat / Sukuti'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-amber-900">
                            {formatCurrency(meat.meatExtraCharge)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-700">
                            {formatCurrency(meat.meatPurchaseCost)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-extrabold text-emerald-700 bg-emerald-50/40">
                            {formatCurrency(meat.meatProfit)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Vacuum Sealed & Cleared
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                setPreviewInvoice(inv);
                                setPreviewVersion('item_list');
                              }}
                              className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold transition cursor-pointer"
                            >
                              Manifest
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: CARGO & PACKING MANIFESTS */}
        {/* ========================================================================= */}
        {activeDocTab === 'packing_manifest' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">Invoice No</th>
                  <th className="py-3 px-3">Customer (Sender)</th>
                  <th className="py-3 px-3">Consignee (Receiver & Address)</th>
                  <th className="py-3 px-3">Destination</th>
                  <th className="py-3 px-3">Packed Box #</th>
                  <th className="py-3 px-3">Item Description</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3 text-center">Quantity</th>
                  <th className="py-3 px-3 text-right">Net Item Weight</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) =>
                  (inv.items || []).map((item, itIdx) => (
                    <tr key={`${inv.id}-${itIdx}`} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-mono text-slate-400">{itIdx + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-600">{inv.invoice_no}</td>
                      <td className="py-2.5 px-3">
                        <p className="font-bold text-slate-900">{inv.sender_name}</p>
                        <p className="text-[10px] text-slate-500">{inv.phone}</p>
                      </td>
                      <td className="py-2.5 px-3">
                        <p className="font-bold text-slate-900">{inv.receiver_name}</p>
                        <p className="text-[10.5px] text-slate-600 leading-tight">
                          {inv.receiver_address || inv.country}
                        </p>
                      </td>
                      <td className="py-2.5 px-3 text-slate-800 font-semibold">{inv.country}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700">Box #{item.box_number || 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{item.item_name || 'General Goods'}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.item_type === 'Meat' || item.item_type === 'Dry Meat'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {item.item_type || 'Normal'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">{item.quantity || 1}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {item.weight_kg ? `${item.weight_kg} kg` : 'In Box Scale Wt'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => {
                            setPreviewInvoice(inv);
                            setPreviewVersion('item_list');
                          }}
                          className="text-blue-600 hover:underline font-bold text-[11px]"
                        >
                          View List
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 5: PURCHASE BILL BREAKDOWN */}
        {/* ========================================================================= */}
        {activeDocTab === 'purchase_bills' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">Invoice No</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Sender</th>
                  <th className="py-3 px-3">Destination</th>
                  <th className="py-3 px-3 text-right">Net Wt</th>
                  <th className="py-3 px-3 text-right">Meat Wt</th>
                  <th className="py-3 px-3 text-right">Vol Wt</th>
                  <th className="py-3 px-3 text-right">Chargeable</th>
                  <th className="py-3 px-3 text-center">Boxes</th>
                  <th className="py-3 px-3 text-right">Freight Purchase</th>
                  <th className="py-3 px-3 text-right">Custom Duty Cost</th>
                  <th className="py-3 px-3 text-right">Total Payable</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv, idx) => {
                  const wb = getInvoiceWeightBreakdown(inv);
                  const pb = getInvoicePurchaseBreakdown(inv);
                  const meat = getInvoiceMeatBreakdown(inv);
                  const totalPurchase = inv.purchase_amount || pb.totalPurchase;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{inv.invoice_no}</td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">{inv.invoice_date}</td>
                      <td className="py-3 px-3 font-bold text-slate-800">{inv.sender_name}</td>
                      <td className="py-3 px-3 font-semibold text-slate-700">{inv.country}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-800">{wb.netWeight} kg</td>
                      <td className="py-3 px-3 text-right font-mono text-amber-700 font-bold">
                        {meat.hasMeat ? `${meat.meatWeight} kg` : '--'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">{wb.volumeWeight} kg</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">{wb.billableWeight} kg</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-700">{inv.box_count || 1}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-800">{formatCurrency(pb.freightPurchase)}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">{formatCurrency(pb.customPurchaseCost)}</td>
                      <td className="py-3 px-3 text-right font-mono font-extrabold text-blue-900 bg-blue-50/50">
                        {formatCurrency(totalPurchase)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => {
                            setPreviewInvoice(inv);
                            setPreviewVersion('billing_v1');
                          }}
                          className="text-blue-600 hover:underline font-bold text-[11px] cursor-pointer"
                        >
                          Audit Bill
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* QUICK DOCUMENT PREVIEW MODAL STAGE */}
      {/* ========================================================================= */}
      {previewInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <span>Document Preview:</span>
                    <span className="font-mono text-blue-600">{previewInvoice.invoice_no}</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {previewInvoice.sender_name} ➡️ {previewInvoice.receiver_name} ({previewInvoice.country})
                  </p>
                </div>
              </div>

              {/* Version Selector Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {[
                  { id: 'customer', label: '📄 Customer Bill' },
                  { id: 'item_list', label: '📦 Packing List' },
                  { id: 'billing_v1', label: '📊 Audit Sheet (V1)' },
                  { id: 'billing_v2', label: '📋 Simple Bill (V2)' },
                ].map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setPreviewVersion(v.id as PDFVersion)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      previewVersion === v.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>

              {/* Action Buttons & Close */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrintPreview()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Document</span>
                </button>

                <button
                  onClick={() => downloadInvoicePDF(previewInvoice, previewVersion)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>

                <button
                  onClick={() => setPreviewInvoice(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Render Area (A4 Stage) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-800 flex justify-center shadow-inner">
              <div className="shadow-2xl rounded bg-white shrink-0">
                <PrintDocument ref={printModalRef} invoice={previewInvoice} version={previewVersion} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
