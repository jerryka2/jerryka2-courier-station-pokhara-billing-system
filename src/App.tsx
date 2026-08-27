import { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { BillingForm } from './components/BillingForm';
import { ExpressBillingForm } from './components/ExpressBillingForm';
import { InvoiceList } from './components/InvoiceList';
import { KathmanduBillingForm } from './components/KathmanduBillingForm';
import { KathmanduBillingList } from './components/KathmanduBillingList';
import { PrintKathmanduDocument } from './components/PrintKathmanduDocument';
import { DispatchedList } from './components/DispatchedList';
import { InvoiceDetail } from './components/InvoiceDetail';
import { DocumentationCenter } from './components/DocumentationCenter';
import { ExpenseTracker } from './components/ExpenseTracker';
import { StockManagement } from './components/StockManagement';
import { AdminPanel } from './components/AdminPanel';
import { AuthModal } from './components/AuthModal';
import {
  Rate,
  Invoice,
  KathmanduBilling,
  Expense,
  UserRole,
  PDFVersion,
} from './types';
import {
  getRates,
  saveRates,
  getInvoices,
  saveInvoices,
  getKathmanduBillings,
  saveKathmanduBillings,
  deleteKathmanduBilling,
  getExpenses,
  saveExpenses,
  getAuthRole,
  setAuthRole,
  initFirebaseCloudSync,
} from './lib/storage';
import { downloadInvoicePDF, downloadKathmanduBillingPDF } from './lib/pdfGenerator';
import { useReactToPrint } from 'react-to-print';
import { X, Printer, Download } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Application Data State
  const [rates, setRatesState] = useState<Rate[]>([]);
  const [invoices, setInvoicesState] = useState<Invoice[]>([]);
  const [ktmBillings, setKtmBillingsState] = useState<KathmanduBilling[]>([]);
  const [expenses, setExpensesState] = useState<Expense[]>([]);
  const [role, setRoleState] = useState<UserRole | null>(null);

  // View & Edit State for Customer Invoices
  const [viewingInvoiceId, setViewingInvoiceId] = useState<string | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  // View & Edit State for Kathmandu Billing
  const [isCreatingKtmBilling, setIsCreatingKtmBilling] = useState(false);
  const [editingKtmBilling, setEditingKtmBilling] = useState<KathmanduBilling | null>(null);
  const [preselectedCustomerInvoiceId, setPreselectedCustomerInvoiceId] = useState<string | undefined>(undefined);
  const [printingKtmBilling, setPrintingKtmBilling] = useState<KathmanduBilling | null>(null);

  // Auth Modal State
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Print ref for Kathmandu Billing direct browser print
  const ktmPrintRef = useRef<HTMLDivElement>(null);
  const handlePrintKtm = useReactToPrint({
    contentRef: ktmPrintRef,
    documentTitle: printingKtmBilling ? `KTM_Bill_${printingKtmBilling.ktm_invoice_no}` : 'Kathmandu_Billing',
  });

  // Load Initial Data on Mount & Initialize Firebase Realtime Cloud Sync
  useEffect(() => {
    initFirebaseCloudSync();

    const reloadLocalData = () => {
      const newRates = getRates();
      const newInvoices = getInvoices();
      const newKtm = getKathmanduBillings();
      const newExpenses = getExpenses();
      const newRole = getAuthRole();

      setRatesState((prev) => (JSON.stringify(prev) !== JSON.stringify(newRates) ? newRates : prev));
      setInvoicesState((prev) => (JSON.stringify(prev) !== JSON.stringify(newInvoices) ? newInvoices : prev));
      setKtmBillingsState((prev) => (JSON.stringify(prev) !== JSON.stringify(newKtm) ? newKtm : prev));
      setExpensesState((prev) => (JSON.stringify(prev) !== JSON.stringify(newExpenses) ? newExpenses : prev));
      setRoleState((prev) => (prev !== newRole ? newRole : prev));
    };

    reloadLocalData();

    window.addEventListener('csp_data_updated', reloadLocalData);
    return () => {
      window.removeEventListener('csp_data_updated', reloadLocalData);
    };
  }, []);

  // Sync Rates
  const handleUpdateRates = (newRates: Rate[]) => {
    setRatesState(newRates);
    saveRates(newRates);
  };

  // Sync Customer Invoices (Create or Update)
  const handleSaveInvoice = (savedInvoice: Invoice) => {
    setInvoicesState((prev) => {
      const exists = prev.some((inv) => inv.id === savedInvoice.id);
      let updatedList: Invoice[];
      if (exists) {
        updatedList = prev.map((inv) => (inv.id === savedInvoice.id ? savedInvoice : inv));
      } else {
        updatedList = [savedInvoice, ...prev];
      }
      saveInvoices(updatedList);
      return updatedList;
    });

    setEditingInvoice(null);
  };

  // Delete Customer Invoice
  const handleDeleteInvoice = (id: string) => {
    setInvoicesState((prev) => {
      const updatedList = prev.filter((inv) => inv.id !== id);
      saveInvoices(updatedList);
      return updatedList;
    });

    if (viewingInvoiceId === id) {
      setViewingInvoiceId(null);
    }
  };

  // Dispatch Customer Invoices
  const handleDispatchInvoices = (
    invoiceIds: string[],
    dispatchDate?: string,
    awbNo?: string,
    notes?: string,
    status: 'Billed' | 'Dispatched' = 'Dispatched'
  ) => {
    const autoDate = dispatchDate || new Date().toISOString().split('T')[0];
    setInvoicesState((prev) => {
      const updatedList = prev.map((inv) => {
        if (invoiceIds.includes(inv.id)) {
          return {
            ...inv,
            status,
            dispatch_date: status === 'Dispatched' ? autoDate : undefined,
            awb_no: status === 'Dispatched' ? (awbNo !== undefined ? awbNo : inv.awb_no) : undefined,
            dispatch_notes: status === 'Dispatched' ? (notes !== undefined ? notes : inv.dispatch_notes) : undefined,
            updated_at: new Date().toISOString(),
          };
        }
        return inv;
      });
      saveInvoices(updatedList);
      return updatedList;
    });
  };

  // Sync Kathmandu Billings (Create or Update)
  const handleSaveKathmanduBilling = (savedBilling: KathmanduBilling) => {
    setKtmBillingsState((prev) => {
      const exists = prev.some((b) => b.id === savedBilling.id);
      let updatedList: KathmanduBilling[];
      if (exists) {
        updatedList = prev.map((b) => (b.id === savedBilling.id ? savedBilling : b));
      } else {
        updatedList = [savedBilling, ...prev];
      }
      saveKathmanduBillings(updatedList);
      return updatedList;
    });

    // If an explicit customer invoice was chosen, associate the reference ID only without touching deal or purchase amounts
    if (savedBilling.customer_invoice_id) {
      setInvoicesState((prevInvoices) => {
        let changed = false;
        const updatedInvoices = prevInvoices.map((inv) => {
          if (inv.id === savedBilling.customer_invoice_id && inv.ktm_billing_id !== savedBilling.id) {
            changed = true;
            return {
              ...inv,
              ktm_billing_id: savedBilling.id,
              updated_at: new Date().toISOString(),
            };
          }
          return inv;
        });

        if (changed) {
          saveInvoices(updatedInvoices);
        }
        return updatedInvoices;
      });
    }

    setIsCreatingKtmBilling(false);
    setEditingKtmBilling(null);
    setPreselectedCustomerInvoiceId(undefined);
  };

  // Delete Kathmandu Billing
  const handleDeleteKathmanduBilling = (id: string) => {
    deleteKathmanduBilling(id);
    setKtmBillingsState((prev) => prev.filter((b) => b.id !== id));
  };

  // Trigger new Kathmandu bill from Customer Invoice
  const handleGenerateKtmBillFromCustomer = (customerInvoiceId?: string) => {
    setPreselectedCustomerInvoiceId(customerInvoiceId);
    setEditingKtmBilling(null);
    setIsCreatingKtmBilling(true);
    setViewingInvoiceId(null);
    setActiveTab('kathmandu_billing');
  };

  // Sync Expenses (Add & Delete)
  const handleAddExpense = (newExp: Expense) => {
    setExpensesState((prev) => {
      const updatedList = [newExp, ...prev];
      saveExpenses(updatedList);
      return updatedList;
    });
  };

  const handleDeleteExpense = (id: string) => {
    setExpensesState((prev) => {
      const updatedList = prev.filter((e) => e.id !== id);
      saveExpenses(updatedList);
      return updatedList;
    });
  };

  // Auth & Role Handlers
  const handleSelectRole = (selectedRole: UserRole) => {
    setRoleState(selectedRole);
    setAuthRole(selectedRole);
  };

  const handleLogout = () => {
    setIsAuthOpen(true);
  };

  // Customer Navigation Trigger Helpers
  const handleViewInvoice = (id: string) => {
    setViewingInvoiceId(id);
    setActiveTab('invoices');
  };

  const handleEditInvoice = (inv: Invoice) => {
    setEditingInvoice(inv);
    setViewingInvoiceId(null);
    setActiveTab('billing');
  };

  const handlePrintInvoice = (inv: Invoice, version: PDFVersion) => {
    downloadInvoicePDF(inv, version);
  };

  const currentViewingInvoice = invoices.find((inv) => inv.id === viewingInvoiceId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col antialiased">
      {/* Sticky Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setViewingInvoiceId(null);
          if (tab === 'billing' && !editingInvoice) {
            setEditingInvoice(null);
          }
          if (tab === 'kathmandu_billing' && !editingKtmBilling && !isCreatingKtmBilling) {
            setIsCreatingKtmBilling(false);
          }
          setActiveTab(tab);
        }}
        role={role}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 pt-3 pb-24 sm:p-6 lg:p-8">
        {/* VIEW 1: Customer Invoice Detail View */}
        {(activeTab === 'invoices' || activeTab === 'dispatched' || activeTab === 'documents') && currentViewingInvoice ? (
          <InvoiceDetail
            invoice={currentViewingInvoice}
            role={role}
            onBack={() => setViewingInvoiceId(null)}
            onEdit={handleEditInvoice}
            onDelete={handleDeleteInvoice}
            onDispatchInvoices={handleDispatchInvoices}
            onGenerateKtmBill={handleGenerateKtmBillFromCustomer}
          />
        ) : (
          <>
            {/* VIEW 2: Dashboard */}
            {activeTab === 'dashboard' && (
              <Dashboard
                invoices={invoices}
                ktmBillings={ktmBillings}
                expenses={expenses}
                onNavigate={(tab) => {
                  setViewingInvoiceId(null);
                  setActiveTab(tab);
                }}
                onViewInvoice={handleViewInvoice}
                onNewKtmBilling={handleGenerateKtmBillFromCustomer}
              />
            )}

            {/* VIEW 3: Customer Standard Billing / Air Cargo Invoice */}
            <div className={activeTab === 'billing' ? 'block' : 'hidden'}>
              <BillingForm
                rates={rates}
                invoices={invoices}
                editingInvoice={editingInvoice}
                onSaveInvoice={handleSaveInvoice}
                onCancelEdit={() => setEditingInvoice(null)}
              />
            </div>

            {/* VIEW 3B: DHL & Express Service Dedicated Billing & Medicine Clearance */}
            <div className={activeTab === 'express_billing' ? 'block' : 'hidden'}>
              <ExpressBillingForm
                rates={rates}
                invoices={invoices}
                editingInvoice={editingInvoice}
                onSaveInvoice={handleSaveInvoice}
                onCancelEdit={() => setEditingInvoice(null)}
              />
            </div>

            {/* VIEW 4: Kathmandu Billing Flow (Form or List) */}
            {activeTab === 'kathmandu_billing' && (
              <>
                {isCreatingKtmBilling || editingKtmBilling ? (
                  <KathmanduBillingForm
                    customerInvoices={invoices}
                    editingBilling={editingKtmBilling}
                    initialCustomerInvoiceId={preselectedCustomerInvoiceId}
                    onSave={handleSaveKathmanduBilling}
                    onCancel={() => {
                      setIsCreatingKtmBilling(false);
                      setEditingKtmBilling(null);
                      setPreselectedCustomerInvoiceId(undefined);
                    }}
                  />
                ) : (
                  <KathmanduBillingList
                    billings={ktmBillings}
                    customerInvoices={invoices}
                    role={role}
                    onNewBilling={() => {
                      setEditingKtmBilling(null);
                      setPreselectedCustomerInvoiceId(undefined);
                      setIsCreatingKtmBilling(true);
                    }}
                    onEditBilling={(billing) => {
                      setEditingKtmBilling(billing);
                      setIsCreatingKtmBilling(true);
                    }}
                    onDeleteBilling={handleDeleteKathmanduBilling}
                    onPrintBilling={(billing) => {
                      setPrintingKtmBilling(billing);
                    }}
                    onDownloadPDF={(billing) => {
                      downloadKathmanduBillingPDF(billing);
                    }}
                  />
                )}
              </>
            )}

            {/* VIEW 5: Invoices Directory */}
            {activeTab === 'invoices' && !currentViewingInvoice && (
              <InvoiceList
                invoices={invoices}
                role={role}
                onViewInvoice={handleViewInvoice}
                onEditInvoice={handleEditInvoice}
                onDeleteInvoice={handleDeleteInvoice}
                onPrintInvoice={handlePrintInvoice}
                onDispatchInvoices={handleDispatchInvoices}
                onGenerateKtmBill={handleGenerateKtmBillFromCustomer}
              />
            )}

            {/* VIEW 6: Dedicated Documentation Center & Manifests */}
            {activeTab === 'documents' && !currentViewingInvoice && (
              <DocumentationCenter
                invoices={invoices}
                role={role}
                onViewInvoice={handleViewInvoice}
                onEditInvoice={handleEditInvoice}
                onPrintInvoice={handlePrintInvoice}
              />
            )}

            {/* VIEW 7: Dispatched Directory */}
            {activeTab === 'dispatched' && !currentViewingInvoice && (
              <DispatchedList
                invoices={invoices}
                onViewInvoice={handleViewInvoice}
                onPrintInvoice={handlePrintInvoice}
                onUpdateDispatchInfo={(id, date, awb, notes) =>
                  handleDispatchInvoices([id], date, awb, notes)
                }
                onMarkAsBilled={(id) =>
                  handleDispatchInvoices([id], undefined, undefined, undefined, 'Billed')
                }
              />
            )}

            {/* VIEW 8: Expense Tracker */}
            {activeTab === 'expenses' && (
              <ExpenseTracker
                expenses={expenses}
                role={role}
                onAddExpense={handleAddExpense}
                onDeleteExpense={handleDeleteExpense}
              />
            )}

            {/* VIEW 9: Stock Management */}
            {activeTab === 'stock' && (
              <StockManagement role={role} />
            )}

            {/* VIEW 10: Admin Panel (Rates Management) */}
            {activeTab === 'admin' && (
              <AdminPanel
                rates={rates}
                role={role}
                onUpdateRates={handleUpdateRates}
              />
            )}
          </>
        )}
      </main>

      {/* Kathmandu Billing Print & Preview Modal */}
      {printingKtmBilling && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                  <span>Kathmandu Billing Document & Preview</span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-600 text-white">
                    {printingKtmBilling.ktm_invoice_no}
                  </span>
                </h3>
                <p className="text-xs text-slate-300">
                  Ready for A4 printer or PDF download
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrintKtm()}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
                <button
                  onClick={() => downloadKathmanduBillingPDF(printingKtmBilling)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={() => setPrintingKtmBilling(null)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Content Scroll Area */}
            <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-100 flex justify-center">
              <div className="bg-white shadow-lg rounded-lg max-w-2xl w-full p-2 border border-slate-200">
                <PrintKathmanduDocument ref={ktmPrintRef} billing={printingKtmBilling} />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-white border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setPrintingKtmBilling(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-lg transition cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Selection & Sign-In Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSelectRole={handleSelectRole}
        currentRole={role}
      />

      {/* Footer */}
      <footer className="bg-white text-slate-500 text-xs py-6 border-t border-slate-200 text-center">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-slate-700">Courier Station Pokhara Dual Billing System</p>
          <p className="text-slate-400">
            B & D Bhawan, New Road, Pokhara, Nepal • Profit = Customer Revenue − Kathmandu Cost − Expenses
          </p>
        </div>
      </footer>
    </div>
  );
}
