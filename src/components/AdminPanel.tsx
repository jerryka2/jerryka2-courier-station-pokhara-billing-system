import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Rate, ItemType, UserRole, ExcelValidationError, StaffUser, SecurityAuditLog, SystemSettings } from '../types';
import { formatCurrency } from '../lib/rateCalculator';
import {
  getStaffUsers,
  verifyStaffUser,
  rejectStaffUser,
  deleteStaffUser,
  getAuditLogs,
  getSystemSettings,
  saveSystemSettings,
  addAuditLog,
  resetSystemDataAndKeepRealStaff,
  purgeAllFirestoreData,
} from '../lib/storage';
import {
  FileSpreadsheet,
  Upload,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
  Download,
  ShieldCheck,
  Search,
  Filter,
  Users,
  Shield,
  Settings,
  Clock,
  UserCheck,
  UserX,
  KeyRound,
  Building,
  Save,
} from 'lucide-react';

interface AdminPanelProps {
  rates: Rate[];
  role: UserRole | null;
  onUpdateRates: (rates: Rate[]) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  rates,
  role,
  onUpdateRates,
}) => {
  const [activeTab, setActiveTab] = useState<'rates' | 'staff' | 'audit' | 'settings'>('rates');

  // Rates State
  const [validationErrors, setValidationErrors] = useState<ExcelValidationError[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Rate>>({});
  const [showAddRowModal, setShowAddRowModal] = useState(false);
  const [newRowData, setNewRowData] = useState<Partial<Rate>>({
    country: 'Australia',
    item_type: 'Normal',
    min_weight: 1,
    purchase_rate: 1000,
    sale_rate: 1300,
    custom_rate: 500,
  });

  // Staff State
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>(getStaffUsers());
  const [staffMessage, setStaffMessage] = useState<string | null>(null);

  // Settings State
  const [settings, setSettings] = useState<SystemSettings>(getSystemSettings());
  const [settingsSaved, setSettingsSaved] = useState(false);

  // System Data Reset Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPinInput, setResetPinInput] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);

  // Audit Logs
  const auditLogs = getAuditLogs();

  if (role !== 'admin') {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-xl border border-slate-200 text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="font-bold text-lg text-slate-900">Admin Access Required</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Rate matrix management, staff verification, and security audit logs are restricted to Admin users. Please switch to Admin role.
        </p>
      </div>
    );
  }

  // Staff Actions
  const handleVerifyStaff = (id: string) => {
    const updated = verifyStaffUser(id, 'admin@courierstation.np');
    setStaffUsers(updated);
    setStaffMessage('Staff user verified successfully! They can now log in.');
  };

  const handleRejectStaff = (id: string) => {
    const updated = rejectStaffUser(id, 'admin@courierstation.np');
    setStaffUsers(updated);
    setStaffMessage('Staff user registration declined.');
  };

  const handleDeleteStaff = (id: string) => {
    if (confirm('Permanently remove this staff user profile?')) {
      const updated = deleteStaffUser(id, 'admin@courierstation.np');
      setStaffUsers(updated);
      setStaffMessage('Staff user profile permanently deleted.');
    }
  };

  const handleExecuteFactoryReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetPinInput.trim() !== settings.adminPin) {
      setResetError('Incorrect Admin Security PIN! System reset cancelled.');
      return;
    }

    try {
      const res = await purgeAllFirestoreData('admin@courierstation.np');
      setStaffUsers(getStaffUsers());
      onUpdateRates([]);
      setShowResetModal(false);
      setResetPinInput('');
      setResetError(null);
      alert(res.message || 'Database Purged! All records have been cleared from Cloud Firestore and local storage. You can now add all new data.');
      window.location.reload();
    } catch (err: any) {
      setResetError(err?.message || 'Failed to purge database data');
    }
  };

  // Settings Save
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveSystemSettings(settings, 'admin@courierstation.np');
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  // Handle Excel File Upload & Validation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidationErrors([]);
    setSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (jsonRows.length === 0) {
          setValidationErrors([{ row: 1, message: 'Uploaded Excel sheet is empty.' }]);
          return;
        }

        const errors: ExcelValidationError[] = [];
        const validRates: Rate[] = [];
        const seenKeys = new Set<string>();

        const allowedTypes: ItemType[] = ['Normal', 'Meat', 'Dry Meat', 'Pickle'];

        jsonRows.forEach((row, index) => {
          const rowNum = index + 2; // header is row 1

          // Extract fields flex-case
          const country = String(row.Country || row.country || '').trim();
          const typeStr = String(row.Type || row.type || row['Item Type'] || '').trim();
          const purchaseRateNum = Number(row['Purchase Rate'] || row.purchase_rate || row.Purchase);
          const saleRateNum = Number(row['Sale Rate'] || row.sale_rate || row.Sale);
          const minWeightNum = Number(row['Min Weight'] || row.min_weight || row['Slab Min'] || 1);
          const customRateNum = Number(row['Custom Rate'] || row.custom_rate || row.Custom || 0);

          // 1. Validate Country
          if (!country) {
            errors.push({ row: rowNum, message: 'Country name is missing or empty.' });
          }

          // 2. Validate Type
          if (!allowedTypes.includes(typeStr as ItemType)) {
            errors.push({
              row: rowNum,
              message: `Invalid Item Type '${typeStr}'. Must be one of: Normal, Meat, Dry Meat, Pickle.`,
            });
          }

          // 3. Validate Numeric Fields
          if (isNaN(purchaseRateNum) || purchaseRateNum < 0) {
            errors.push({ row: rowNum, message: 'Purchase Rate must be a valid positive number.' });
          }

          if (isNaN(saleRateNum) || saleRateNum < 0) {
            errors.push({ row: rowNum, message: 'Sale Rate must be a valid positive number.' });
          }

          if (isNaN(minWeightNum) || minWeightNum < 1) {
            errors.push({ row: rowNum, message: 'Min Weight slab must be a valid number >= 1.' });
          }

          if (isNaN(customRateNum)) {
            errors.push({ row: rowNum, message: 'Custom Rate must be a valid number.' });
          }

          // 4. Validate Uniqueness of (Country + Type + Min Weight)
          const uniqueKey = `${country.toLowerCase()}_${typeStr.toLowerCase()}_${minWeightNum}`;
          if (seenKeys.has(uniqueKey)) {
            errors.push({
              row: rowNum,
              message: `Duplicate rate combination for (${country}, ${typeStr}, Slab ${minWeightNum}kg) in sheet.`,
            });
          } else {
            seenKeys.add(uniqueKey);
          }

          if (errors.length === 0) {
            validRates.push({
              id: `rate-import-${Date.now()}-${index}`,
              country,
              item_type: typeStr as ItemType,
              min_weight: minWeightNum,
              purchase_rate: purchaseRateNum,
              sale_rate: saleRateNum,
              custom_rate: customRateNum,
              updated_at: new Date().toISOString(),
            });
          }
        });

        if (errors.length > 0) {
          setValidationErrors(errors);
        } else {
          // Full Overwrite as required
          onUpdateRates(validRates);
          setSuccessMessage(
            `Successfully imported ${validRates.length} rates from Excel. Previous table overwritten!`
          );
        }
      } catch (err: any) {
        setValidationErrors([
          { row: 0, message: `Failed to parse Excel file: ${err.message}` },
        ]);
      }
    };
    reader.readAsBinaryString(file);

    // Reset input
    e.target.value = '';
  };

  // Download Excel Sample Template
  const handleDownloadSampleExcel = () => {
    const sampleData = [
      {
        Country: 'Australia',
        Type: 'Normal',
        'Purchase Rate': 950,
        'Sale Rate': 1250,
        'Min Weight': 10,
        'Custom Rate': 500,
      },
      {
        Country: 'Australia',
        Type: 'Meat',
        'Purchase Rate': 1400,
        'Sale Rate': 1850,
        'Min Weight': 10,
        'Custom Rate': 500,
      },
      {
        Country: 'United States',
        Type: 'Normal',
        'Purchase Rate': 1000,
        'Sale Rate': 1350,
        'Min Weight': 10,
        'Custom Rate': 600,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rates Matrix');
    XLSX.writeFile(wb, 'CourierStation_Rates_Template.xlsx');
  };

  // Manual Rate Editing Logic
  const handleStartEdit = (rate: Rate) => {
    setEditingRateId(rate.id);
    setEditFormData({ ...rate });
  };

  const handleSaveEdit = (id: string) => {
    const updatedList = rates.map((r) => {
      if (r.id === id) {
        return {
          ...r,
          ...editFormData,
          updated_at: new Date().toISOString(),
        } as Rate;
      }
      return r;
    });
    onUpdateRates(updatedList);
    setEditingRateId(null);
    setSuccessMessage('Rate entry updated successfully!');
  };

  const handleDeleteRate = (id: string) => {
    if (confirm('Are you sure you want to delete this rate row?')) {
      onUpdateRates(rates.filter((r) => r.id !== id));
      setSuccessMessage('Rate row deleted.');
    }
  };

  const handleCreateManualRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRowData.country) return;

    const newRate: Rate = {
      id: `rate-manual-${Date.now()}`,
      country: newRowData.country.trim(),
      item_type: (newRowData.item_type as ItemType) || 'Normal',
      min_weight: Number(newRowData.min_weight) || 1,
      purchase_rate: Number(newRowData.purchase_rate) || 0,
      sale_rate: Number(newRowData.sale_rate) || 0,
      custom_rate: Number(newRowData.custom_rate) || 0,
      updated_at: new Date().toISOString(),
    };

    onUpdateRates([...rates, newRate]);
    setShowAddRowModal(false);
    setSuccessMessage('New rate row added successfully!');
  };

  // Filtered rate list
  const filteredRates = rates.filter((r) => {
    const matchesSearch =
      r.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.item_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCountry = selectedCountry === 'all' || r.country === selectedCountry;
    return matchesSearch && matchesCountry;
  });

  const countriesList = Array.from(new Set(rates.map((r) => r.country))).sort();

  const pendingStaffCount = staffUsers.filter((u) => u.status === 'pending').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-blue-900" />
            <span>Administrator Control Center</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage rate matrices, staff user verifications, system security & audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'rates' && (
            <button
              onClick={handleDownloadSampleExcel}
              className="flex items-center gap-2 px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition shrink-0 shadow-xs"
            >
              <Download className="w-4 h-4 text-blue-600" />
              <span>Excel Rate Template</span>
            </button>
          )}
        </div>
      </div>

      {/* Admin Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('rates')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold rounded-xl transition whitespace-nowrap ${
            activeTab === 'rates'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Rates Matrix & Excel Upload</span>
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold rounded-xl transition whitespace-nowrap relative ${
            activeTab === 'staff'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Accounts Verification</span>
          {pendingStaffCount > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-black bg-amber-500 text-slate-950 rounded-full animate-pulse">
              {pendingStaffCount} PENDING
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold rounded-xl transition whitespace-nowrap ${
            activeTab === 'audit'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Security & Audit Logs</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold rounded-xl transition whitespace-nowrap ${
            activeTab === 'settings'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>System & Invoice Config</span>
        </button>
      </div>

      {/* TAB 1: RATES MATRIX & EXCEL UPLOAD */}
      {activeTab === 'rates' && (
        <>
          {/* Excel Upload Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-600" />
              <span>Bulk Import Rates via Excel (.xlsx)</span>
            </h2>

            <div className="p-6 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl bg-slate-50/50 text-center space-y-3 transition group">
              <Upload className="w-8 h-8 text-slate-400 group-hover:text-blue-600 mx-auto transition" />
              <div>
                <p className="text-xs font-bold text-slate-800">Upload Excel Rate File</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Columns required: Country, Type, Purchase Rate, Sale Rate, Min Weight, Custom Rate
                </p>
              </div>
              <label className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg cursor-pointer transition shadow-xs">
                <span>Browse Excel File</span>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Validation Errors Box */}
            {validationErrors.length > 0 && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-rose-800 text-xs">
                <div className="flex items-center gap-2 font-bold text-rose-900">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                  <span>Validation Failed — Whole Upload Rejected</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-[11px] font-medium">
                  {validationErrors.map((err, i) => (
                    <li key={i}>
                      Row {err.row}: {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}
          </div>

          {/* Interactive Rates Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Active Rate Matrix ({filteredRates.length} rows)
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {/* Search Box */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder="Search Country/Type..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* Country Filter */}
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="all">All Countries</option>
                  {countriesList.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setShowAddRowModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Rate Row</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3">Country</th>
                    <th className="p-3">Item Type</th>
                    <th className="p-3">Slab Min Weight</th>
                    <th className="p-3">Purchase Rate (per kg)</th>
                    <th className="p-3">Sale Rate (per kg)</th>
                    <th className="p-3">Custom Rate (per box)</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredRates.map((rate) => {
                    const isEditing = editingRateId === rate.id;

                    if (isEditing) {
                      return (
                        <tr key={rate.id} className="bg-emerald-50/40">
                          <td className="p-2">
                            <input
                              type="text"
                              value={editFormData.country || ''}
                              onChange={(e) =>
                                setEditFormData({ ...editFormData, country: e.target.value })
                              }
                              className="w-full px-2 py-1 text-xs border border-emerald-400 rounded bg-white font-bold"
                            />
                          </td>
                          <td className="p-2">
                            <select
                              value={editFormData.item_type || 'Normal'}
                              onChange={(e) =>
                                setEditFormData({ ...editFormData, item_type: e.target.value as ItemType })
                              }
                              className="w-full px-2 py-1 text-xs border border-emerald-400 rounded bg-white font-semibold"
                            >
                              <option value="Normal">Normal</option>
                              <option value="Meat">Meat</option>
                              <option value="Dry Meat">Dry Meat</option>
                              <option value="Pickle">Pickle</option>
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={editFormData.min_weight ?? 1}
                              onChange={(e) =>
                                setEditFormData({ ...editFormData, min_weight: Number(e.target.value) })
                              }
                              className="w-20 px-2 py-1 text-xs border border-emerald-400 rounded bg-white font-bold"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={editFormData.purchase_rate ?? 0}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  purchase_rate: Number(e.target.value),
                                })
                              }
                              className="w-24 px-2 py-1 text-xs border border-emerald-400 rounded bg-white font-bold"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={editFormData.sale_rate ?? 0}
                              onChange={(e) =>
                                setEditFormData({ ...editFormData, sale_rate: Number(e.target.value) })
                              }
                              className="w-24 px-2 py-1 text-xs border border-emerald-400 rounded bg-white font-bold"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              value={editFormData.custom_rate ?? 0}
                              onChange={(e) =>
                                setEditFormData({ ...editFormData, custom_rate: Number(e.target.value) })
                              }
                              className="w-24 px-2 py-1 text-xs border border-emerald-400 rounded bg-white font-bold"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleSaveEdit(rate.id)}
                                className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-500"
                                title="Save Row"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingRateId(null)}
                                className="p-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
                                title="Cancel Edit"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={rate.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{rate.country}</td>
                        <td className="p-3">
                          <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                            {rate.item_type}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-700">{rate.min_weight} kg slab</td>
                        <td className="p-3 font-mono font-medium text-slate-800">
                          {formatCurrency(rate.purchase_rate)}
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-700">
                          {formatCurrency(rate.sale_rate)}
                        </td>
                        <td className="p-3 font-mono font-semibold text-amber-800">
                          {formatCurrency(rate.custom_rate)}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleStartEdit(rate)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                              title="Edit Row"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRate(rate.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                              title="Delete Row"
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
          </div>
        </>
      )}

      {/* TAB 2: STAFF ACCOUNTS & ADMIN VERIFICATION */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-900" />
                  <span>Staff Registration & Verification Queue</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  All newly registered staff accounts require Admin approval before accessing billing functions.
                </p>
              </div>

              {pendingStaffCount > 0 && (
                <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-900 font-bold text-xs rounded-xl flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                  <span>{pendingStaffCount} Pending Approval</span>
                </div>
              )}
            </div>

            {staffMessage && (
              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 text-blue-600" />
                <span>{staffMessage}</span>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3">Staff Name</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Registered At</th>
                    <th className="p-3 text-center">Admin Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {staffUsers.map((u) => (
                    <tr key={u.id} className={u.status === 'pending' ? 'bg-amber-50/30' : 'hover:bg-slate-50'}>
                      <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-black flex items-center justify-center text-xs">
                          {u.name.charAt(0)}
                        </div>
                        <span>{u.name}</span>
                      </td>
                      <td className="p-3 font-mono text-slate-600">{u.email}</td>
                      <td className="p-3 text-slate-600">{u.phone}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          u.role === 'admin' ? 'bg-purple-100 text-purple-900 border border-purple-200' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3">
                        {u.status === 'verified' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Verified</span>
                          </span>
                        )}
                        {u.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Pending Admin</span>
                          </span>
                        )}
                        {u.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <UserX className="w-3.5 h-3.5 text-rose-600" />
                            <span>Rejected</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-500 text-[11px]">
                        {new Date(u.registeredAt).toLocaleDateString()} {new Date(u.registeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3 text-center">
                        {u.status === 'pending' ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleVerifyStaff(u.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 transition shadow-xs"
                              title="Approve Staff Account"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Verify</span>
                            </button>
                            <button
                              onClick={() => handleRejectStaff(u.id)}
                              className="px-2.5 py-1 bg-slate-200 hover:bg-rose-100 text-slate-700 hover:text-rose-700 font-bold rounded-lg text-xs transition"
                              title="Decline Staff Account"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Decline</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleDeleteStaff(u.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Delete Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SECURITY AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Security & Activity Audit Trail</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Timestamped security events, staff verifications, logins, and rate changes.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-500">
              {auditLogs.length} Logged Events
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Action Type</th>
                  <th className="p-3">User Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Event Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 font-bold text-blue-900">
                      <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-900 rounded font-semibold text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-slate-700 font-semibold">{log.userEmail}</td>
                    <td className="p-3 uppercase text-slate-500 text-[10px]">{log.userRole}</td>
                    <td className="p-3 font-sans text-slate-700 text-xs">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SYSTEM & BILL CUSTOMIZATION SETTINGS */}
      {activeTab === 'settings' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6 max-w-2xl">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-900" />
              <span>System & Invoice Configuration</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize company details printed on customer bills, Security PINs, and default dispatch ports.
            </p>
          </div>

          {settingsSaved && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>System settings & Admin PIN saved successfully!</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Company Name (On Bills)</label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={settings.companyName}
                  onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Company Phone / Support</label>
              <input
                type="text"
                required
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Port of Loading (Default)</label>
                <input
                  type="text"
                  required
                  value={settings.portOfLoading}
                  onChange={(e) => setSettings({ ...settings, portOfLoading: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Admin Security PIN</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={settings.adminPin}
                    onChange={(e) => setSettings({ ...settings, adminPin: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl transition shadow-sm flex items-center gap-2"
              >
                <Save className="w-4 h-4 text-cyan-400" />
                <span>Save Configuration Changes</span>
              </button>
            </div>
          </form>

          {/* Danger Zone: Factory Data Reset */}
          <div className="border-t border-slate-200 pt-6 mt-6 space-y-3">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-xs uppercase tracking-wider">
              <AlertCircle className="w-4 h-4" />
              <span>Database Clean Reset & Staff Cleanup</span>
            </div>
            <p className="text-xs text-slate-500">
              Wipe out all sample demo invoices and test expenses to start fresh with a clean real production system. This preserves only verified real staff user accounts.
            </p>

            <button
              type="button"
              onClick={() => {
                setShowResetModal(true);
                setResetError(null);
                setResetPinInput('');
              }}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition shadow-sm flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Wipe Demo Data & Keep Real Staff</span>
            </button>
          </div>
        </div>
      )}

      {/* Reset PIN Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Confirm System Clean Reset</h3>
                <p className="text-xs text-slate-500">Authorized Admin Verification Required</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
              Warning: This action will permanently remove all sample invoices and expenses. Only verified staff accounts will be preserved in the system.
            </p>

            {resetError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            <form onSubmit={handleExecuteFactoryReset} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Enter Admin Security PIN</label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  placeholder="Enter 4-6 digit PIN"
                  value={resetPinInput}
                  onChange={(e) => setResetPinInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-center text-lg tracking-widest focus:ring-2 focus:ring-rose-500 font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Execute Reset</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Rate Row Modal */}
      {showAddRowModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">Add New Rate Entry</h3>

            <form onSubmit={handleCreateManualRow} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Country Name</label>
                <input
                  type="text"
                  placeholder="e.g. Australia, Japan"
                  required
                  value={newRowData.country || ''}
                  onChange={(e) => setNewRowData({ ...newRowData, country: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Item Type</label>
                <select
                  value={newRowData.item_type || 'Normal'}
                  onChange={(e) =>
                    setNewRowData({ ...newRowData, item_type: e.target.value as ItemType })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-semibold"
                >
                  <option value="Normal">Normal</option>
                  <option value="Meat">Meat</option>
                  <option value="Dry Meat">Dry Meat</option>
                  <option value="Pickle">Pickle</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Min Weight (Slab)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newRowData.min_weight ?? 1}
                    onChange={(e) =>
                      setNewRowData({ ...newRowData, min_weight: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Custom Rate (flat)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newRowData.custom_rate ?? 0}
                    onChange={(e) =>
                      setNewRowData({ ...newRowData, custom_rate: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Purchase Rate / kg</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newRowData.purchase_rate ?? 0}
                    onChange={(e) =>
                      setNewRowData({ ...newRowData, purchase_rate: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sale Rate / kg</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newRowData.sale_rate ?? 0}
                    onChange={(e) =>
                      setNewRowData({ ...newRowData, sale_rate: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddRowModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold"
                >
                  Save Rate Row
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
