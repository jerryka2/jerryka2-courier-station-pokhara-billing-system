import React from 'react';
import { UserRole } from '../types';
import { LOGO_URL } from '../assets/logo';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Receipt,
  FileText,
  Truck,
  Wallet,
  Boxes,
  ShieldAlert,
  User,
  LogOut,
  UserCheck,
  Cloud,
  Building2,
  Zap,
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  role: UserRole | null;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  role,
  onOpenAuth,
  onLogout,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'billing', label: 'Customer Billing', icon: FileSpreadsheet },
    { id: 'express_billing', label: 'DHL & Express Invoice', icon: Zap },
    { id: 'kathmandu_billing', label: 'Kathmandu Billing', icon: Building2 },
    { id: 'invoices', label: 'Invoices', icon: Receipt },
    { id: 'documents', label: 'Documents & Manifests', icon: FileText },
    { id: 'dispatched', label: 'Dispatched', icon: Truck },
    { id: 'expenses', label: 'Expenses', icon: Wallet },
    { id: 'stock', label: 'Stock', icon: Boxes },
    { id: 'admin', label: 'Admin Panel', icon: ShieldAlert, adminOnly: true },
  ];

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Top Header Section */}
      <div className="max-w-7xl mx-auto px-3 sm:px-8 py-2.5 sm:py-4 flex justify-between items-center gap-2 sm:gap-4">
        {/* Brand Logo & Name */}
        <div
          className="flex items-center gap-2.5 sm:gap-3.5 cursor-pointer min-w-0"
          onClick={() => setActiveTab('dashboard')}
        >
          <img
            src={LOGO_URL}
            alt="The Courier Station Sadobato Logo"
            className="w-9 h-9 sm:w-12 sm:h-12 object-contain rounded-lg border border-slate-200 bg-white shadow-xs p-0.5 shrink-0"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-bold tracking-tight text-slate-900 leading-tight truncate">
              The Courier Station Sadobato
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-500 font-medium truncate">
              Shipping Worldwide • Sadobato, Lalitpur / Kathmandu
            </p>
          </div>
        </div>

        {/* User Role & System Status */}
        <div className="flex items-center gap-2 sm:gap-5 shrink-0">
          {role ? (
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-700 capitalize">
                  {role === 'admin' ? 'Admin User' : 'Billing Staff'}
                </p>
                <p className="text-[10px] text-emerald-600 font-medium flex items-center justify-end gap-1">
                  <Cloud className="w-3 h-3 text-emerald-500" />
                  Cloud Database Synced
                </p>
              </div>
              <div
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer hover:bg-slate-200 transition"
                onClick={onLogout}
                title="Click to Switch Role or Logout"
              >
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />
              </div>
              <button
                onClick={onLogout}
                title="Switch Role or Logout"
                className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md text-xs transition shadow-xs"
            >
              <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs Bar (Desktop / Tablet) */}
      <div className="hidden sm:block bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex gap-1 sm:gap-6 overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isDisabled = item.adminOnly && role !== 'admin';

            return (
              <button
                key={item.id}
                onClick={() => !isDisabled && setActiveTab(item.id)}
                disabled={isDisabled}
                title={isDisabled ? 'Admin privilege required' : undefined}
                className={`py-3.5 px-3 text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
                  isActive
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : isDisabled
                    ? 'border-transparent text-slate-400 cursor-not-allowed opacity-60'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.adminOnly && role !== 'admin' && (
                  <span className="text-[9px] uppercase px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200 ml-0.5">
                    Admin
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>

    {/* Mobile Fixed Bottom Navigation Bar */}
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/80 sm:hidden px-2 py-1 shadow-lg overflow-x-auto no-scrollbar">
      <div className="flex items-center justify-between min-w-max gap-1 mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isDisabled = item.adminOnly && role !== 'admin';

          if (isDisabled) return null;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-lg transition-all min-w-[56px] ${
                isActive
                  ? 'text-blue-600 font-bold bg-blue-50/80 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span className="text-[10px] tracking-tight mt-0.5 leading-none whitespace-nowrap">
                {item.id === 'dashboard' ? 'Home' : item.id === 'documents' ? 'Docs' : item.id === 'dispatched' ? 'Dispatch' : item.label.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
    </>
  );
};
