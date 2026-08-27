import React from 'react';
import { KathmanduBilling } from '../types';
import { formatCurrency } from '../lib/rateCalculator';
import { LOGO_URL, COMPANY_DETAILS } from '../assets/logo';
import { Building2, Plane, Package, Mail, Phone, MapPin, CheckCircle2, Receipt } from 'lucide-react';

interface PrintKathmanduDocumentProps {
  billing: KathmanduBilling;
}

export const PrintKathmanduDocument = React.forwardRef<HTMLDivElement, PrintKathmanduDocumentProps>(
  ({ billing }, ref) => {
    const items = billing.items || [];

    return (
      <div
        ref={ref}
        className="w-[210mm] min-h-[297mm] p-8 bg-white text-slate-900 font-sans mx-auto text-sm print:p-6 print:w-full print:bg-white"
        style={{ boxSizing: 'border-box' }}
      >
        {/* Header */}
        <div className="border-b-2 border-slate-900 pb-5 mb-5">
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-start gap-4">
              <img
                src={LOGO_URL}
                alt="The Courier Station Sadobato Logo"
                className="w-16 h-16 object-contain rounded-lg border border-slate-300 bg-white p-1 shadow-2xs shrink-0"
                referrerPolicy="no-referrer"
              />
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-950 uppercase font-sans">
                  The Courier Station Sadobato
                </h1>
                <p className="text-[11px] font-semibold text-slate-700 tracking-wide mt-0.5">
                  Kathmandu Forwarding Billing Statement & Carrier Purchase Voucher
                </p>
                <div className="text-xs text-slate-600 space-y-0.5 mt-1">
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>Sadobato, Lalitpur / Kathmandu, Nepal</span>
                  </p>
                  <p className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5 text-slate-400" />
                      +977 1-5544332 / 9851012345
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="w-2.5 h-2.5 text-slate-400" />
                      info@courierstationsadobato.com
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="text-right flex flex-col items-end">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-900 text-white font-bold text-xs uppercase rounded tracking-wider">
                <Building2 className="w-3 h-3 text-blue-300" />
                Kathmandu Forwarder Bill
              </span>
              <div className="mt-2 text-xs text-slate-700 bg-slate-50 px-3 py-1.5 rounded border border-slate-200 text-right space-y-0.5">
                <p>
                  <span className="text-slate-500">KTM Bill No:</span>{' '}
                  <span className="font-mono font-bold text-blue-950">{billing.ktm_invoice_no}</span>
                </p>
                <p>
                  <span className="text-slate-500">Bill Date:</span>{' '}
                  <span className="font-medium text-slate-900">{billing.ktm_date}</span>
                </p>
                {billing.customer_invoice_no && (
                  <p>
                    <span className="text-slate-500">Customer Inv Ref:</span>{' '}
                    <span className="font-mono font-bold text-slate-900">{billing.customer_invoice_no}</span>
                  </p>
                )}
                {billing.awb_no && (
                  <p>
                    <span className="text-slate-500">AWB / Airway Bill:</span>{' '}
                    <span className="font-mono font-bold text-slate-900">{billing.awb_no}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Parties Grid */}
        <div className="grid grid-cols-3 gap-4 mb-5 text-xs">
          {/* Customer / Sender */}
          <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
            <p className="font-bold text-slate-800 uppercase tracking-wide text-[10px]">
              Customer (Sender / Consignor)
            </p>
            <p className="font-semibold text-slate-950 text-sm">{billing.sender_name}</p>
            {billing.sender_phone && <p className="text-slate-600">Ph: {billing.sender_phone}</p>}
            {billing.sender_address && <p className="text-slate-500">{billing.sender_address}</p>}
          </div>

          {/* Consignee / Receiver */}
          <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
            <p className="font-bold text-slate-800 uppercase tracking-wide text-[10px]">
              Consignee (Receiver / Destination)
            </p>
            <p className="font-semibold text-slate-950 text-sm">{billing.receiver_name}</p>
            <p className="text-blue-900 font-semibold">{billing.country} ({billing.transport_type})</p>
            {billing.receiver_phone && <p className="text-slate-600">Ph: {billing.receiver_phone}</p>}
            {billing.receiver_address && <p className="text-slate-500">{billing.receiver_address}</p>}
          </div>

          {/* Forwarder / Carrier Hub */}
          <div className="p-3 bg-blue-50/60 rounded border border-blue-200 space-y-1">
            <p className="font-bold text-blue-900 uppercase tracking-wide text-[10px]">
              Kathmandu Forwarder / Cargo Hub
            </p>
            <p className="font-semibold text-blue-950 text-sm">
              {billing.forwarder_name || 'Nepal Air Cargo KTM'}
            </p>
            {billing.flight_departure && (
              <p className="text-slate-600 text-[11px]">{billing.flight_departure}</p>
            )}
            {billing.forwarder_phone && (
              <p className="text-slate-500">Ph: {billing.forwarder_phone}</p>
            )}
            <p className="text-[11px] text-slate-600 font-medium mt-1">
              Payment: <strong className="text-slate-900">{billing.payment_status || 'Paid'}</strong> ({billing.payment_method || 'Bank Transfer'})
            </p>
          </div>
        </div>

        {/* Shipment Specs Banner */}
        <div className="bg-slate-900 text-white rounded p-3 mb-5 flex justify-between items-center text-xs">
          <div className="flex gap-6">
            <div>
              <span className="text-slate-400 block text-[10px]">Chargeable Weight:</span>
              <span className="font-bold text-sm">{billing.weight} kg</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Net Scale Weight:</span>
              <span className="font-bold text-sm">{billing.net_weight || billing.weight} kg</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Total Boxes:</span>
              <span className="font-bold text-sm">{billing.box_count} Box(es)</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Mode:</span>
              <span className="font-bold text-sm">{billing.transport_type} Cargo</span>
            </div>
          </div>
          {billing.customer_invoice_no && (
            <div className="text-right">
              <span className="text-slate-400 block text-[10px]">Linked Customer Bill:</span>
              <span className="font-bold text-blue-300">{billing.customer_invoice_no}</span>
            </div>
          )}
        </div>

        {/* Item List Table */}
        <div className="mb-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
            Manifested Goods & Cargo Itemization
          </h3>
          <table className="w-full border-collapse text-xs border border-slate-300">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold text-left">
                <th className="p-2 w-10 text-center">#</th>
                <th className="p-2">Item Description</th>
                <th className="p-2 text-center w-24">Category</th>
                <th className="p-2 text-center w-16">Qty</th>
                <th className="p-2 text-center w-24">Weight (kg)</th>
                <th className="p-2 text-center w-16">Box #</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((it, idx) => (
                <tr key={it.id || idx}>
                  <td className="p-2 text-center text-slate-400">{idx + 1}</td>
                  <td className="p-2 font-medium text-slate-900">{it.item_name}</td>
                  <td className="p-2 text-center">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 font-medium">
                      {it.item_type}
                    </span>
                  </td>
                  <td className="p-2 text-center">{it.quantity || 1}</td>
                  <td className="p-2 text-center">{it.weight_kg !== undefined ? `${it.weight_kg} kg` : '-'}</td>
                  <td className="p-2 text-center">Box {it.box_number || 1}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Kathmandu Cost Breakdown Table */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
            Kathmandu Forwarder Purchase & Clearance Statement
          </h3>
          <div className="bg-slate-50 border border-slate-300 rounded p-4 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-600">
                Air Freight Purchase ({billing.weight} kg {billing.freight_rate_per_kg ? `@ Rs ${billing.freight_rate_per_kg}/kg` : ''}):
              </span>
              <span className="font-bold text-slate-900">{formatCurrency(billing.freight_cost)}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-600">Airport Customs Clearance Cost (TIA KTM):</span>
              <span className="font-bold text-slate-900">{formatCurrency(billing.custom_clearance_cost)}</span>
            </div>

            {(billing.handling_cost || 0) > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">Cargo Security, Airport Documentation & Handling:</span>
                <span className="font-bold text-slate-900">{formatCurrency(billing.handling_cost || 0)}</span>
              </div>
            )}

            {(billing.meat_extra_cost || 0) > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">Quarantine Inspection / Vet Food Clearance Surcharge:</span>
                <span className="font-bold text-slate-900">{formatCurrency(billing.meat_extra_cost || 0)}</span>
              </div>
            )}

            {(billing.other_surcharges || 0) > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-600">Fuel Surcharge & Airline Adjustments:</span>
                <span className="font-bold text-slate-900">{formatCurrency(billing.other_surcharges || 0)}</span>
              </div>
            )}

            {(billing.discount_amount || 0) > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-200 text-emerald-700 font-semibold">
                <span>Forwarder Rebate / Discount:</span>
                <span>-{formatCurrency(billing.discount_amount || 0)}</span>
              </div>
            )}

            <div className="flex justify-between pt-2 text-sm font-black border-t-2 border-slate-900 text-rose-900">
              <span>TOTAL KATHMANDU BILLING COST:</span>
              <span className="text-base">{formatCurrency(billing.total_cost)}</span>
            </div>
          </div>
        </div>

        {billing.notes && (
          <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded text-xs">
            <span className="font-bold text-slate-700">Remarks: </span>
            <span className="text-slate-600">{billing.notes}</span>
          </div>
        )}

        {/* Footer Signatures */}
        <div className="grid grid-cols-2 gap-8 pt-10 mt-8 border-t border-slate-300 text-xs">
          <div className="text-center space-y-12">
            <div className="border-b border-slate-400 w-48 mx-auto" />
            <p className="font-semibold text-slate-700">Prepared By (Sadobato Hub Desk)</p>
          </div>

          <div className="text-center space-y-12">
            <div className="border-b border-slate-400 w-48 mx-auto" />
            <p className="font-semibold text-slate-700">Received & Confirmed By (Kathmandu Hub)</p>
          </div>
        </div>
      </div>
    );
  }
);
