import React, { useState, useEffect } from 'react';
import { StockItem, StockLog, UserRole } from '../types';
import {
  getStockItems,
  saveStockItems,
  getStockLogs,
  addStockLog,
} from '../lib/storage';
import {
  Boxes,
  Plus,
  Minus,
  RefreshCw,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  XCircle,
  History,
  Edit3,
  Trash2,
  PackageCheck,
  PackageMinus,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';

interface StockManagementProps {
  role: UserRole | null;
}

export const StockManagement: React.FC<StockManagementProps> = ({ role }) => {
  const [items, setItems] = useState<StockItem[]>([]);
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [actionItem, setActionItem] = useState<{
    item: StockItem;
    type: 'USED' | 'RESTOCKED';
  } | null>(null);
  const [actionQty, setActionQty] = useState<number>(1);
  const [actionReason, setActionReason] = useState<string>('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // New / Edit Item Form State
  const [formData, setFormData] = useState({
    item_name: '',
    category: 'Carton' as 'Carton' | 'Tape' | 'Sack / Bag' | 'Other',
    unit: 'Pcs',
    total_stock: 100,
    used_count: 0,
    low_stock_threshold: 10,
    cost_per_unit: 0,
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setItems(getStockItems());
    setLogs(getStockLogs());
  };

  const updateItemsState = (newItems: StockItem[]) => {
    setItems(newItems);
    saveStockItems(newItems);
  };

  // Pre-fill mandatory default items if missing
  const ensureDefaultItemsExist = () => {
    const defaultList = [
      'Carton of 10 kg',
      'Carton of 15 kg',
      'Carton of 20 kg',
      'Brown Tape',
      'White Tape',
      'Bora',
    ];
    let updated = [...items];
    let addedCount = 0;

    defaultList.forEach((name) => {
      if (!updated.some((i) => i.item_name.toLowerCase() === name.toLowerCase())) {
        const cat = name.includes('Carton')
          ? 'Carton'
          : name.includes('Tape')
          ? 'Tape'
          : 'Sack / Bag';
        const unit = name.includes('Tape') ? 'Rolls' : name.includes('Bora') ? 'Bags' : 'Pcs';
        updated.push({
          id: `stk-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          item_name: name,
          category: cat as any,
          unit,
          total_stock: 100,
          used_count: 0,
          low_stock_threshold: 10,
          cost_per_unit: name.includes('Carton') ? 150 : 80,
          notes: `Default packaging item: ${name}`,
          updated_at: new Date().toISOString(),
        });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      updateItemsState(updated);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item: StockItem) => {
    setEditingItem(item);
    setFormData({
      item_name: item.item_name,
      category: item.category,
      unit: item.unit,
      total_stock: item.total_stock,
      used_count: item.used_count,
      low_stock_threshold: item.low_stock_threshold,
      cost_per_unit: item.cost_per_unit || 0,
      notes: item.notes || '',
    });
    setIsAddModalOpen(true);
  };

  // Reset Add / Edit Form
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      item_name: '',
      category: 'Carton',
      unit: 'Pcs',
      total_stock: 100,
      used_count: 0,
      low_stock_threshold: 10,
      cost_per_unit: 0,
      notes: '',
    });
    setIsAddModalOpen(true);
  };

  // Save Item (Create or Update)
  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.item_name.trim()) return;

    let updated: StockItem[];
    if (editingItem) {
      updated = items.map((it) =>
        it.id === editingItem.id
          ? {
              ...it,
              item_name: formData.item_name.trim(),
              category: formData.category,
              unit: formData.unit,
              total_stock: Math.max(0, formData.total_stock),
              used_count: Math.max(0, formData.used_count),
              low_stock_threshold: Math.max(1, formData.low_stock_threshold),
              cost_per_unit: Math.max(0, formData.cost_per_unit),
              notes: formData.notes.trim(),
              updated_at: new Date().toISOString(),
            }
          : it
      );
    } else {
      const newItem: StockItem = {
        id: `stk-${Date.now()}`,
        item_name: formData.item_name.trim(),
        category: formData.category,
        unit: formData.unit,
        total_stock: Math.max(0, formData.total_stock),
        used_count: Math.max(0, formData.used_count),
        low_stock_threshold: Math.max(1, formData.low_stock_threshold),
        cost_per_unit: Math.max(0, formData.cost_per_unit),
        notes: formData.notes.trim(),
        updated_at: new Date().toISOString(),
      };
      updated = [newItem, ...items];
    }

    updateItemsState(updated);
    setIsAddModalOpen(false);
  };

  // Delete Stock Item
  const handleDeleteItem = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this packaging item from stock management?')) {
      return;
    }
    const updated = items.filter((it) => it.id !== id);
    updateItemsState(updated);
  };

  // Submit Usage or Restock Action
  const handleConfirmAction = () => {
    if (!actionItem || actionQty <= 0) return;

    const { item, type } = actionItem;
    let newUsedCount = item.used_count;
    let newTotalStock = item.total_stock;

    if (type === 'USED') {
      newUsedCount += actionQty;
    } else {
      // Restocked adds to total stock
      newTotalStock += actionQty;
    }

    const updated = items.map((it) =>
      it.id === item.id
        ? {
            ...it,
            used_count: newUsedCount,
            total_stock: newTotalStock,
            updated_at: new Date().toISOString(),
          }
        : it
    );

    updateItemsState(updated);

    // Log the transaction
    addStockLog({
      stock_id: item.id,
      item_name: item.item_name,
      action_type: type,
      quantity: actionQty,
      reason: actionReason.trim() || (type === 'USED' ? 'Manual usage logged' : 'Stock restock received'),
      logged_by: role === 'admin' ? 'Admin User' : 'Staff User',
    });

    setLogs(getStockLogs());
    setActionItem(null);
    setActionQty(1);
    setActionReason('');
  };

  // Filter items
  const filteredItems = items.filter((it) => {
    const matchesSearch = it.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      it.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (selectedCategory === 'All') return true;
    if (selectedCategory === 'LowOrOut') {
      const available = it.total_stock - it.used_count;
      return available <= it.low_stock_threshold;
    }
    return it.category === selectedCategory;
  });

  // Calculate Overall Analytics
  const totalItemTypes = items.length;
  const totalPiecesUsed = items.reduce((sum, it) => sum + it.used_count, 0);
  
  const outOfStockItems = items.filter((it) => (it.total_stock - it.used_count) <= 0);
  const lowStockItems = items.filter((it) => {
    const avail = it.total_stock - it.used_count;
    return avail > 0 && avail <= it.low_stock_threshold;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Carton':
        return '📦';
      case 'Tape':
        return '🏷️';
      case 'Sack / Bag':
        return '🎒';
      default:
        return '🛠️';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-extrabold text-xs uppercase tracking-wider mb-1">
            <Boxes className="w-4 h-4" />
            <span>Packaging & Material Inventory</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Stock Management
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Monitor count of pieces used, available cartons, tapes, sacks (bora), and out-of-stock alerts.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition border border-slate-200"
          >
            <History className="w-4 h-4 text-slate-500" />
            <span>Usage Logs</span>
          </button>
          <button
            onClick={ensureDefaultItemsExist}
            title="Auto-load default cartons & supplies"
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-lg text-xs transition border border-amber-200"
          >
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Stock Item</span>
          </button>
        </div>
      </div>

      {/* Warning Alert Banner for Out of Stock or Low Stock */}
      {(outOfStockItems.length > 0 || lowStockItems.length > 0) && (
        <div className="bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border border-amber-300/80 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500 text-white rounded-xl shadow-xs shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm">
                Attention Required: Inventory Alerts
              </h4>
              <p className="text-xs text-slate-700">
                {outOfStockItems.length > 0 && (
                  <span className="font-bold text-rose-700 mr-2">
                    • {outOfStockItems.length} item(s) OUT OF STOCK ({outOfStockItems.map((i) => i.item_name).join(', ')})
                  </span>
                )}
                {lowStockItems.length > 0 && (
                  <span className="font-semibold text-amber-800">
                    • {lowStockItems.length} item(s) Running Low ({lowStockItems.map((i) => i.item_name).join(', ')})
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedCategory('LowOrOut')}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-lg transition"
          >
            View Low & Out of Stock
          </button>
        </div>
      )}

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Stock Items */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Packaging Item Types
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {totalItemTypes} <span className="text-xs font-semibold text-slate-400">Items</span>
            </h3>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Count of Pieces Used */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Count of Pieces Used
            </p>
            <h3 className="text-2xl font-black text-indigo-900 mt-1">
              {totalPiecesUsed} <span className="text-xs font-semibold text-slate-400">Pcs</span>
            </h3>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
            <PackageMinus className="w-5 h-5" />
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Low Stock Items
            </p>
            <h3 className="text-2xl font-black text-amber-900 mt-1">
              {lowStockItems.length} <span className="text-xs font-semibold text-slate-400">Items</span>
            </h3>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Out of Stock Items */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Out of Stock Items
            </p>
            <h3 className="text-2xl font-black text-rose-600 mt-1">
              {outOfStockItems.length} <span className="text-xs font-semibold text-slate-400">Items</span>
            </h3>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search cartons, tapes, bora..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filter Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {['All', 'Carton', 'Tape', 'Sack / Bag', 'LowOrOut'].map((cat) => {
            const label = cat === 'LowOrOut' ? '⚠️ Low & Out' : cat;
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold whitespace-nowrap transition ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stock Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredItems.map((item) => {
          const availableStock = Math.max(0, item.total_stock - item.used_count);
          const isOutOfStock = availableStock <= 0;
          const isLowStock = availableStock > 0 && availableStock <= item.low_stock_threshold;
          const usagePercentage = item.total_stock > 0
            ? Math.min(100, Math.round((item.used_count / item.total_stock) * 100))
            : 0;

          return (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md ${
                isOutOfStock
                  ? 'border-rose-300 ring-2 ring-rose-100 bg-rose-50/20'
                  : isLowStock
                  ? 'border-amber-300 ring-2 ring-amber-100 bg-amber-50/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Header Title & Status */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getCategoryIcon(item.category)}</span>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                        {item.item_name}
                      </h3>
                      <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block mt-0.5">
                        Category: {item.category}
                      </span>
                    </div>
                  </div>

                  {/* Stock Status Badge */}
                  <div>
                    {isOutOfStock ? (
                      <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded-md bg-rose-600 text-white shadow-xs flex items-center gap-1 animate-pulse">
                        <XCircle className="w-3 h-3" /> Out of Stock
                      </span>
                    ) : isLowStock ? (
                      <span className="px-2.5 py-1 text-[10px] font-black uppercase rounded-md bg-amber-500 text-white shadow-xs flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Low Stock
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> In Stock
                      </span>
                    )}
                  </div>
                </div>

                {/* Notes if available */}
                {item.notes && (
                  <p className="text-[11px] text-slate-500 mb-3 line-clamp-2 italic bg-slate-50 p-2 rounded border border-slate-100">
                    "{item.notes}"
                  </p>
                )}

                {/* Core Stock Numbers */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-center my-3">
                  {/* Total Stock */}
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                      Total Added
                    </span>
                    <span className="text-sm font-black font-mono text-slate-700">
                      {item.total_stock} <span className="text-[10px] font-normal">{item.unit}</span>
                    </span>
                  </div>

                  {/* Count of Pieces Used */}
                  <div className="border-x border-slate-200 px-1">
                    <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider block">
                      Pieces Used
                    </span>
                    <span className="text-sm font-black font-mono text-indigo-950">
                      {item.used_count} <span className="text-[10px] font-normal">{item.unit}</span>
                    </span>
                  </div>

                  {/* Remaining Available */}
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                      Available
                    </span>
                    <span
                      className={`text-sm font-black font-mono ${
                        isOutOfStock ? 'text-rose-600 font-extrabold' : isLowStock ? 'text-amber-700' : 'text-emerald-700'
                      }`}
                    >
                      {availableStock} <span className="text-[10px] font-normal">{item.unit}</span>
                    </span>
                  </div>
                </div>

                {/* Usage Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500">
                    <span>Usage Progress ({usagePercentage}%)</span>
                    <span>Low threshold: {item.low_stock_threshold} {item.unit}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isOutOfStock
                          ? 'bg-rose-600'
                          : isLowStock
                          ? 'bg-amber-500'
                          : 'bg-blue-600'
                      }`}
                      style={{ width: `${usagePercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setActionItem({ item, type: 'USED' })}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-extrabold text-xs rounded-lg transition border border-indigo-200"
                  >
                    <Minus className="w-3.5 h-3.5 text-indigo-700" />
                    <span>Log Used</span>
                  </button>
                  <button
                    onClick={() => setActionItem({ item, type: 'RESTOCKED' })}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-extrabold text-xs rounded-lg transition border border-emerald-200"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Restock</span>
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(item)}
                    title="Edit Stock Details"
                    className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    title="Delete Stock Item"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-3">
            <Boxes className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-extrabold text-slate-800 text-base">No packaging items found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search query or click "Reset Defaults" to restore standard cartons, tapes, and bora.
            </p>
            <button
              onClick={ensureDefaultItemsExist}
              className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-xs hover:bg-blue-700 transition inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Load Default Packaging Items</span>
            </button>
          </div>
        )}
      </div>

      {/* MODAL 1: Log Usage or Restock Dialog */}
      {actionItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-start">
              <div>
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    actionItem.type === 'USED'
                      ? 'bg-indigo-100 text-indigo-900'
                      : 'bg-emerald-100 text-emerald-900'
                  }`}
                >
                  {actionItem.type === 'USED' ? 'Record Usage' : 'Restock Intake'}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  {actionItem.item.item_name}
                </h3>
              </div>
              <button
                onClick={() => setActionItem(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <p>Current Total Stock: <strong className="font-mono">{actionItem.item.total_stock} {actionItem.item.unit}</strong></p>
              <p>Current Used Count: <strong className="font-mono">{actionItem.item.used_count} {actionItem.item.unit}</strong></p>
              <p>Current Available: <strong className="font-mono text-emerald-700">{actionItem.item.total_stock - actionItem.item.used_count} {actionItem.item.unit}</strong></p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
                  Quantity ({actionItem.item.unit}) to {actionItem.type === 'USED' ? 'Deduct / Mark Used' : 'Add to Stock'} *
                </label>
                <input
                  type="number"
                  min="1"
                  value={actionQty}
                  onChange={(e) => setActionQty(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold font-mono text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
                  Note / Reason (Optional)
                </label>
                <input
                  type="text"
                  placeholder={
                    actionItem.type === 'USED'
                      ? 'e.g. Used 2 cartons for INV-003 to Australia'
                      : 'e.g. Purchased 50 rolls from local supplier'
                  }
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActionItem(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className={`px-5 py-2 text-white text-xs font-extrabold rounded-lg shadow-xs ${
                  actionItem.type === 'USED'
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {actionItem.type === 'USED' ? 'Confirm Deduct Used' : 'Confirm Restock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Add or Edit Packaging Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleSaveItem}
            className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                {editingItem ? 'Edit Packaging Item' : 'Add New Packaging Item'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Carton of 10 kg, White Tape, Bora"
                  value={formData.item_name}
                  onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Carton">Carton Box</option>
                  <option value="Tape">Sealing Tape</option>
                  <option value="Sack / Bag">Sack / Bora</option>
                  <option value="Other">Other Supply</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
                  Unit Type *
                </label>
                <input
                  type="text"
                  placeholder="Pcs, Rolls, Bags..."
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
                  Total Added Stock *
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.total_stock}
                  onChange={(e) => setFormData({ ...formData, total_stock: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold font-mono text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-indigo-800 uppercase tracking-wider block mb-1">
                  Count of Pieces Used *
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.used_count}
                  onChange={(e) => setFormData({ ...formData, used_count: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-indigo-300 bg-indigo-50/50 rounded-lg text-xs font-bold font-mono text-indigo-950 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
                  Low Stock Warning Threshold *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.low_stock_threshold}
                  onChange={(e) => setFormData({ ...formData, low_stock_threshold: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold font-mono text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
                  Cost per Unit (NPR Rs)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.cost_per_unit}
                  onChange={(e) => setFormData({ ...formData, cost_per_unit: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold font-mono text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
                  Item Description / Specification
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional specs or supplier details..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs"
              >
                Save Packaging Item
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: Stock Usage Logs History */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900">
                  Stock Usage & Intake History Logs
                </h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 space-y-2">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-1 text-[10px] font-black uppercase rounded ${
                          log.action_type === 'USED'
                            ? 'bg-indigo-100 text-indigo-900'
                            : 'bg-emerald-100 text-emerald-900'
                        }`}
                      >
                        {log.action_type === 'USED' ? '- Used' : '+ Added'}
                      </span>
                      <div>
                        <h5 className="font-extrabold text-slate-900">{log.item_name}</h5>
                        <p className="text-[11px] text-slate-500">
                          Reason: {log.reason || 'No note provided'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-black text-sm block">
                        {log.action_type === 'USED' ? `- ${log.quantity}` : `+ ${log.quantity}`} Pcs
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-xs text-slate-400 py-8">No usage history logged yet.</p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 text-right">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
