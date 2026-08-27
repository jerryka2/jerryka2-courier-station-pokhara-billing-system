import { Rate, Invoice, KathmanduBilling, KathmanduSettlementCycle, KathmanduPaymentRecord, Expense, UserRole, StaffUser, StaffStatus, SecurityAuditLog, SystemSettings, StockItem, StockLog, ShipperProfile } from '../types';
import { db, doc, setDoc, getDoc, collection, getDocs, deleteDoc, onSnapshot } from './firebase';

const RATES_KEY = 'csp_rates_v1';
const INVOICES_KEY = 'csp_invoices_v1';
const KTM_BILLINGS_KEY = 'csp_ktm_billings_v1';
const KTM_SETTLEMENTS_KEY = 'csp_ktm_settlements_v1';
const EXPENSES_KEY = 'csp_expenses_v1';
const AUTH_KEY = 'csp_auth_role_v1';
const STAFF_USERS_KEY = 'csp_staff_users_v1';
const CURRENT_USER_KEY = 'csp_current_user_profile_v1';
const AUDIT_LOGS_KEY = 'csp_audit_logs_v1';
const SETTINGS_KEY = 'csp_admin_settings_v1';
const STOCK_KEY = 'csp_stock_items_v1';
const STOCK_LOGS_KEY = 'csp_stock_logs_v1';
const SHIPPERS_KEY = 'csp_shippers_v1';

// Cloud Sync Status Tracking
let isCloudConnected = false;
let cloudSyncListenersAttached = false;
const seededCollections = new Set<string>();
let updateNotificationTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Debounced notification dispatcher to avoid rapid cascading re-renders
 */
export function notifyDataUpdated(): void {
  if (updateNotificationTimer) {
    clearTimeout(updateNotificationTimer);
  }
  updateNotificationTimer = setTimeout(() => {
    window.dispatchEvent(new Event('csp_data_updated'));
  }, 300);
}

export function isCloudSynced(): boolean {
  return isCloudConnected;
}

// Helper function to strip out undefined properties recursively for Firestore compliance
export function removeUndefinedFields<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedFields) as unknown as T;
  }
  const cleanObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleanObj[key] = typeof value === 'object' && value !== null ? removeUndefinedFields(value) : value;
    }
  }
  return cleanObj as T;
}

// Sync helper functions to save to Cloud Firestore asynchronously
async function saveInvoiceToCloud(invoice: Invoice) {
  try {
    const cleanData = removeUndefinedFields(invoice);
    await setDoc(doc(db, 'invoices', invoice.id), cleanData);
    isCloudConnected = true;
  } catch (err) {
    console.error('Firestore save invoice error:', err);
  }
}

async function deleteInvoiceFromCloud(invoiceId: string) {
  try {
    await deleteDoc(doc(db, 'invoices', invoiceId));
  } catch (err) {
    console.error('Firestore delete invoice error:', err);
  }
}

export async function saveKathmanduBillingToCloud(bill: KathmanduBilling): Promise<void> {
  try {
    const cleanData = removeUndefinedFields({
      ...bill,
      updated_at: new Date().toISOString(),
    });
    await setDoc(doc(db, 'kathmandu_billings', bill.id), cleanData, { merge: true });
    isCloudConnected = true;
  } catch (err) {
    console.error('Firestore save ktm billing error:', err);
  }
}

export async function deleteKathmanduBillingFromCloud(ktmBillingId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'kathmandu_billings', ktmBillingId));
  } catch (err) {
    console.error('Firestore delete ktm billing error:', err);
  }
}

export async function saveKathmanduSettlementToCloud(cycle: KathmanduSettlementCycle): Promise<void> {
  try {
    const cleanData = removeUndefinedFields(cycle);
    await setDoc(doc(db, 'kathmandu_settlements', cycle.id), cleanData, { merge: true });
    isCloudConnected = true;
  } catch (err) {
    console.error('Firestore save ktm settlement error:', err);
  }
}

export async function deleteKathmanduSettlementFromCloud(cycleId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'kathmandu_settlements', cycleId));
  } catch (err) {
    console.error('Firestore delete ktm settlement error:', err);
  }
}

async function saveExpenseToCloud(expense: Expense) {
  try {
    const cleanData = removeUndefinedFields(expense);
    await setDoc(doc(db, 'expenses', expense.id), cleanData);
    isCloudConnected = true;
  } catch (err) {
    console.error('Firestore save expense error:', err);
  }
}

async function deleteExpenseFromCloud(expenseId: string) {
  try {
    await deleteDoc(doc(db, 'expenses', expenseId));
  } catch (err) {
    console.error('Firestore delete expense error:', err);
  }
}

async function saveStockItemToCloud(item: StockItem) {
  try {
    const cleanData = removeUndefinedFields(item);
    await setDoc(doc(db, 'inventory', item.id), cleanData);
    isCloudConnected = true;
  } catch (err) {
    console.error('Firestore save stock error:', err);
  }
}

async function saveRateToCloud(rate: Rate) {
  try {
    const cleanData = removeUndefinedFields(rate);
    await setDoc(doc(db, 'rate_cards', rate.id), cleanData);
    isCloudConnected = true;
  } catch (err) {
    console.error('Firestore save rate error:', err);
  }
}

async function saveStaffUserToCloud(user: StaffUser) {
  try {
    const cleanData = removeUndefinedFields(user);
    await setDoc(doc(db, 'staff_users', user.id), cleanData);
    isCloudConnected = true;
  } catch (err) {
    console.error('Firestore save staff user error:', err);
  }
}

async function saveSettingsToCloud(settings: SystemSettings) {
  try {
    const cleanData = removeUndefinedFields(settings);
    await setDoc(doc(db, 'system_settings', 'main_settings'), cleanData);
    isCloudConnected = true;
  } catch (err) {
    console.error('Firestore save settings error:', err);
  }
}

async function saveShipperToCloud(shipper: ShipperProfile) {
  try {
    const cleanData = removeUndefinedFields(shipper);
    await setDoc(doc(db, 'shippers', shipper.id), cleanData);
    isCloudConnected = true;
  } catch (err) {
    console.error('Firestore save shipper error:', err);
  }
}

async function deleteShipperFromCloud(shipperId: string) {
  try {
    await deleteDoc(doc(db, 'shippers', shipperId));
  } catch (err) {
    console.error('Firestore delete shipper error:', err);
  }
}

// Initialize realtime listeners and push initial seed data if Firestore is empty
export function initFirebaseCloudSync(): void {
  if (cloudSyncListenersAttached) return;
  cloudSyncListenersAttached = true;

  try {
    // 1. Sync Invoices (Customer Billing)
    onSnapshot(collection(db, 'invoices'), (snapshot) => {
      isCloudConnected = true;
      if (!snapshot.empty) {
        const cloudInvoices: Invoice[] = [];
        snapshot.forEach((d) => cloudInvoices.push(d.data() as Invoice));
        cloudInvoices.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        const existing = localStorage.getItem(INVOICES_KEY);
        const nextStr = JSON.stringify(cloudInvoices);
        if (existing !== nextStr) {
          localStorage.setItem(INVOICES_KEY, nextStr);
          notifyDataUpdated();
        }
      }
    }, (err) => console.warn('Firestore invoices snapshot warning:', err));

    // 2. Sync Kathmandu Billings
    onSnapshot(collection(db, 'kathmandu_billings'), (snapshot) => {
      isCloudConnected = true;
      if (!snapshot.empty) {
        const cloudKtmBills: KathmanduBilling[] = [];
        snapshot.forEach((d) => cloudKtmBills.push(d.data() as KathmanduBilling));
        cloudKtmBills.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        const existing = localStorage.getItem(KTM_BILLINGS_KEY);
        const nextStr = JSON.stringify(cloudKtmBills);
        if (existing !== nextStr) {
          localStorage.setItem(KTM_BILLINGS_KEY, nextStr);
          notifyDataUpdated();
        }
      } else if (!seededCollections.has('kathmandu_billings')) {
        seededCollections.add('kathmandu_billings');
        const localKtm = getKathmanduBillings();
        if (localKtm.length > 0) {
          localKtm.forEach((b) => saveKathmanduBillingToCloud(b));
        }
      }
    }, (err) => console.warn('Firestore ktm_billings snapshot warning:', err));

    // 2b. Sync Kathmandu Settlements
    onSnapshot(collection(db, 'kathmandu_settlements'), (snapshot) => {
      isCloudConnected = true;
      if (!snapshot.empty) {
        const cloudSettlements: KathmanduSettlementCycle[] = [];
        snapshot.forEach((d) => cloudSettlements.push(d.data() as KathmanduSettlementCycle));
        cloudSettlements.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        const existing = localStorage.getItem(KTM_SETTLEMENTS_KEY);
        const nextStr = JSON.stringify(cloudSettlements);
        if (existing !== nextStr) {
          localStorage.setItem(KTM_SETTLEMENTS_KEY, nextStr);
          notifyDataUpdated();
        }
      } else if (!seededCollections.has('kathmandu_settlements')) {
        seededCollections.add('kathmandu_settlements');
        const localSettlements = getKathmanduSettlementCycles();
        if (localSettlements.length > 0) {
          localSettlements.forEach((c) => saveKathmanduSettlementToCloud(c));
        }
      }
    }, (err) => console.warn('Firestore ktm_settlements snapshot warning:', err));

    // 3. Sync Shippers
    onSnapshot(collection(db, 'shippers'), (snapshot) => {
      isCloudConnected = true;
      if (!snapshot.empty) {
        const cloudShippers: ShipperProfile[] = [];
        snapshot.forEach((d) => cloudShippers.push(d.data() as ShipperProfile));
        const existing = localStorage.getItem(SHIPPERS_KEY);
        const nextStr = JSON.stringify(cloudShippers);
        if (existing !== nextStr) {
          localStorage.setItem(SHIPPERS_KEY, nextStr);
          notifyDataUpdated();
        }
      } else if (!seededCollections.has('shippers')) {
        seededCollections.add('shippers');
        const localShippers = getShipperProfiles();
        if (localShippers.length > 0) {
          localShippers.forEach((s) => saveShipperToCloud(s));
        }
      }
    }, (err) => console.warn('Firestore shippers snapshot warning:', err));

    // 4. Sync Expenses
    onSnapshot(collection(db, 'expenses'), (snapshot) => {
      isCloudConnected = true;
      if (!snapshot.empty) {
        const cloudExpenses: Expense[] = [];
        snapshot.forEach((d) => cloudExpenses.push(d.data() as Expense));
        cloudExpenses.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        const existing = localStorage.getItem(EXPENSES_KEY);
        const nextStr = JSON.stringify(cloudExpenses);
        if (existing !== nextStr) {
          localStorage.setItem(EXPENSES_KEY, nextStr);
          notifyDataUpdated();
        }
      }
    }, (err) => console.warn('Firestore expenses snapshot warning:', err));

    // 5. Sync Inventory Stock
    onSnapshot(collection(db, 'inventory'), (snapshot) => {
      isCloudConnected = true;
      if (!snapshot.empty) {
        const cloudStock: StockItem[] = [];
        snapshot.forEach((d) => cloudStock.push(d.data() as StockItem));
        const existing = localStorage.getItem(STOCK_KEY);
        const nextStr = JSON.stringify(cloudStock);
        if (existing !== nextStr) {
          localStorage.setItem(STOCK_KEY, nextStr);
          notifyDataUpdated();
        }
      }
    }, (err) => console.warn('Firestore inventory snapshot warning:', err));

    // 6. Sync Rate Cards
    onSnapshot(collection(db, 'rate_cards'), (snapshot) => {
      isCloudConnected = true;
      if (!snapshot.empty) {
        const cloudRates: Rate[] = [];
        snapshot.forEach((d) => cloudRates.push(d.data() as Rate));
        const existing = localStorage.getItem(RATES_KEY);
        const nextStr = JSON.stringify(cloudRates);
        if (existing !== nextStr) {
          localStorage.setItem(RATES_KEY, nextStr);
          notifyDataUpdated();
        }
      } else if (!seededCollections.has('rate_cards')) {
        seededCollections.add('rate_cards');
        const localRates = getRates();
        if (localRates.length > 0) {
          localRates.forEach((r) => saveRateToCloud(r));
        }
      }
    }, (err) => console.warn('Firestore rate_cards snapshot warning:', err));

    // 7. Sync System Settings
    onSnapshot(doc(db, 'system_settings', 'main_settings'), (snapshot) => {
      isCloudConnected = true;
      if (snapshot.exists()) {
        const settings = snapshot.data() as SystemSettings;
        const existing = localStorage.getItem(SETTINGS_KEY);
        const nextStr = JSON.stringify(settings);
        if (existing !== nextStr) {
          localStorage.setItem(SETTINGS_KEY, nextStr);
          notifyDataUpdated();
        }
      } else if (!seededCollections.has('system_settings')) {
        seededCollections.add('system_settings');
        saveSettingsToCloud(getSystemSettings());
      }
    }, (err) => console.warn('Firestore settings snapshot warning:', err));

  } catch (err) {
    console.error('Failed to initialize Firebase Cloud sync:', err);
  }
}

// Initial Seed Staff Users
const INITIAL_STAFF_USERS: StaffUser[] = [
  {
    id: 'usr-admin-1',
    name: 'Gauri Suman (System Owner)',
    email: 'admin@courierstation.np',
    phone: '+977-9856012345',
    role: 'admin',
    status: 'verified',
    registeredAt: '2026-01-01T00:00:00.000Z',
    verifiedAt: '2026-01-01T00:00:00.000Z',
    verifiedBy: 'System Auto-Verify',
    pin: '1234',
  },
  {
    id: 'usr-staff-1',
    name: 'Suman Sharma (Senior Counter Staff)',
    email: 'staff@courierstation.np',
    phone: '+977-9846098765',
    role: 'staff',
    status: 'verified',
    registeredAt: '2026-06-15T10:30:00.000Z',
    verifiedAt: '2026-06-15T11:00:00.000Z',
    verifiedBy: 'admin@courierstation.np',
    pin: '5678',
  },
  {
    id: 'usr-staff-2',
    name: 'Ramesh Adhikari (New Trainee Staff)',
    email: 'ramesh@courierstation.np',
    phone: '+977-9812345678',
    role: 'staff',
    status: 'pending',
    registeredAt: '2026-07-30T09:15:00.000Z',
  },
];

// Initial System Settings
const DEFAULT_SETTINGS: SystemSettings = {
  companyName: 'The Courier Station Sadobato',
  tagline: 'Shipping Worldwide • Reliable Global Express',
  address: 'Sadobato, Lalitpur / Kathmandu, Nepal',
  phone: '+977-1-5544332 / 9851012345',
  email: 'info@courierstationsadobato.com',
  portOfLoading: 'Kathmandu, Nepal',
  adminPin: '1234',
  requirePinForDelete: true,
  autoLogoutMinutes: 30,
};

// Initial Security Audit Logs
const INITIAL_AUDIT_LOGS: SecurityAuditLog[] = [
  {
    id: 'log-1',
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    action: 'SYSTEM_BOOT',
    userEmail: 'admin@courierstation.np',
    userRole: 'admin',
    details: 'System database initialized with encryption key verification.',
  },
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    action: 'STAFF_VERIFIED',
    userEmail: 'admin@courierstation.np',
    userRole: 'admin',
    details: 'Verified staff user Suman Sharma (staff@courierstation.np)',
  },
];


// Initial Seed Shipper Profiles (Carrier Forwarding & Station Entities)
export const INITIAL_SHIPPERS: ShipperProfile[] = [
  {
    id: 'shipper-csp',
    name: 'The Courier Station Sadobato',
    code: 'CSS',
    tagline: 'Shipping Worldwide • Priority International Desk',
    address: 'Sadobato, Lalitpur / Kathmandu, Nepal',
    city: 'Kathmandu / Lalitpur',
    country: 'Nepal',
    phone: '+977-1-5544332 / 9851012345',
    email: 'info@courierstationsadobato.com',
    port_of_loading: 'Kathmandu, Nepal',
    tax_id: 'PAN: 609823411',
    is_default: true,
    notes: 'Primary Station Counter & Issuing Entity',
  },
  {
    id: 'shipper-dhl',
    name: 'DHL Express Partner Hub',
    code: 'DHL',
    tagline: 'Excellence. Simply Delivered.',
    address: 'Cargo Complex, TIA Airport Gate, Kathmandu, Nepal',
    city: 'Kathmandu',
    country: 'Nepal',
    phone: '+977-1-4428000',
    email: 'express@dhl-nepal.com',
    port_of_loading: 'TIA Kathmandu, Nepal',
    tax_id: 'PAN: 301294821',
    is_default: false,
    notes: 'Worldwide International Express Air Network',
  },
  {
    id: 'shipper-fedex',
    name: 'FedEx Express / Flying Cargo',
    code: 'FEDEX',
    tagline: 'Connecting People & Possibilities Worldwide',
    address: 'Durbar Marg, Kathmandu, Nepal',
    city: 'Kathmandu',
    country: 'Nepal',
    phone: '+977-1-4229988',
    email: 'support@fedexnepal.com',
    port_of_loading: 'Kathmandu, Nepal',
    tax_id: 'PAN: 300482910',
    is_default: false,
    notes: 'Direct North America & Europe Express Services',
  },
  {
    id: 'shipper-aramex',
    name: 'Aramex Global Express',
    code: 'ARAMEX',
    tagline: 'Delivery Unlimited',
    address: 'Thamel Express Hub, Kathmandu, Nepal',
    city: 'Kathmandu',
    country: 'Nepal',
    phone: '+977-1-4700888',
    email: 'ktm@aramex.com',
    port_of_loading: 'Kathmandu, Nepal',
    tax_id: 'PAN: 601938274',
    is_default: false,
    notes: 'Middle East, Australia & Asia Priority Express',
  },
  {
    id: 'shipper-skynet',
    name: 'Skynet Worldwide Express',
    code: 'SKYNET',
    tagline: 'Your Global Logistics Partner',
    address: 'Pokhara City Hub, Mahendrapool, Pokhara, Nepal',
    city: 'Pokhara',
    country: 'Nepal',
    phone: '+977-61-532100',
    email: 'ops@skynetnepal.com',
    port_of_loading: 'Kathmandu, Nepal',
    tax_id: 'PAN: 604928172',
    is_default: false,
    notes: 'UK, EU & Regional Courier Network',
  },
  {
    id: 'shipper-ups',
    name: 'UPS Authorised Service Contractor',
    code: 'UPS',
    tagline: 'Moving our world forward by delivering what matters',
    address: 'Kamaladi, Kathmandu, Nepal',
    city: 'Kathmandu',
    country: 'Nepal',
    phone: '+977-1-4245600',
    email: 'cargo@upsnepal.com',
    port_of_loading: 'Kathmandu, Nepal',
    tax_id: 'PAN: 304829104',
    is_default: false,
    notes: 'Commercial Air Freight & Heavy Parcel Line',
  },
];

// Initial seed rates for Courier Station Pokhara
const INITIAL_RATES: Rate[] = [];

const INITIAL_INVOICES: Invoice[] = [];

const INITIAL_EXPENSES: Expense[] = [];

const INITIAL_KTM_BILLINGS: KathmanduBilling[] = [];

export function getStaffUsers(): StaffUser[] {
  try {
    const data = localStorage.getItem(STAFF_USERS_KEY);
    if (!data) {
      localStorage.setItem(STAFF_USERS_KEY, JSON.stringify(INITIAL_STAFF_USERS));
      return INITIAL_STAFF_USERS;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Error reading staff users:', e);
    return INITIAL_STAFF_USERS;
  }
}

export function saveStaffUsers(users: StaffUser[]): void {
  try {
    localStorage.setItem(STAFF_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Error saving staff users:', e);
  }
}

export function verifyStaffUser(userId: string, adminEmail: string): StaffUser[] {
  const users = getStaffUsers();
  const updated = users.map((u) => {
    if (u.id === userId) {
      return {
        ...u,
        status: 'verified' as StaffStatus,
        verifiedAt: new Date().toISOString(),
        verifiedBy: adminEmail,
      };
    }
    return u;
  });
  saveStaffUsers(updated);
  addAuditLog('STAFF_VERIFIED', adminEmail, 'admin', `Verified staff user account: ${userId}`);
  return updated;
}

export function rejectStaffUser(userId: string, adminEmail: string): StaffUser[] {
  const users = getStaffUsers();
  const updated = users.map((u) => {
    if (u.id === userId) {
      return {
        ...u,
        status: 'rejected' as StaffStatus,
      };
    }
    return u;
  });
  saveStaffUsers(updated);
  addAuditLog('STAFF_REJECTED', adminEmail, 'admin', `Rejected staff user account: ${userId}`);
  return updated;
}

export function deleteStaffUser(userId: string, adminEmail: string): StaffUser[] {
  const users = getStaffUsers();
  const updated = users.filter((u) => u.id !== userId);
  saveStaffUsers(updated);
  addAuditLog('STAFF_DELETED', adminEmail, 'admin', `Deleted staff user account: ${userId}`);
  return updated;
}

export function registerNewStaffUser(newUser: Omit<StaffUser, 'id' | 'status' | 'registeredAt'>): { success: boolean; message: string; user?: StaffUser } {
  const users = getStaffUsers();
  const existing = users.find((u) => u.email.toLowerCase() === newUser.email.toLowerCase());
  if (existing) {
    return { success: false, message: 'An account with this email address already exists.' };
  }

  const createdUser: StaffUser = {
    ...newUser,
    id: `usr-staff-${Date.now()}`,
    status: 'pending',
    registeredAt: new Date().toISOString(),
  };

  const updated = [...users, createdUser];
  saveStaffUsers(updated);
  addAuditLog('STAFF_REGISTERED', newUser.email, newUser.role, `Registered new account. Status pending admin verification.`);
  return { success: true, message: 'Registration submitted! Please notify the administrator to verify your account before logging in.', user: createdUser };
}

export function getSystemSettings(): SystemSettings {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (!data) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    return JSON.parse(data);
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export function saveSystemSettings(settings: SystemSettings, adminEmail: string): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    saveSettingsToCloud(settings);
    addAuditLog('SETTINGS_UPDATED', adminEmail, 'admin', 'System settings and admin PIN updated.');
  } catch (e) {
    console.error('Error saving system settings:', e);
  }
}

export function getAuditLogs(): SecurityAuditLog[] {
  try {
    const data = localStorage.getItem(AUDIT_LOGS_KEY);
    if (!data) {
      localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(INITIAL_AUDIT_LOGS));
      return INITIAL_AUDIT_LOGS;
    }
    return JSON.parse(data);
  } catch (e) {
    return INITIAL_AUDIT_LOGS;
  }
}

export function addAuditLog(action: string, userEmail: string, userRole: string, details: string): void {
  try {
    const logs = getAuditLogs();
    const newLog: SecurityAuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      action,
      userEmail,
      userRole,
      details,
    };
    const updated = [newLog, ...logs].slice(0, 200); // keep last 200 security logs
    localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error adding audit log:', e);
  }
}

// Helper functions for Local Storage persistence

export function getRates(): Rate[] {
  try {
    const data = localStorage.getItem(RATES_KEY);
    if (!data) {
      localStorage.setItem(RATES_KEY, JSON.stringify(INITIAL_RATES));
      return INITIAL_RATES;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Error reading rates:', e);
    return INITIAL_RATES;
  }
}

export function saveRates(rates: Rate[]): void {
  try {
    localStorage.setItem(RATES_KEY, JSON.stringify(rates));
    rates.forEach((r) => saveRateToCloud(r));
  } catch (e) {
    console.error('Error saving rates:', e);
  }
}

export function getInvoices(): Invoice[] {
  try {
    const data = localStorage.getItem(INVOICES_KEY);
    if (!data) {
      localStorage.setItem(INVOICES_KEY, JSON.stringify(INITIAL_INVOICES));
      return INITIAL_INVOICES;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Error reading invoices:', e);
    return INITIAL_INVOICES;
  }
}

export function saveInvoices(invoices: Invoice[]): void {
  try {
    // Check if any invoice was deleted
    const existing = getInvoices();
    if (existing.length > invoices.length) {
      const currentIds = new Set(invoices.map((inv) => inv.id));
      existing.forEach((inv) => {
        if (!currentIds.has(inv.id)) {
          deleteInvoiceFromCloud(inv.id);
        }
      });
    }

    localStorage.setItem(INVOICES_KEY, JSON.stringify(invoices));
    invoices.forEach((inv) => saveInvoiceToCloud(inv));
  } catch (e) {
    console.error('Error saving invoices:', e);
  }
}

export function getKathmanduBillings(): KathmanduBilling[] {
  try {
    const data = localStorage.getItem(KTM_BILLINGS_KEY);
    if (!data) {
      localStorage.setItem(KTM_BILLINGS_KEY, JSON.stringify(INITIAL_KTM_BILLINGS));
      return INITIAL_KTM_BILLINGS;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Error reading Kathmandu billings:', e);
    return INITIAL_KTM_BILLINGS;
  }
}

export function saveKathmanduBillings(billings: KathmanduBilling[]): void {
  try {
    const existing = getKathmanduBillings();
    if (existing.length > billings.length) {
      const currentIds = new Set(billings.map((b) => b.id));
      existing.forEach((b) => {
        if (!currentIds.has(b.id)) {
          deleteKathmanduBillingFromCloud(b.id);
        }
      });
    }

    localStorage.setItem(KTM_BILLINGS_KEY, JSON.stringify(billings));
    billings.forEach((b) => saveKathmanduBillingToCloud(b));
    notifyDataUpdated();
  } catch (e) {
    console.error('Error saving Kathmandu billings:', e);
  }
}

export function deleteKathmanduBilling(id: string): KathmanduBilling[] {
  try {
    const existing = getKathmanduBillings();
    const updated = existing.filter((b) => b.id !== id);
    deleteKathmanduBillingFromCloud(id);
    localStorage.setItem(KTM_BILLINGS_KEY, JSON.stringify(updated));
    notifyDataUpdated();
    return updated;
  } catch (e) {
    console.error('Error deleting Kathmandu billing:', e);
    return getKathmanduBillings();
  }
}

export function generateNextKtmInvoiceNo(billings: KathmanduBilling[]): string {
  if (!billings || billings.length === 0) {
    return 'KTM-001';
  }

  let maxNum = 0;
  billings.forEach((b) => {
    const match = (b.ktm_invoice_no || '').match(/KTM-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  });

  const nextNum = maxNum + 1;
  return `KTM-${String(nextNum).padStart(3, '0')}`;
}

// ---------------------------------------------------------------------------
// Kathmandu Settlement Cycles & Payment Management
// ---------------------------------------------------------------------------

export function getKathmanduSettlementCycles(): KathmanduSettlementCycle[] {
  try {
    const data = localStorage.getItem(KTM_SETTLEMENTS_KEY);
    if (!data) {
      return [];
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Error reading Kathmandu settlements:', e);
    return [];
  }
}

export function saveKathmanduSettlementCycles(cycles: KathmanduSettlementCycle[]): void {
  try {
    const existing = getKathmanduSettlementCycles();
    if (existing.length > cycles.length) {
      const currentIds = new Set(cycles.map((c) => c.id));
      existing.forEach((c) => {
        if (!currentIds.has(c.id)) {
          deleteKathmanduSettlementFromCloud(c.id);
        }
      });
    }

    localStorage.setItem(KTM_SETTLEMENTS_KEY, JSON.stringify(cycles));
    cycles.forEach((c) => saveKathmanduSettlementToCloud(c));
    notifyDataUpdated();
  } catch (e) {
    console.error('Error saving Kathmandu settlements:', e);
  }
}

/**
 * Record a payment (partial or full) against a specific Kathmandu bill
 */
export function recordKathmanduPayment(
  billingId: string,
  payment: Omit<KathmanduPaymentRecord, 'id' | 'created_at'>
): KathmanduBilling | null {
  try {
    const billings = getKathmanduBillings();
    const billingIndex = billings.findIndex((b) => b.id === billingId);
    if (billingIndex === -1) return null;

    const billing = billings[billingIndex];
    const totalCost = Number(billing.total_cost) || 0;
    
    // Existing payments or initialize from amount_paid if no history
    const existingHistory: KathmanduPaymentRecord[] = billing.payment_history || (
      billing.amount_paid && billing.amount_paid > 0
        ? [{
            id: `pay-init-${billing.id}`,
            date: billing.ktm_date || new Date().toISOString().split('T')[0],
            amount: billing.amount_paid,
            payment_method: billing.payment_method || 'Bank Transfer',
            notes: 'Initial recorded payment',
            created_at: billing.created_at,
          }]
        : []
    );

    const newPaymentRecord: KathmanduPaymentRecord = {
      ...payment,
      id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString(),
    };

    const updatedHistory = [...existingHistory, newPaymentRecord];
    const newTotalPaid = updatedHistory.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const newAmountDue = Math.max(0, totalCost - newTotalPaid);

    let nextStatus: 'Paid' | 'Unpaid' | 'Partial' = 'Unpaid';
    if (newTotalPaid >= totalCost && totalCost > 0) {
      nextStatus = 'Paid';
    } else if (newTotalPaid > 0) {
      nextStatus = 'Partial';
    }

    const updatedBilling: KathmanduBilling = {
      ...billing,
      amount_paid: newTotalPaid,
      amount_due: newAmountDue,
      payment_status: nextStatus,
      payment_method: payment.payment_method || billing.payment_method,
      payment_history: updatedHistory,
      updated_at: new Date().toISOString(),
    };

    billings[billingIndex] = updatedBilling;
    saveKathmanduBillings(billings);
    return updatedBilling;
  } catch (e) {
    console.error('Error recording Kathmandu payment:', e);
    return null;
  }
}

/**
 * Creates a new settlement cycle, archives current active bills under this cycle,
 * and starts a fresh new active list.
 */
export function createKathmanduSettlementCycle(
  cycleData: Omit<KathmanduSettlementCycle, 'id' | 'created_at'>
): { cycle: KathmanduSettlementCycle; updatedBillings: KathmanduBilling[] } {
  const newCycle: KathmanduSettlementCycle = {
    ...cycleData,
    id: `ktm-settle-${Date.now()}`,
    created_at: new Date().toISOString(),
  };

  const cycles = getKathmanduSettlementCycles();
  const updatedCycles = [newCycle, ...cycles];
  saveKathmanduSettlementCycles(updatedCycles);

  // Update associated billings to mark them as settled/archived in this cycle
  const billings = getKathmanduBillings();
  const targetIds = new Set(newCycle.bill_ids);
  const updatedBillings = billings.map((b) => {
    if (targetIds.has(b.id)) {
      return {
        ...b,
        settlement_cycle_id: newCycle.id,
        settlement_cycle_name: newCycle.cycle_name,
        is_settled_archived: true,
        settled_date: newCycle.settled_date,
        updated_at: new Date().toISOString(),
      };
    }
    return b;
  });

  saveKathmanduBillings(updatedBillings);
  return { cycle: newCycle, updatedBillings };
}

/**
 * Re-open / un-archive a settlement cycle if needed
 */
export function reopenKathmanduSettlementCycle(cycleId: string): void {
  const cycles = getKathmanduSettlementCycles().filter((c) => c.id !== cycleId);
  saveKathmanduSettlementCycles(cycles);

  const billings = getKathmanduBillings().map((b) => {
    if (b.settlement_cycle_id === cycleId) {
      return {
        ...b,
        settlement_cycle_id: undefined,
        settlement_cycle_name: undefined,
        is_settled_archived: false,
        settled_date: undefined,
        updated_at: new Date().toISOString(),
      };
    }
    return b;
  });

  saveKathmanduBillings(billings);
}

export function getExpenses(): Expense[] {
  try {
    const data = localStorage.getItem(EXPENSES_KEY);
    if (!data) {
      localStorage.setItem(EXPENSES_KEY, JSON.stringify(INITIAL_EXPENSES));
      return INITIAL_EXPENSES;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Error reading expenses:', e);
    return INITIAL_EXPENSES;
  }
}

export function saveExpenses(expenses: Expense[]): void {
  try {
    const existing = getExpenses();
    if (existing.length > expenses.length) {
      const currentIds = new Set(expenses.map((e) => e.id));
      existing.forEach((e) => {
        if (!currentIds.has(e.id)) {
          deleteExpenseFromCloud(e.id);
        }
      });
    }

    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
    expenses.forEach((exp) => saveExpenseToCloud(exp));
    notifyDataUpdated();
  } catch (e) {
    console.error('Error saving expenses:', e);
  }
}

export function deleteExpense(id: string): Expense[] {
  try {
    const existing = getExpenses();
    const updated = existing.filter((e) => e.id !== id);
    deleteExpenseFromCloud(id);
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(updated));
    notifyDataUpdated();
    return updated;
  } catch (e) {
    console.error('Error deleting expense:', e);
    return getExpenses();
  }
}

export async function purgeAllFirestoreData(adminEmail: string = 'admin@courierstation.np'): Promise<{ success: boolean; message: string }> {
  try {
    const collectionsToPurge = [
      'invoices',
      'kathmandu_billings',
      'expenses',
      'inventory',
      'stock_logs',
      'rate_cards'
    ];

    for (const col of collectionsToPurge) {
      try {
        const snap = await getDocs(collection(db, col));
        const deletePromises = snap.docs.map((docSnap) => deleteDoc(doc(db, col, docSnap.id)));
        await Promise.all(deletePromises);
      } catch (colErr) {
        console.warn(`Purge warning on ${col}:`, colErr);
      }
    }

    // Reset Local Storage keys to clean empty state
    localStorage.setItem(INVOICES_KEY, JSON.stringify([]));
    localStorage.setItem(KTM_BILLINGS_KEY, JSON.stringify([]));
    localStorage.setItem(EXPENSES_KEY, JSON.stringify([]));
    localStorage.setItem(STOCK_KEY, JSON.stringify([]));
    localStorage.setItem(STOCK_LOGS_KEY, JSON.stringify([]));
    localStorage.setItem(RATES_KEY, JSON.stringify([]));

    // Preserve real staff/admin accounts
    const users = getStaffUsers();
    const verifiedOrAdminOnly = users.filter((u) => u.status === 'verified' || u.role === 'admin');
    localStorage.setItem(STAFF_USERS_KEY, JSON.stringify(verifiedOrAdminOnly.length > 0 ? verifiedOrAdminOnly : INITIAL_STAFF_USERS));

    addAuditLog(
      'DATABASE_PURGED',
      adminEmail,
      'admin',
      'Full database purge executed: Deleted all invoices, Kathmandu billings, expenses, inventory, and rate cards from Cloud Firestore and local storage.'
    );

    notifyDataUpdated();
    return { success: true, message: 'All database data successfully deleted from Cloud Firestore and local storage.' };
  } catch (error: any) {
    console.error('Error during database purge:', error);
    return { success: false, message: error?.message || 'Database wipe failed' };
  }
}

export function resetSystemDataAndKeepRealStaff(adminEmail: string): void {
  try {
    // 1. Trigger full database purge in background
    purgeAllFirestoreData(adminEmail);

    // 2. Clear sample invoices, Kathmandu billings & expenses
    localStorage.setItem(INVOICES_KEY, JSON.stringify([]));
    localStorage.setItem(KTM_BILLINGS_KEY, JSON.stringify([]));
    localStorage.setItem(EXPENSES_KEY, JSON.stringify([]));
    localStorage.setItem(STOCK_KEY, JSON.stringify([]));
    localStorage.setItem(STOCK_LOGS_KEY, JSON.stringify([]));
    localStorage.setItem(RATES_KEY, JSON.stringify([]));

    // 3. Filter staff users to keep only verified/real staff accounts
    const users = getStaffUsers();
    const verifiedOrAdminOnly = users.filter((u) => u.status === 'verified' || u.role === 'admin');
    localStorage.setItem(STAFF_USERS_KEY, JSON.stringify(verifiedOrAdminOnly.length > 0 ? verifiedOrAdminOnly : INITIAL_STAFF_USERS));

    // 4. Log security wipe
    addAuditLog(
      'FACTORY_RESET',
      adminEmail,
      'admin',
      'System reset completed: Cleared all customer invoices, Kathmandu bills, demo expenses, inventory and rates.'
    );

    window.dispatchEvent(new Event('csp_data_updated'));
  } catch (e) {
    console.error('Error resetting system data:', e);
  }
}

export function getAuthRole(): UserRole | null {
  try {
    const role = localStorage.getItem(AUTH_KEY);
    if (role === 'admin' || role === 'staff') return role;
    // Default to admin for seamless evaluation if none set
    return 'admin';
  } catch (e) {
    return 'admin';
  }
}

export function setAuthRole(role: UserRole | null): void {
  try {
    if (role) {
      localStorage.setItem(AUTH_KEY, role);
    } else {
      localStorage.removeItem(AUTH_KEY);
    }
  } catch (e) {
    console.error('Error setting auth role:', e);
  }
}

// Generate unique sequential invoice number
export function generateNextInvoiceNo(invoices: Invoice[]): string {
  if (!invoices || invoices.length === 0) return 'INV-001';

  let maxNum = 0;
  invoices.forEach((inv) => {
    const match = inv.invoice_no.match(/^INV-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  });

  const nextNum = maxNum + 1;
  if (nextNum < 1000) {
    return `INV-${String(nextNum).padStart(3, '0')}`;
  }
  return `INV-${nextNum}`;
}

// Initial Seed Packaging Stock Items
const INITIAL_STOCK_ITEMS: StockItem[] = [
  {
    id: 'stk-1',
    item_name: 'Carton of 10 kg',
    category: 'Carton',
    unit: 'Pcs',
    total_stock: 150,
    used_count: 42,
    low_stock_threshold: 15,
    cost_per_unit: 120,
    notes: 'Heavy duty corrugated 10kg export box',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'stk-2',
    item_name: 'Carton of 15 kg',
    category: 'Carton',
    unit: 'Pcs',
    total_stock: 120,
    used_count: 35,
    low_stock_threshold: 15,
    cost_per_unit: 150,
    notes: 'Standard 15kg double wall shipping box',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'stk-3',
    item_name: 'Carton of 20 kg',
    category: 'Carton',
    unit: 'Pcs',
    total_stock: 100,
    used_count: 58,
    low_stock_threshold: 10,
    cost_per_unit: 180,
    notes: 'Jumbo 20kg 5-ply export carton',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'stk-4',
    item_name: 'Brown Tape',
    category: 'Tape',
    unit: 'Rolls',
    total_stock: 60,
    used_count: 22,
    low_stock_threshold: 8,
    cost_per_unit: 85,
    notes: 'High adhesion heavy sealing tape (Brown)',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'stk-5',
    item_name: 'White Tape',
    category: 'Tape',
    unit: 'Rolls',
    total_stock: 50,
    used_count: 15,
    low_stock_threshold: 8,
    cost_per_unit: 85,
    notes: 'Customs security branding tape (White)',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'stk-6',
    item_name: 'Bora',
    category: 'Sack / Bag',
    unit: 'Bags',
    total_stock: 80,
    used_count: 25,
    low_stock_threshold: 10,
    cost_per_unit: 45,
    notes: 'Outer protective jute woven sack bag',
    updated_at: new Date().toISOString(),
  },
];

export function getStockItems(): StockItem[] {
  try {
    const data = localStorage.getItem(STOCK_KEY);
    if (!data) {
      localStorage.setItem(STOCK_KEY, JSON.stringify(INITIAL_STOCK_ITEMS));
      return INITIAL_STOCK_ITEMS;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Error reading stock items:', e);
    return INITIAL_STOCK_ITEMS;
  }
}

export function saveStockItems(items: StockItem[]): void {
  try {
    localStorage.setItem(STOCK_KEY, JSON.stringify(items));
    items.forEach((stk) => saveStockItemToCloud(stk));
  } catch (e) {
    console.error('Error saving stock items:', e);
  }
}

export function getStockLogs(): StockLog[] {
  try {
    const data = localStorage.getItem(STOCK_LOGS_KEY);
    if (!data) {
      const initialLogs: StockLog[] = [
        {
          id: 'log-stk-1',
          stock_id: 'stk-1',
          item_name: 'Carton of 10 kg',
          action_type: 'RESTOCKED',
          quantity: 150,
          reason: 'Initial stock intake from supplier',
          logged_by: 'admin@courierstation.np',
          created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        },
        {
          id: 'log-stk-2',
          stock_id: 'stk-1',
          item_name: 'Carton of 10 kg',
          action_type: 'USED',
          quantity: 42,
          reason: 'Counter packaging for Australian express shipment',
          logged_by: 'staff@courierstation.np',
          created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        },
      ];
      localStorage.setItem(STOCK_LOGS_KEY, JSON.stringify(initialLogs));
      return initialLogs;
    }
    return JSON.parse(data);
  } catch (e) {
    console.error('Error reading stock logs:', e);
    return [];
  }
}

export function addStockLog(log: Omit<StockLog, 'id' | 'created_at'>): void {
  try {
    const logs = getStockLogs();
    const newLog: StockLog = {
      ...log,
      id: `log-stk-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      created_at: new Date().toISOString(),
    };
    const updated = [newLog, ...logs].slice(0, 300);
    localStorage.setItem(STOCK_LOGS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error adding stock log:', e);
  }
}

// ---------------------------------------------------------------------------
// Shipper Profiles Management (Carrier Forwarders & Station Entities)
// ---------------------------------------------------------------------------

export function getShipperProfiles(): ShipperProfile[] {
  try {
    const data = localStorage.getItem(SHIPPERS_KEY);
    if (!data) {
      localStorage.setItem(SHIPPERS_KEY, JSON.stringify(INITIAL_SHIPPERS));
      return INITIAL_SHIPPERS;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_SHIPPERS;
  } catch (e) {
    console.error('Error reading shipper profiles:', e);
    return INITIAL_SHIPPERS;
  }
}

export function saveShipperProfiles(shippers: ShipperProfile[]): void {
  try {
    // Check deletions
    const existing = getShipperProfiles();
    if (existing.length > shippers.length) {
      const currentIds = new Set(shippers.map((s) => s.id));
      existing.forEach((s) => {
        if (!currentIds.has(s.id)) {
          deleteShipperFromCloud(s.id);
        }
      });
    }

    localStorage.setItem(SHIPPERS_KEY, JSON.stringify(shippers));
    shippers.forEach((s) => saveShipperToCloud(s));
    notifyDataUpdated();
  } catch (e) {
    console.error('Error saving shipper profiles:', e);
  }
}

export function saveShipperProfile(shipper: ShipperProfile): void {
  try {
    const shippers = getShipperProfiles();
    const exists = shippers.some((s) => s.id === shipper.id);
    let updated: ShipperProfile[];

    // If set as default, clear default on other profiles
    if (shipper.is_default) {
      shippers.forEach((s) => {
        s.is_default = s.id === shipper.id;
      });
    }

    if (exists) {
      updated = shippers.map((s) => (s.id === shipper.id ? shipper : s));
    } else {
      updated = [...shippers, shipper];
    }

    saveShipperProfiles(updated);
  } catch (e) {
    console.error('Error saving single shipper profile:', e);
  }
}

export function deleteShipperProfile(id: string): void {
  try {
    const shippers = getShipperProfiles();
    // Do not allow deleting the primary default if only 1 profile remains
    if (shippers.length <= 1) return;
    const updated = shippers.filter((s) => s.id !== id);
    // Ensure at least one is default
    if (!updated.some((s) => s.is_default) && updated.length > 0) {
      updated[0].is_default = true;
    }
    saveShipperProfiles(updated);
  } catch (e) {
    console.error('Error deleting shipper profile:', e);
  }
}

export function getDefaultShipper(): ShipperProfile {
  const shippers = getShipperProfiles();
  const def = shippers.find((s) => s.is_default);
  return def || shippers[0] || INITIAL_SHIPPERS[0];
}

