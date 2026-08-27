import React, { useState } from 'react';
import {
  X,
  HelpCircle,
  Package,
  Scale,
  Globe,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Shield,
  Lightbulb,
  Boxes,
} from 'lucide-react';

interface QuickGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartEasyBill?: () => void;
}

export const QuickGuideModal: React.FC<QuickGuideModalProps> = ({
  isOpen,
  onClose,
  onStartEasyBill,
}) => {
  const [activeTab, setActiveTab] = useState<'steps' | 'weight' | 'items' | 'countries'>('steps');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden my-6">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl font-bold">
              💡
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                Courier Billing Guide for Beginners
              </h2>
              <p className="text-xs text-blue-100 mt-0.5">
                Learn how to create bills, calculate weights, and handle parcel items in 2 minutes!
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('steps')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'steps'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>1. 3-Step Billing</span>
          </button>

          <button
            onClick={() => setActiveTab('weight')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'weight'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>2. Weight & Boxes</span>
          </button>

          <button
            onClick={() => setActiveTab('items')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'items'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>3. Special Items</span>
          </button>

          <button
            onClick={() => setActiveTab('countries')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'countries'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>4. Country Rules</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed">
          {/* TAB 1: 3-STEP BILLING */}
          {activeTab === 'steps' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl">
                <span className="font-extrabold text-blue-900 block text-sm">
                  ✨ Creating a Bill is as easy as 1-2-3!
                </span>
                <p className="text-blue-800 mt-1">
                  You don't need any math or accounting skills. The system calculates everything automatically from our Pokhara rate table.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div>
                    <strong className="text-slate-900 font-bold block">Step 1: Enter Customer Information</strong>
                    <p className="text-slate-600 mt-0.5">
                      Type who is sending from Pokhara (Sender) and who is receiving abroad (Receiver), their phone number and destination country.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div>
                    <strong className="text-slate-900 font-bold block">Step 2: Choose Weight & Click Items</strong>
                    <p className="text-slate-600 mt-0.5">
                      Pick the weight (e.g. 10 kg). Click on quick item presets like 👕 Clothes, 🍜 Food, 🥩 Sukuti, or 🫙 Achar to add them with 1 click.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div>
                    <strong className="text-slate-900 font-bold block">Step 3: Collect Payment & Print Bill!</strong>
                    <p className="text-slate-600 mt-0.5">
                      The total price is shown on screen. Select Cash or Online QR, then click "Complete & Save Invoice". You can print the customer receipt immediately!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WEIGHT & BOXES */}
          {activeTab === 'weight' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl">
                <span className="font-extrabold text-indigo-900 block text-sm">
                  📦 Actual Weight vs Volumetric Weight
                </span>
                <p className="text-indigo-800 mt-1">
                  Air courier charges whichever is HIGHER: the actual scale weight or the box size volume weight.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-blue-600" />
                    Actual Scale Weight (kg)
                  </span>
                  <p className="text-slate-600">
                    Put the box on the weighing scale. Example: <strong>10 kg</strong>.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-indigo-600" />
                    Volumetric Weight Formula
                  </span>
                  <p className="text-slate-600 font-mono text-[11px]">
                    (Length × Width × Height in cm) ÷ 5000
                  </p>
                  <p className="text-slate-500 text-[10px]">
                    Example: 40 × 30 × 30 cm = 36,000 ÷ 5000 = <strong>7.2 kg</strong>
                  </p>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="font-bold text-emerald-900 block">💡 Pro Tip for Staff:</span>
                <p className="text-emerald-800 mt-0.5">
                  Use our 1-click Box presets (Small 40x30x30, Medium 45x35x35, Large 50x40x40) in the billing form to save time!
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: SPECIAL ITEMS */}
          {activeTab === 'items' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                <span className="font-extrabold text-amber-900 block text-sm">
                  🥩 Sukuti & 🫙 Achar Rate Rules
                </span>
                <p className="text-amber-800 mt-1">
                  Meat and Homemade Pickle have special quarantine courier rates in Nepal.
                </p>
              </div>

              <div className="space-y-2">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5">
                  <span className="text-xl">🥩</span>
                  <div>
                    <strong className="text-slate-900 font-bold block">Dry Meat / Sukuti:</strong>
                    <p className="text-slate-600">
                      Must be well-dried and vacuum packed. Set the item type to <strong>"Dry Meat"</strong> and enter its net weight in kg.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5">
                  <span className="text-xl">🫙</span>
                  <div>
                    <strong className="text-slate-900 font-bold block">Homemade Achar / Pickle:</strong>
                    <p className="text-slate-600">
                      Must be tightly sealed without oil leakage. Set item type to <strong>"Pickle"</strong> and enter its net weight in kg.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5">
                  <span className="text-xl">🚫</span>
                  <div>
                    <strong className="text-rose-900 font-bold block">Strictly Prohibited Goods:</strong>
                    <p className="text-rose-700">
                      Flammables, loose batteries, perfumes with high alcohol, pressurized sprays, and unlabelled chemicals are prohibited.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: COUNTRY RULES */}
          {activeTab === 'countries' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl">
                <span className="font-extrabold text-blue-900 block text-sm">
                  🌐 Important Country Rules
                </span>
                <p className="text-blue-800 mt-1">
                  Special destination requirements for smooth customs clearance abroad.
                </p>
              </div>

              <div className="space-y-2">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>🇰🇷</span>
                    <span>South Korea (PCC Code Required)</span>
                  </span>
                  <p className="text-slate-600">
                    Korean customs requires the receiver's 12-digit <strong>PCC (Personal Customs Clearance Code)</strong> starting with 'P' or a copy of their passport.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>🇦🇺</span>
                    <span>Australia (Strict Biosecurity)</span>
                  </span>
                  <p className="text-slate-600">
                    Australia has strict plant & meat inspections. All items must be clearly listed on the packing list.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>🇺🇸</span>
                    <span>United States & Canada</span>
                  </span>
                  <p className="text-slate-600">
                    Ensure the full street address with apartment/suite number and 5-digit US ZIP code is provided.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500 font-medium">
            Have questions? Ask our Pokhara Station admin.
          </span>

          <div className="flex items-center gap-2">
            {onStartEasyBill && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartEasyBill();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Start Easy Billing Now</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
