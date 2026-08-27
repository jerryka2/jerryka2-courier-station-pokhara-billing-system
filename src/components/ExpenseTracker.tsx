import React, { useState } from 'react';
import { Expense, UserRole } from '../types';
import { formatCurrency } from '../lib/rateCalculator';
import {
  Wallet,
  PlusCircle,
  Trash2,
  Calendar,
  Receipt,
  AlertCircle,
  DollarSign,
  Search,
  CheckCircle2,
  TrendingDown,
} from 'lucide-react';

interface ExpenseTrackerProps {
  expenses: Expense[];
  role: UserRole | null;
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
}

export const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({
  expenses,
  role,
  onAddExpense,
  onDeleteExpense,
}) => {
  const [expenseName, setExpenseName] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Total Expenses
  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const filteredExpenses = expenses.filter((e) =>
    (e.expense_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.expense_date || '').includes(searchTerm)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!expenseName.trim()) {
      setError('Expense description/name is required.');
      return;
    }

    const numericAmt = parseFloat(amount);
    if (isNaN(numericAmt) || numericAmt <= 0) {
      setError('Amount must be greater than 0.');
      return;
    }

    const newExp: Expense = {
      id: `exp-${Date.now()}`,
      expense_name: expenseName.trim(),
      amount: Math.round(numericAmt),
      expense_date: expenseDate,
      created_at: new Date().toISOString(),
    };

    onAddExpense(newExp);

    setSuccessMessage(`✓ Added expense: "${newExp.expense_name}" (${formatCurrency(newExp.amount)})`);
    setTimeout(() => setSuccessMessage(null), 3000);

    setExpenseName('');
    setAmount('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
  };

  const confirmDelete = (id: string) => {
    onDeleteExpense(id);
    setDeletingId(null);
    setSuccessMessage('✓ Expense entry deleted. Total expenses and overall profit updated immediately.');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Running Total Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Wallet className="w-5 h-5 text-rose-600" />
            <span>Station Expenses & Operational Cost Tracker</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Record Pokhara hub expenses (packaging cartons, tape, utilities, staff snacks, office rent)
          </p>
        </div>

        {/* Running Total Box */}
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl text-right sm:self-center">
          <span className="text-[10px] font-bold text-rose-700 uppercase block tracking-wider">
            Total Operational Expenses
          </span>
          <span className="text-2xl font-extrabold text-rose-900 font-mono">
            {formatCurrency(totalExpenses)}
          </span>
          <p className="text-[10px] text-rose-600 mt-0.5 font-medium">
            Directly subtracted in Profit formula
          </p>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Add Expense Form */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-2">
          <PlusCircle className="w-4 h-4 text-blue-600" />
          <span>Add New Expense Entry</span>
        </h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* Expense Name */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Expense Description *
            </label>
            <input
              type="text"
              placeholder="e.g. Cardboard Packaging Boxes & Brown Tape"
              value={expenseName}
              onChange={(e) => setExpenseName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50 focus:bg-white"
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Amount (Rs NPR) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">Rs</span>
              <input
                type="number"
                min="1"
                placeholder="3500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-slate-900 bg-slate-50 focus:bg-white"
                required
              />
            </div>
          </div>

          {/* Date & Submit */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50 focus:bg-white"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition self-end h-[36px] shadow-xs shrink-0 flex items-center justify-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Entry</span>
            </button>
          </div>
        </form>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-blue-600" />
            <span>Expense Records History ({expenses.length})</span>
          </h2>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search expenses..."
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 focus:outline-none w-full sm:w-60"
            />
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            {searchTerm ? 'No matching expense entries found.' : 'No expense records logged yet.'}
          </div>
        ) : (
          <>
            {/* Mobile View */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {filteredExpenses.map((exp) => (
                <div key={exp.id} className="p-3 flex items-center justify-between text-xs gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{exp.expense_name}</p>
                    <p className="text-[10px] text-slate-400">{exp.expense_date}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-extrabold text-rose-700 text-sm">
                      {formatCurrency(exp.amount)}
                    </span>
                    <button
                      onClick={() => setDeletingId(exp.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                      title="Delete Expense Entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop / Tablet View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3 w-12">#</th>
                    <th className="p-3 w-32">Date</th>
                    <th className="p-3">Expense Name & Description</th>
                    <th className="p-3 text-right w-40">Amount</th>
                    <th className="p-3 text-center w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredExpenses.map((exp, idx) => (
                    <tr key={exp.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3 font-semibold text-slate-400">{idx + 1}</td>
                      <td className="p-3 text-slate-600 font-medium whitespace-nowrap">{exp.expense_date}</td>
                      <td className="p-3 font-semibold text-slate-900">{exp.expense_name}</td>
                      <td className="p-3 text-right font-black text-rose-700 text-sm whitespace-nowrap">
                        {formatCurrency(exp.amount)}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => setDeletingId(exp.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition inline-flex items-center justify-center"
                          title="Delete Expense Entry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-xl border border-slate-200 space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Delete Expense</h4>
                <p className="text-xs text-slate-500">
                  Are you sure you want to delete this expense record?
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200">
              Deleting this record will immediately update total expenses and recalculate overall profit.
            </p>

            <div className="flex justify-end items-center gap-2 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDelete(deletingId)}
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

