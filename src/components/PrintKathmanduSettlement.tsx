import React from 'react';
import { KathmanduBilling, KathmanduSettlementCycle } from '../types';
import { formatCurrency } from '../lib/rateCalculator';
import { CheckCircle2, DollarSign, Calendar, Building2 } from 'lucide-react';

interface PrintKathmanduSettlementProps {
  cycle: KathmanduSettlementCycle;
  billings: KathmanduBilling[];
}

export const PrintKathmanduSettlement = React.forwardRef<
  HTMLDivElement,
  PrintKathmanduSettlementProps
>(({ cycle, billings }, ref) => {
  const cycleBillings = billings.filter((b) => (cycle.bill_ids || []).includes(b.id));

  return (
    <div ref={ref} className="p-6 bg-white text-slate-900 font-sans text-xs leading-relaxed print:p-2">
      {/* Header */}
      <div className="border-b-2 border-slate-900 pb-4 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
              THE COURIER STATION POKHARA
            </h1>
            <p className="text-xs font-semibold text-slate-700">
              Kathmandu Forwarder Settlement & Payment Clearance Voucher
            </p>
            <p className="text-[11px] text-slate-500">
              B & D Bhawan, New Road, Pokhara, Nepal • Tel: +977 61-578900 / 9856012345
            </p>
          </div>
          <div className="text-right">
            <div className="inline-block bg-emerald-800 text-white font-mono font-bold text-xs px-3 py-1 rounded">
              SETTLEMENT CLEARED
            </div>
            <p className="text-[11px] text-slate-600 mt-1">
              Settlement Date: <span className="font-semibold">{cycle.settled_date || cycle.created_at?.split('T')[0]}</span>
            </p>
            <p className="text-[11px] font-bold text-blue-800">
              Ref: {cycle.id}
            </p>
          </div>
        </div>
      </div>

      {/* Cycle Highlight Card */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 mb-5 space-y-3">
        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase">
              {cycle.cycle_name}
            </h3>
            <p className="text-[11px] text-slate-500">
              Forwarder: <span className="font-semibold text-slate-800">{cycle.forwarder_name || 'Kathmandu Air Cargo'}</span> • Method: <span className="font-semibold text-slate-800">{cycle.payment_method || 'Bank Transfer'}</span>
            </p>
          </div>
          {cycle.reference_no && (
            <div className="text-right font-mono text-[11px] bg-white px-2 py-1 rounded border border-slate-200">
              <span className="text-slate-500">Txn / Bank Ref:</span> <span className="font-bold text-blue-900">{cycle.reference_no}</span>
            </div>
          )}
        </div>

        {/* 4-stat metrics */}
        <div className="grid grid-cols-4 gap-3 text-center">
          <div className="bg-white p-2.5 rounded border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Bills Settled</span>
            <span className="text-lg font-black text-slate-900">{cycle.bill_count}</span>
          </div>
          <div className="bg-white p-2.5 rounded border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Billed Cost</span>
            <span className="text-lg font-black text-rose-700">{formatCurrency(cycle.total_billed)}</span>
          </div>
          <div className="bg-emerald-50 p-2.5 rounded border border-emerald-300">
            <span className="text-[10px] uppercase font-bold text-emerald-800 block">Total Paid in Batch</span>
            <span className="text-lg font-black text-emerald-700">{formatCurrency(cycle.total_paid)}</span>
          </div>
          <div className="bg-amber-50 p-2.5 rounded border border-amber-300">
            <span className="text-[10px] uppercase font-bold text-amber-800 block">Remaining Balance</span>
            <span className="text-lg font-black text-amber-900">{formatCurrency(cycle.remaining_due)}</span>
          </div>
        </div>

        {cycle.notes && (
          <p className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200">
            <span className="font-semibold text-slate-700">Settlement Notes: </span>
            {cycle.notes}
          </p>
        )}
      </div>

      {/* Itemized list of bills settled in this cycle */}
      <div className="mb-6">
        <h4 className="text-xs font-black text-slate-900 uppercase mb-2">
          Settled Kathmandu Billing Consignments ({cycleBillings.length}):
        </h4>
        <table className="w-full border-collapse text-[10.5px]">
          <thead>
            <tr className="bg-slate-800 text-white font-bold uppercase text-[9.5px]">
              <th className="border border-slate-700 py-1 px-2 text-center w-8">#</th>
              <th className="border border-slate-700 py-1 px-2 text-left">KTM Bill #</th>
              <th className="border border-slate-700 py-1 px-2 text-left">Customer / Sender</th>
              <th className="border border-slate-700 py-1 px-2 text-left">Destination</th>
              <th className="border border-slate-700 py-1 px-2 text-center">AWB</th>
              <th className="border border-slate-700 py-1 px-2 text-center">Weight (kg)</th>
              <th className="border border-slate-700 py-1 px-2 text-right">Billed (NPR)</th>
              <th className="border border-slate-700 py-1 px-2 text-right">Paid (NPR)</th>
              <th className="border border-slate-700 py-1 px-2 text-right">Left Due (NPR)</th>
            </tr>
          </thead>
          <tbody>
            {cycleBillings.map((b, idx) => {
              const totalCost = Number(b.total_cost) || 0;
              const paid = b.amount_paid !== undefined ? Number(b.amount_paid) : (b.payment_status === 'Paid' ? totalCost : 0);
              const due = b.amount_due !== undefined ? Number(b.amount_due) : Math.max(0, totalCost - paid);

              return (
                <tr key={b.id || idx} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                  <td className="border border-slate-300 py-1 px-2 text-center font-bold text-slate-600">
                    {idx + 1}
                  </td>
                  <td className="border border-slate-300 py-1 px-2 font-mono font-bold text-blue-900">
                    {b.ktm_invoice_no}
                  </td>
                  <td className="border border-slate-300 py-1 px-2 font-medium text-slate-900">
                    {b.sender_name}
                  </td>
                  <td className="border border-slate-300 py-1 px-2 text-slate-700">
                    {b.country} ({b.transport_type})
                  </td>
                  <td className="border border-slate-300 py-1 px-2 text-center font-mono text-slate-700">
                    {b.awb_no || '-'}
                  </td>
                  <td className="border border-slate-300 py-1 px-2 text-center font-bold">
                    {b.weight}
                  </td>
                  <td className="border border-slate-300 py-1 px-2 text-right font-semibold">
                    {formatCurrency(totalCost)}
                  </td>
                  <td className="border border-slate-300 py-1 px-2 text-right font-bold text-emerald-700">
                    {formatCurrency(paid)}
                  </td>
                  <td className="border border-slate-300 py-1 px-2 text-right font-bold text-amber-900">
                    {formatCurrency(due)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold border-t-2 border-slate-800">
              <td colSpan={6} className="border border-slate-300 py-1.5 px-2 text-right uppercase text-[10px]">
                Settlement Cycle Totals:
              </td>
              <td className="border border-slate-300 py-1.5 px-2 text-right text-rose-700 font-black">
                {formatCurrency(cycle.total_billed)}
              </td>
              <td className="border border-slate-300 py-1.5 px-2 text-right text-emerald-700 font-black">
                {formatCurrency(cycle.total_paid)}
              </td>
              <td className="border border-slate-300 py-1.5 px-2 text-right text-amber-900 font-black">
                {formatCurrency(cycle.remaining_due)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Signature Section */}
      <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-300 text-center text-[10px] text-slate-700">
        <div>
          <div className="h-12 border-b border-dashed border-slate-400 mb-1"></div>
          <p className="font-bold">Authorized Signatory (Pokhara)</p>
          <p className="text-slate-400">The Courier Station Pokhara</p>
        </div>
        <div>
          <div className="h-12 border-b border-dashed border-slate-400 mb-1"></div>
          <p className="font-bold">Kathmandu Forwarder Acknowledgment</p>
          <p className="text-slate-400">Received & Reconciled with Cargo Hub</p>
        </div>
      </div>
    </div>
  );
});

PrintKathmanduSettlement.displayName = 'PrintKathmanduSettlement';
