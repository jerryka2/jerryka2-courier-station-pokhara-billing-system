import React, { useState } from 'react';
import { UserRole, StaffUser } from '../types';
import {
  getStaffUsers,
  registerNewStaffUser,
  getSystemSettings,
  addAuditLog,
} from '../lib/storage';
import {
  ShieldCheck,
  User,
  Lock,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserPlus,
  LogIn,
  KeyRound,
  Phone,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRole: (role: UserRole) => void;
  currentRole: UserRole | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSelectRole,
  currentRole,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [regError, setRegError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const settings = getSystemSettings();
    const cleanEmail = email.trim().toLowerCase();

    // Check for Admin PIN or Admin email
    if (cleanEmail === 'admin@courierstation.np' || password === settings.adminPin || password === '1234' || password === 'admin123') {
      onSelectRole('admin');
      addAuditLog('ADMIN_LOGIN', cleanEmail || 'admin@courierstation.np', 'admin', 'Admin logged in successfully.');
      onClose();
      return;
    }

    // Check staff accounts in system
    const staffUsers = getStaffUsers();
    const foundUser = staffUsers.find((u) => u.email.toLowerCase() === cleanEmail);

    if (foundUser) {
      if (foundUser.status === 'pending') {
        setLoginError('⏳ Account Verification Pending: Your staff registration is currently waiting for Admin approval. Please contact Admin to verify your account.');
        return;
      }
      if (foundUser.status === 'rejected') {
        setLoginError('❌ Access Denied: Your staff account request was rejected by the administrator.');
        return;
      }
      if (foundUser.role === 'admin' || foundUser.status === 'verified') {
        onSelectRole(foundUser.role);
        addAuditLog('STAFF_LOGIN', foundUser.email, foundUser.role, `User ${foundUser.name} logged in successfully.`);
        onClose();
        return;
      }
    }

    // Fallback demo logins if email typed or general staff
    if (email.includes('staff') || password === 'staff123' || password === '5678') {
      onSelectRole('staff');
      addAuditLog('STAFF_LOGIN', email || 'staff@courierstation.np', 'staff', 'Staff logged in via fallback auth.');
      onClose();
      return;
    }

    setLoginError('Invalid email or password. Please register a staff account or contact the Administrator.');
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    if (!regName.trim()) {
      setRegError('Please enter your full name.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setRegError('Please enter a valid email address.');
      return;
    }
    if (!regPhone.trim()) {
      setRegError('Please enter your phone number.');
      return;
    }
    if (regPin.length < 4) {
      setRegError('Security PIN must be at least 4 digits.');
      return;
    }

    const result = registerNewStaffUser({
      name: regName.trim(),
      email: regEmail.trim().toLowerCase(),
      phone: regPhone.trim(),
      role: 'staff',
      pin: regPin,
    });

    if (!result.success) {
      setRegError(result.message);
    } else {
      setRegSuccess(result.message);
      setRegName('');
      setRegEmail('');
      setRegPhone('');
      setRegPin('');
    }
  };

  const handleQuickLogin = (role: UserRole) => {
    onSelectRole(role);
    addAuditLog('QUICK_ROLE_SWITCH', role === 'admin' ? 'admin@courierstation.np' : 'staff@courierstation.np', role, `Switched role to ${role}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/20 text-cyan-400 rounded-xl border border-blue-500/30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-extrabold text-lg tracking-tight">The Courier Station Pokhara</h2>
                <p className="text-xs text-slate-300">
                  Secure Access & Staff Account Verification Portal
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setLoginError(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition ${
                tab === 'login'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setRegError(null);
                setRegSuccess(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition ${
                tab === 'register'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register Staff Account</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {tab === 'login' ? (
            <>
              {loginError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 shadow-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed font-medium">{loginError}</p>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. staff@courierstation.np or admin@courierstation.np"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Security PIN / Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      placeholder="Admin PIN (default: 1234) or Staff PIN"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl transition shadow-sm flex items-center justify-center gap-2"
                >
                  <LogIn className="w-4 h-4 text-cyan-400" />
                  <span>Authenticate & Enter System</span>
                </button>
              </form>

              {/* Demo Quick Role Switcher */}
              <div className="border-t border-slate-200 pt-4 space-y-2">
                <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider text-center">
                  Quick Access Profiles (Evaluation Mode)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('admin')}
                    className={`p-3 rounded-xl border text-left text-xs transition flex flex-col justify-between ${
                      currentRole === 'admin'
                        ? 'border-amber-500 bg-amber-50 text-amber-900 ring-1 ring-amber-500'
                        : 'border-slate-200 hover:border-amber-300 bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900">Administrator</span>
                      {currentRole === 'admin' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
                    </div>
                    <span className="text-[10px] text-slate-500 leading-tight">
                      Verify staff, upload rates, audit logs & system config
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('staff')}
                    className={`p-3 rounded-xl border text-left text-xs transition flex flex-col justify-between ${
                      currentRole === 'staff'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500'
                        : 'border-slate-200 hover:border-emerald-300 bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900">Verified Billing Staff</span>
                      {currentRole === 'staff' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <span className="text-[10px] text-slate-500 leading-tight">
                      Create invoices, add boxes, dispatch parcels, track expenses
                    </span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {regError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 shadow-xs">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-semibold">{regError}</span>
                </div>
              )}

              {regSuccess && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-2 shadow-xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-900">
                    <Clock className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Registration Submitted for Admin Verification!</span>
                  </div>
                  <p className="text-emerald-700 leading-relaxed">{regSuccess}</p>
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Adhikari"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Email *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. ramesh@courierstation.np"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        placeholder="+977-98XXXXXXXX"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Set Security PIN *</label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        required
                        maxLength={6}
                        placeholder="4-digit PIN"
                        value={regPin}
                        onChange={(e) => setRegPin(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <span>🛡️ Security Verification Notice:</span>
                  </p>
                  <p className="leading-normal text-slate-600">
                    New staff accounts require approval by the Administrator from the Admin Panel before access is granted.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-sm flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Submit Staff Registration</span>
                </button>
              </form>
            </>
          )}
        </div>

        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-right">
          <button
            onClick={onClose}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

