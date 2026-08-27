import React from 'react';
import { KathmanduBilling } from '../types';
import { formatCurrency } from '../lib/rateCalculator';
import { Plane, Truck, Package, Building2 } from 'lucide-react';

interface PrintKathmanduShippingManifestProps {
  billings: KathmanduBilling[];
  title?: string;
  cycleName?: string;
}

export const PrintKathmanduShippingManifest = React.forwardRef<
  HTMLDivElement,
  PrintKathmanduShippingManifestProps
>(({ billings, title = 'KATHMANDU CARGO DISPATCH & SHIPPING MANIFEST', cycleName }, ref) => {
  const totalGrossWeight = billings.reduce((sum, b) => sum + (Number(b.weight) || 0), 0);
  const totalNetWeight = billings.reduce((sum, b) => sum + (Number(b.net_weight || b.weight) || 0), 0);
  const totalBoxes = billings.reduce((sum, b) => sum + (Number(b.box_count) || 1), 0);
  const totalCost = billings.reduce((sum, b) => sum + (Number(b.total_cost) || 0), 0);
  const totalPaid = billings.reduce((sum, b) => sum + (Number(b.amount_paid) || 0), 0);
  const totalDue = billings.reduce((sum, b) => sum + (Number(b.amount_due) || 0), 0);

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
              International Cargo, Express Courier & Airport Forwarding Logistics
            </p>
            <p className="text-[11px] text-slate-500">
              B & D Bhawan, New Road, Pokhara, Nepal • Tel: +977 61-578900 / 9856012345
            </p>
          </div>
          <div className="text-right">
            <div className="inline-block bg-slate-900 text-white font-mono font-bold text-xs px-3 py-1 rounded">
              CARGO DISPATCH MANIFEST
            </div>
            <p className="text-[11px] text-slate-600 mt-1">
              Date: <span className="font-semibold">{new Date().toLocaleDateString('en-GB')}</span>
            </p>
            {cycleName && (
              <p className="text-[11px] font-bold text-blue-800">
                Batch: {cycleName}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Manifest Overview Bar */}
      <div className="grid grid-cols-4 gap-2 mb-4 bg-slate-50 p-3 rounded border border-slate-300 text-[11px]">
        <div>
          <span className="text-slate-500 block">Total Consignments:</span>
          <span className="font-bold text-slate-900 text-sm">{billings.length} Shipments</span>
        </div>
        <div>
          <span className="text-slate-500 block">Total Cargo Gross Weight:</span>
          <span className="font-bold text-slate-900 text-sm">{totalGrossWeight.toFixed(1)} kg</span>
        </div>
        <div>
          <span className="text-slate-500 block">Total Boxes / Parcels:</span>
          <span className="font-bold text-slate-900 text-sm">{totalBoxes} Pcs</span>
        </div>
        <div>
          <span className="text-slate-500 block">Dispatch Route:</span>
          <span className="font-bold text-slate-900 text-sm">Pokhara ➔ TIA Kathmandu</span>
        </div>
      </div>

      {/* Manifest Table */}
      <table className="w-full border-collapse text-[10.5px] mb-6">
        <thead>
          <tr className="bg-slate-800 text-white font-bold uppercase text-[9px]">
            <th className="border border-slate-700 py-1.5 px-2 text-center w-7">#</th>
            <th className="border border-slate-700 py-1.5 px-2 text-left">KTM Bill #</th>
            <th className="border border-slate-700 py-1.5 px-2 text-center">AWB / Tracking</th>
            <th className="border border-slate-700 py-1.5 px-2 text-left">Sender (Pokhara) Details</th>
            <th className="border border-slate-700 py-1.5 px-2 text-left">Receiver / Consignee & Full Address</th>
            <th className="border border-slate-700 py-1.5 px-2 text-center">Weight & Boxes</th>
            <th className="border border-slate-700 py-1.5 px-2 text-left">Manifest Items & Surcharges</th>
            <th className="border border-slate-700 py-1.5 px-2 text-left">Vehicle / Transporter</th>
            <th className="border border-slate-700 py-1.5 px-2 text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          {billings.map((b, idx) => {
            const specialItems = (b.items || []).filter((it) => it.item_type !== 'Normal');
            const itemsSummary = (b.items || []).map((it) => `${it.quantity || 1}x ${it.item_name}`).join(', ');

            return (
              <tr key={b.id || idx} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                <td className="border border-slate-300 py-1.5 px-2 text-center font-bold text-slate-600">
                  {idx + 1}
                </td>
                <td className="border border-slate-300 py-1.5 px-2 font-mono font-bold text-blue-800">
                  {b.ktm_invoice_no}
                  {b.customer_invoice_no && (
                    <span className="block text-[9px] text-slate-500 font-normal">
                      Ref: {b.customer_invoice_no}
                    </span>
                  )}
                </td>
                <td className="border border-slate-300 py-1.5 px-2 text-center font-mono font-bold text-slate-800">
                  {b.awb_no || '-'}
                </td>
                <td className="border border-slate-300 py-1.5 px-2">
                  <div className="font-semibold text-slate-900">{b.sender_name}</div>
                  {b.sender_phone && (
                    <div className="text-[9px] text-slate-600">Tel: {b.sender_phone}</div>
                  )}
                  {b.sender_address && (
                    <div className="text-[9px] text-slate-500">{b.sender_address}</div>
                  )}
                </td>
                <td className="border border-slate-300 py-1.5 px-2">
                  <div className="font-semibold text-slate-900">{b.receiver_name}</div>
                  {b.receiver_phone && (
                    <div className="text-[9px] text-slate-600">Tel: {b.receiver_phone}</div>
                  )}
                  {b.receiver_address && (
                    <div className="text-[9px] text-slate-500 line-clamp-2">{b.receiver_address}</div>
                  )}
                  <div className="text-[9.5px] font-bold text-blue-900 mt-0.5">
                    {b.country} ({b.transport_type || 'AIR'})
                  </div>
                </td>
                <td className="border border-slate-300 py-1.5 px-2 text-center">
                  <div className="font-bold text-slate-900">{b.weight} kg</div>
                  <div className="text-[9px] text-slate-500">{b.box_count || 1} Box</div>
                </td>
                <td className="border border-slate-300 py-1.5 px-2">
                  <div className="line-clamp-1 max-w-[180px] text-slate-800" title={itemsSummary}>
                    {itemsSummary || 'General Goods'}
                  </div>
                  {specialItems.length > 0 && (
                    <div className="text-[9px] font-bold text-amber-700 mt-0.5">
                      ⚠️ {specialItems.map((s) => `${s.item_type} (${s.quantity || 1}x)`).join(', ')}
                    </div>
                  )}
                </td>
                <td className="border border-slate-300 py-1.5 px-2 text-[9.5px]">
                  <div className="font-medium text-slate-800">{b.vehicle_no || 'Pokhara-KTM Transport'}</div>
                  {b.driver_phone && <div className="text-[9px] text-slate-500">Tel: {b.driver_phone}</div>}
                </td>
                <td className="border border-slate-300 py-1.5 px-2 text-center font-bold text-[9px]">
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-800">
                    {b.shipping_status || 'In Transit'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-slate-100 font-bold border-t-2 border-slate-800">
            <td colSpan={5} className="border border-slate-300 py-2 px-2 text-right uppercase text-[10px]">
              Total Manifest Weight & Parcels:
            </td>
            <td className="border border-slate-300 py-2 px-2 text-center text-slate-900 font-black text-xs">
              {totalGrossWeight.toFixed(1)} kg / {totalBoxes} Pcs
            </td>
            <td colSpan={3} className="border border-slate-300 py-2 px-2 text-slate-600 text-[10px]">
              {billings.length} Consignments Dispatched to TIA Kathmandu
            </td>
          </tr>
        </tfoot>
      </table>

      {/* Vehicle & Transporter Notes */}
      <div className="grid grid-cols-2 gap-4 mb-8 bg-slate-50 p-3 rounded border border-slate-200 text-[10.5px]">
        <div>
          <h4 className="font-bold text-slate-800 uppercase mb-1">Carrier / Transporter Details:</h4>
          <p className="text-slate-600">
            Forwarder / Hub: <span className="font-semibold text-slate-900">{billings[0]?.forwarder_name || 'Kathmandu Air Cargo Terminal'}</span>
          </p>
          <p className="text-slate-600">
            Vehicle / Flight Ref: <span className="font-semibold text-slate-900">{billings[0]?.vehicle_no || 'Pokhara-KTM Cargo Transit'}</span>
          </p>
          <p className="text-slate-600">
            Transporter Contact: <span className="font-semibold text-slate-900">{billings[0]?.driver_phone || '+977 9856000000'}</span>
          </p>
        </div>
        <div>
          <h4 className="font-bold text-slate-800 uppercase mb-1">Airport Customs Instructions:</h4>
          <p className="text-slate-600">
            • All dry meat / food sukuti consignments accompanied by quarantine clearance declarations.
          </p>
          <p className="text-slate-600">
            • Please inspect box seals and sign handover verification at Kathmandu Air Cargo terminal.
          </p>
        </div>
      </div>

      {/* Signature Section */}
      <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-300 text-center text-[10px] text-slate-700">
        <div>
          <div className="h-12 border-b border-dashed border-slate-400 mb-1"></div>
          <p className="font-bold">Prepared By (Pokhara Hub)</p>
          <p className="text-slate-400">The Courier Station Pokhara</p>
        </div>
        <div>
          <div className="h-12 border-b border-dashed border-slate-400 mb-1"></div>
          <p className="font-bold">Transporter / Driver Handover</p>
          <p className="text-slate-400">Vehicle Carrier Signature</p>
        </div>
        <div>
          <div className="h-12 border-b border-dashed border-slate-400 mb-1"></div>
          <p className="font-bold">Received at Kathmandu Hub</p>
          <p className="text-slate-400">TIA Air Cargo Terminal Seal</p>
        </div>
      </div>
    </div>
  );
});

PrintKathmanduShippingManifest.displayName = 'PrintKathmanduShippingManifest';
