import React, { useState } from 'react';
import {
  Invoice,
  InvoiceItem,
  Rate,
  ItemType,
  TransportType,
  ParcelBox,
  PaymentMethod,
  PaymentStatus,
  ShipperProfile,
} from '../types';
import {
  calculateInvoice,
  formatCurrency,
  isAustraliaCountry,
} from '../lib/rateCalculator';
import {
  User,
  Phone,
  MapPin,
  Globe,
  Scale,
  Boxes,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Eye,
  Printer,
  CreditCard,
  Banknote,
  QrCode,
  Tag,
  Shield,
  FileText,
  Camera,
  Upload,
  X,
  HelpCircle,
  ShoppingBag,
  Package,
  Calendar,
  Building2,
  Mail,
  Sliders,
  Edit3,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';

interface EasyBillingWizardProps {
  rates: Rate[];
  invoices: Invoice[];
  availableCountries: string[];
  // Form values passed from parent or managed
  invoiceNo: string;
  invoiceDate: string;
  setInvoiceDate: (val: string) => void;
  senderName: string;
  setSenderName: (val: string) => void;
  senderAddress: string;
  setSenderAddress: (val: string) => void;
  senderPhone?: string;
  setSenderPhone?: (val: string) => void;
  senderEmail?: string;
  setSenderEmail?: (val: string) => void;
  receiverName: string;
  setReceiverName: (val: string) => void;
  receiverAddress: string;
  setReceiverAddress: (val: string) => void;
  receiverEmail?: string;
  setReceiverEmail?: (val: string) => void;
  phone: string;
  setPhone: (val: string) => void;
  country: string;
  setCountry: (val: string) => void;
  transportType: TransportType;
  setTransportType: (val: TransportType) => void;
  weight: number;
  setWeight: (val: number) => void;
  boxCount: number;
  setBoxCount: (val: number) => void;
  boxes: ParcelBox[];
  setBoxes: React.Dispatch<React.SetStateAction<ParcelBox[]>>;
  items: InvoiceItem[];
  setItems: React.Dispatch<React.SetStateAction<InvoiceItem[]>>;
  discountAmount: number;
  setDiscountAmount: (val: number) => void;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (val: PaymentMethod) => void;
  paymentStatus: PaymentStatus;
  setPaymentStatus: (val: PaymentStatus) => void;
  onlineTransactionId: string;
  setOnlineTransactionId: (val: string) => void;
  pccNumber: string;
  setPccNumber: (val: string) => void;
  passportPhotoUrl: string;
  setPassportPhotoUrl: (val: string) => void;
  customDutyOverride: number | null;
  setCustomDutyOverride?: (val: number | null) => void;
  customRatePerKg: number | null;
  setCustomRatePerKg?: (val: number | null) => void;
  customPurchaseAmount: number | null;
  setCustomPurchaseAmount?: (val: number | null) => void;
  customTotalSale: number | null;
  setCustomTotalSale?: (val: number | null) => void;
  meatExtraChargeOverride: number | null;
  setMeatExtraChargeOverride?: (val: number | null) => void;
  // Handlers
  onSaveInvoice: (invoice: Invoice) => void;
  onPreviewDraft: () => void;
  onResetForm: () => void;
  editingInvoice?: Invoice | null;
}

const COMMON_COUNTRIES = [
  { name: 'Australia', flag: '🇦🇺', code: 'AU' },
  { name: 'United States', flag: '🇺🇸', code: 'US' },
  { name: 'United Kingdom', flag: '🇬🇧', code: 'UK' },
  { name: 'Japan', flag: '🇯🇵', code: 'JP' },
  { name: 'India', flag: '🇮🇳', code: 'IN' },
  { name: 'Canada', flag: '🇨🇦', code: 'CA' },
  { name: 'South Korea', flag: '🇰🇷', code: 'KR' },
];

const WEIGHT_PRESETS = [1, 2, 5, 10, 15, 20, 25, 30];

const ITEM_PRESETS = [
  { name: 'Clothes & Garments', type: 'Normal' as ItemType, icon: '👕', defaultWeight: null },
  { name: 'Instant Noodles & Snacks', type: 'Normal' as ItemType, icon: '🍜', defaultWeight: null },
  { name: 'Sukuti / Dried Meat', type: 'Dry Meat' as ItemType, icon: '🥩', defaultWeight: 2 },
  { name: 'Pickle / Homemade Achar', type: 'Pickle' as ItemType, icon: '🫙', defaultWeight: 2 },
  { name: 'Himalayan Organic Tea & Spices', type: 'Normal' as ItemType, icon: '🍵', defaultWeight: null },
  { name: 'Handicrafts & Statues', type: 'Normal' as ItemType, icon: '🎁', defaultWeight: null },
  { name: 'Books & Academic Documents', type: 'Normal' as ItemType, icon: '📚', defaultWeight: null },
  { name: 'Ayurvedic & Herbal Goods', type: 'Normal' as ItemType, icon: '🌿', defaultWeight: null },
];

const BOX_PRESETS = [
  { label: 'Small Box', size: '10 kg capacity', l: 40, w: 30, h: 30, defaultKg: 10 },
  { label: 'Medium Box', size: '15 kg capacity', l: 45, w: 35, h: 35, defaultKg: 15 },
  { label: 'Large Box', size: '20 kg capacity', l: 50, w: 40, h: 40, defaultKg: 20 },
  { label: 'Extra Large', size: '30 kg capacity', l: 60, w: 50, h: 40, defaultKg: 30 },
];

export const EasyBillingWizard: React.FC<EasyBillingWizardProps> = ({
  rates,
  invoices,
  availableCountries,
  invoiceNo,
  invoiceDate,
  setInvoiceDate,
  senderName,
  setSenderName,
  senderAddress,
  setSenderAddress,
  senderPhone = '',
  setSenderPhone,
  senderEmail = '',
  setSenderEmail,
  receiverName,
  setReceiverName,
  receiverAddress,
  setReceiverAddress,
  receiverEmail = '',
  setReceiverEmail,
  phone,
  setPhone,
  country,
  setCountry,
  transportType,
  setTransportType,
  weight,
  setWeight,
  boxCount,
  setBoxCount,
  boxes,
  setBoxes,
  items,
  setItems,
  discountAmount,
  setDiscountAmount,
  paymentMethod,
  setPaymentMethod,
  paymentStatus,
  setPaymentStatus,
  onlineTransactionId,
  setOnlineTransactionId,
  pccNumber,
  setPccNumber,
  passportPhotoUrl,
  setPassportPhotoUrl,
  customDutyOverride,
  setCustomDutyOverride,
  customRatePerKg,
  setCustomRatePerKg,
  customPurchaseAmount,
  setCustomPurchaseAmount,
  customTotalSale,
  setCustomTotalSale,
  meatExtraChargeOverride,
  setMeatExtraChargeOverride,
  onSaveInvoice,
  onPreviewDraft,
  onResetForm,
  editingInvoice,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [showDemoNotification, setShowDemoNotification] = useState(false);
  const [showCustomPricing, setShowCustomPricing] = useState(false);

  // Live calculation
  const liveCalculation = calculateInvoice(
    rates,
    country,
    weight,
    boxCount,
    items,
    discountAmount,
    customDutyOverride,
    customRatePerKg,
    customPurchaseAmount,
    customTotalSale,
    meatExtraChargeOverride
  );

  // One-click demo customer autofill
  const handleFillDemoData = () => {
    setSenderName('Suman Sharma');
    setSenderAddress('Lakeside, Pokhara-6, Nepal');
    if (setSenderPhone) setSenderPhone('9856012345');
    if (setSenderEmail) setSenderEmail('suman.sharma@example.com');
    setReceiverName('Rajesh Sharma');
    setReceiverAddress('42 George St, Haymarket, Sydney NSW 2000');
    if (setReceiverEmail) setReceiverEmail('rajesh.sharma@example.com');
    setPhone('+61 412 345 678');
    setCountry('Australia');
    setTransportType('Air');
    setWeight(10);
    setBoxCount(1);
    setBoxes([
      { id: `box-${Date.now()}-1`, box_number: 1, weight_kg: 10, length_cm: 40, width_cm: 30, height_cm: 30 },
    ]);
    setItems([
      { id: `item-${Date.now()}-1`, item_name: 'Nepali Hand-woven Shawls & Clothes', quantity: 4, item_type: 'Normal', weight_kg: null, box_number: 1 },
      { id: `item-${Date.now()}-2`, item_name: 'Buff Sukuti (Dry Meat)', quantity: 2, item_type: 'Dry Meat', weight_kg: 2, box_number: 1 },
      { id: `item-${Date.now()}-3`, item_name: 'Homemade Lapsi Achar', quantity: 2, item_type: 'Pickle', weight_kg: 2, box_number: 1 },
    ]);
    setDiscountAmount(0);
    setPaymentMethod('Cash');
    setPaymentStatus('Paid');
    setStepError(null);
    setShowDemoNotification(true);
    setTimeout(() => setShowDemoNotification(false), 4000);
  };

  // Step 1 Validation
  const validateStep1 = () => {
    if (!senderName.trim()) {
      setStepError('Please enter the Sender Name.');
      return false;
    }
    if (!receiverName.trim()) {
      setStepError('Please enter the Receiver Name.');
      return false;
    }
    if (!phone.trim()) {
      setStepError('Please enter the Receiver Phone Number.');
      return false;
    }
    setStepError(null);
    return true;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    if (weight < 1) {
      setStepError('Total weight must be at least 1 kg.');
      return false;
    }
    if (boxCount < 1) {
      setStepError('At least 1 box is required.');
      return false;
    }
    if (items.length === 0 || items.some((it) => !it.item_name.trim())) {
      setStepError('Please write the name of items inside the parcel.');
      return false;
    }
    setStepError(null);
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep2()) setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    setStepError(null);
    if (currentStep === 3) setCurrentStep(2);
    else if (currentStep === 2) setCurrentStep(1);
  };

  // Quick Add Item Preset
  const handleAddPresetItem = (preset: typeof ITEM_PRESETS[0]) => {
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      item_name: preset.name.split(' (')[0],
      quantity: 1,
      item_type: preset.type,
      weight_kg: preset.defaultWeight,
      box_number: 1,
    };
    setItems((prev) => [...prev, newItem]);
    setStepError(null);
  };

  // Quick Remove Item
  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      setStepError('Parcel must contain at least 1 item.');
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
    setStepError(null);
  };

  // Quick update item
  const handleUpdateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          const updated = { ...it, [field]: value };
          if (field === 'item_type') {
            if (value === 'Normal') updated.weight_kg = null;
            else if (!updated.weight_kg || updated.weight_kg <= 0) updated.weight_kg = 1;
          }
          return updated;
        }
        return it;
      })
    );
  };

  // Quick Apply Box Preset
  const handleApplyBoxPreset = (boxIdx: number, preset: typeof BOX_PRESETS[0]) => {
    setBoxes((prev) => {
      const copy = [...prev];
      if (copy[boxIdx]) {
        copy[boxIdx] = {
          ...copy[boxIdx],
          weight_kg: preset.defaultKg,
          length_cm: preset.l,
          width_cm: preset.w,
          height_cm: preset.h,
        };
      }
      return copy;
    });

    // Auto update total weight
    const total = boxes.reduce((acc, b, idx) => {
      if (idx === boxIdx) {
        const vol = (preset.l * preset.w * preset.h) / 5000;
        return acc + Math.max(preset.defaultKg, vol);
      }
      const act = Number(b.weight_kg) || 0;
      const vol = ((Number(b.length_cm) || 0) * (Number(b.width_cm) || 0) * (Number(b.height_cm) || 0)) / 5000;
      return acc + Math.max(act, vol);
    }, 0);
    setWeight(Math.max(1, Number(total.toFixed(2))));
  };

  // Add a new box
  const handleAddBox = () => {
    const nextNum = boxes.length + 1;
    const newBox: ParcelBox = {
      id: `box-${Date.now()}-${nextNum}`,
      box_number: nextNum,
      weight_kg: 10,
      length_cm: 40,
      width_cm: 30,
      height_cm: 30,
    };
    setBoxes((prev) => [...prev, newBox]);
    setBoxCount(nextNum);
    setWeight((prev) => prev + 10);
  };

  // Final Submit
  const handleFinalSubmit = () => {
    if (!validateStep1() || !validateStep2()) return;
    if (!liveCalculation.isValid || !liveCalculation.result) {
      setStepError(liveCalculation.error || 'Calculation failed. Please verify rates.');
      return;
    }

    const {
      saleAmount,
      totalPurchase,
      profitAmount,
      customDuty,
      meatExtraCharge,
      discountAmount: finalDiscount,
      effectiveRatePerKg,
    } = liveCalculation.result;

    const finalInvoiceNo = editingInvoice ? editingInvoice.invoice_no : invoiceNo;

    const savedInvoice: Invoice = {
      id: editingInvoice ? editingInvoice.id : `inv-${Date.now()}`,
      invoice_no: finalInvoiceNo,
      invoice_date: invoiceDate,
      shipper_id: 'shipper-sadobato',
      shipper_name: 'The Courier Station Sadobato',
      shipper_code: 'CSS-SDB',
      shipper_phone: '+977-1-5544332',
      shipper_email: 'info@courierstationsadobato.com',
      shipper_address: 'Sadobato, Lalitpur / Kathmandu, Nepal',
      shipper_tax_id: 'PAN: 601234567',
      sender_name: senderName.trim(),
      sender_phone: senderPhone?.trim() || undefined,
      sender_address: senderAddress.trim() || undefined,
      sender_email: senderEmail.trim() || undefined,
      receiver_name: receiverName.trim(),
      receiver_address: receiverAddress.trim() || undefined,
      receiver_email: receiverEmail.trim() || undefined,
      receiver_phone: phone.trim() || undefined,
      phone: phone.trim(),
      country: country.trim(),
      transport_type: transportType,
      weight: Number(weight),
      box_count: Number(boxCount),
      boxes: boxes.map((b) => ({ ...b })),
      departure: 'Kathmandu (KTM)',
      port_of_loading: 'Kathmandu, Nepal',
      sale_amount: saleAmount,
      purchase_amount: totalPurchase,
      profit_amount: profitAmount,
      discount_amount: finalDiscount,
      custom_duty_amount: customDuty,
      meat_extra_charge: meatExtraCharge,
      rate_per_kg: effectiveRatePerKg,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      online_transaction_id: onlineTransactionId.trim() || undefined,
      pcc_number: pccNumber.trim() || undefined,
      passport_photo_url: passportPhotoUrl || undefined,
      status: editingInvoice ? (editingInvoice.status || 'Billed') : 'Billed',
      created_at: editingInvoice ? editingInvoice.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: items.map((it) => ({
        ...it,
        item_name: it.item_name.trim(),
        quantity: Number(it.quantity) || 1,
        weight_kg: it.item_type !== 'Normal' ? Number(it.weight_kg) || 0 : null,
        box_number: it.box_number || 1,
      })),
    };

    onSaveInvoice(savedInvoice);
  };

  return (
    <div className="space-y-6">
      {/* Demo Autofill Banner for Trainees / 13+ */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 p-3.5 sm:p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
            ✨
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block">
              Easy 3-Step Guided Billing
            </span>
            <p className="text-[11px] text-slate-600">
              Simple and intuitive for anyone. Click the sample button to try in 1 second!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleFillDemoData}
            className="flex-1 sm:flex-none px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center justify-center gap-1.5"
            title="Click to automatically fill with a sample customer and items"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>✨ 1-Click Sample Customer</span>
          </button>
          {!editingInvoice && (
            <button
              type="button"
              onClick={onResetForm}
              className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg transition"
              title="Reset all fields"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {showDemoNotification && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-xl flex items-center gap-2 animate-bounce shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span><strong>Demo data loaded!</strong> Explore Step 1, Step 2, and Step 3 to see how billing calculates automatically.</span>
        </div>
      )}

      {/* Step Progress Indicators */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="grid grid-cols-3 gap-2">
          {/* Step 1 Tab */}
          <button
            type="button"
            onClick={() => {
              setStepError(null);
              setCurrentStep(1);
            }}
            className={`flex items-center justify-center sm:justify-start gap-2 p-2.5 sm:p-3 rounded-lg text-left transition ${
              currentStep === 1
                ? 'bg-blue-600 text-white shadow-xs'
                : currentStep > 1
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-slate-50 text-slate-500'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${
                currentStep === 1
                  ? 'bg-white text-blue-700'
                  : currentStep > 1
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {currentStep > 1 ? '✓' : '1'}
            </div>
            <div className="hidden sm:block min-w-0">
              <span className="text-xs font-bold block truncate">1. Customer Info</span>
              <span className={`text-[10px] block truncate ${currentStep === 1 ? 'text-blue-100' : 'text-slate-500'}`}>
                Sender & Receiver
              </span>
            </div>
          </button>

          {/* Step 2 Tab */}
          <button
            type="button"
            onClick={() => {
              if (validateStep1()) {
                setStepError(null);
                setCurrentStep(2);
              }
            }}
            className={`flex items-center justify-center sm:justify-start gap-2 p-2.5 sm:p-3 rounded-lg text-left transition ${
              currentStep === 2
                ? 'bg-blue-600 text-white shadow-xs'
                : currentStep > 2
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-slate-50 text-slate-500'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${
                currentStep === 2
                  ? 'bg-white text-blue-700'
                  : currentStep > 2
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {currentStep > 2 ? '✓' : '2'}
            </div>
            <div className="hidden sm:block min-w-0">
              <span className="text-xs font-bold block truncate">2. Box & Items</span>
              <span className={`text-[10px] block truncate ${currentStep === 2 ? 'text-blue-100' : 'text-slate-500'}`}>
                Package & Items
              </span>
            </div>
          </button>

          {/* Step 3 Tab */}
          <button
            type="button"
            onClick={() => {
              if (validateStep1() && validateStep2()) {
                setStepError(null);
                setCurrentStep(3);
              }
            }}
            className={`flex items-center justify-center sm:justify-start gap-2 p-2.5 sm:p-3 rounded-lg text-left transition ${
              currentStep === 3
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-500'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${
                currentStep === 3
                  ? 'bg-white text-blue-700'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              3
            </div>
            <div className="hidden sm:block min-w-0">
              <span className="text-xs font-bold block truncate">3. Price & Print</span>
              <span className={`text-[10px] block truncate ${currentStep === 3 ? 'text-blue-100' : 'text-slate-500'}`}>
                Summary & Receipt
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Error Message Box */}
      {stepError && (
        <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-200 text-rose-900 text-xs flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold block">Please check:</strong>
            <p className="leading-relaxed mt-0.5">{stepError}</p>
          </div>
        </div>
      )}

      {/* STEP 1: CUSTOMER & DESTINATION */}
      {currentStep === 1 && (
        <div className="space-y-5 animate-fadeIn">
          {/* Quick Helper Banner for Newcomers */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-blue-900 shadow-2xs">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-xs">
              1
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                <span>Step 1: Choose Country & Customer Information</span>
                <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded">Fast & Simple</span>
              </h3>
              <p className="text-[11px] text-blue-800/90 leading-relaxed mt-0.5">
                Pick the destination country where the parcel is flying to, then enter the sender in Nepal and the receiver abroad.
              </p>
            </div>
          </div>

          {/* Destination Country Selection */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>Where is the parcel going? (Destination Country) *</span>
            </label>

            {/* Quick Country Buttons with Flags */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {COMMON_COUNTRIES.map((c) => {
                const isSelected = country.toLowerCase() === c.name.toLowerCase();
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setCountry(c.name);
                      setStepError(null);
                    }}
                    className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500 font-bold text-blue-900 shadow-xs'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="text-2xl">{c.flag}</span>
                    <span className="text-xs font-semibold leading-tight">{c.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Other countries dropdown if needed */}
            <div className="pt-2 flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Or select other country:</span>
              <select
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value);
                  setStepError(null);
                }}
                className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {availableCountries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Korea PCC Notice if selected */}
          {country.toLowerCase().includes('korea') && (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <Shield className="w-4 h-4 text-amber-700" />
                <span>South Korea Receiver Personal Customs Code (PCC Code)</span>
              </div>
              <p className="text-[11px] text-amber-800">
                Korean customs requires a 12-digit PCC code (starts with 'P') or passport copy.
              </p>
              <input
                type="text"
                placeholder="e.g. P123456789012"
                value={pccNumber || ''}
                onChange={(e) => setPccNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-amber-300 rounded-lg bg-white font-mono font-bold"
              />
            </div>
          )}

          {/* Sender & Receiver Dual Column Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Sender Box */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    📤
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Sender in Nepal</h3>
                    <span className="text-[10px] text-slate-400">Person sending from Nepal</span>
                  </div>
                </div>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                  Origin: Pokhara
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sender Full Name *</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Suman Sharma"
                  value={senderName}
                  onChange={(e) => {
                    setSenderName(e.target.value);
                    setStepError(null);
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    <span>Customer / Sender Mobile Number * (For Tracking Code)</span>
                  </span>
                  <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded">
                    SMS / WhatsApp Tracking
                  </span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9856012345 / +977-9800000000"
                  value={senderPhone || ''}
                  onChange={(e) => {
                    if (setSenderPhone) setSenderPhone(e.target.value);
                    setStepError(null);
                  }}
                  className="w-full px-3 py-2 text-xs border border-blue-200 bg-blue-50/20 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-slate-900"
                />
                <span className="text-[10.5px] text-slate-500 mt-1 block">
                  📱 Customer mobile number to deliver AWB tracking code & dispatch status.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sender Address</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lakeside, Pokhara-6, Nepal"
                  value={senderAddress || ''}
                  onChange={(e) => setSenderAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Optional Email */}
              <div className="pt-1">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400" />
                  <span>Sender Email (Optional)</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. sender@example.com (optional)"
                  value={senderEmail || ''}
                  onChange={(e) => setSenderEmail && setSenderEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-600 bg-slate-50/50"
                />
              </div>
            </div>

            {/* Receiver Box */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    📥
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Receiver Abroad</h3>
                    <span className="text-[10px] text-slate-400">Person receiving in {country}</span>
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold">
                  {country}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Receiver Full Name *</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rajesh Sharma"
                  value={receiverName}
                  onChange={(e) => {
                    setReceiverName(e.target.value);
                    setStepError(null);
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Receiver Phone *</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +61 412 345 678"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setStepError(null);
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Receiver Email</span>
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. receiver@example.com"
                    value={receiverEmail || ''}
                    onChange={(e) => setReceiverEmail && setReceiverEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Receiver Full Street Address</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 42 George St, Sydney NSW 2000"
                  value={receiverAddress || ''}
                  onChange={(e) => setReceiverAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleNextStep}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-2"
            >
              <span>Next: Box & Items</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: PACKAGE, WEIGHT & ITEMS */}
      {currentStep === 2 && (
        <div className="space-y-5 animate-fadeIn">
          {/* Quick Weight Selector */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Total Shipment Weight (KG) *
                </h3>
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
                Current: {weight} kg
              </span>
            </div>

            {/* Big Tactile Preset Buttons */}
            <div className="space-y-2">
              <span className="text-[11px] text-slate-500 font-medium">Quick Pick Weight:</span>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {WEIGHT_PRESETS.map((kg) => (
                  <button
                    key={kg}
                    type="button"
                    onClick={() => {
                      setWeight(kg);
                      // sync with box 1
                      if (boxes.length === 1) {
                        setBoxes([{ ...boxes[0], weight_kg: kg }]);
                      }
                      setStepError(null);
                    }}
                    className={`py-2 px-3 rounded-xl font-extrabold text-xs transition border ${
                      weight === kg
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs scale-105'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                    }`}
                  >
                    {kg} kg
                  </button>
                ))}
              </div>
            </div>

            {/* Stepper + Custom Input */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setWeight(Math.max(1, Number((weight - 1).toFixed(1))))}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-lg flex items-center justify-center border border-slate-200 transition"
              >
                -
              </button>
              <div className="flex-1 max-w-[200px]">
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={weight}
                    onChange={(e) => setWeight(Math.max(1, Number(e.target.value)))}
                    className="w-full text-center font-black text-lg py-1.5 px-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">KG</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWeight(Number((weight + 1).toFixed(1)))}
                className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-lg flex items-center justify-center border border-slate-200 transition"
              >
                +
              </button>

              <div className="text-xs text-slate-500 pl-3">
                {liveCalculation.result && (
                  <span className="text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    ⚡ Applied Rate: {formatCurrency(liveCalculation.result.effectiveRatePerKg)} / kg
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Box Size Presets & Box List */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Parcel Carton Boxes ({boxes.length} Box{boxes.length > 1 ? 'es' : ''})
                </h3>
              </div>

              <button
                type="button"
                onClick={handleAddBox}
                className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg border border-blue-200 flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Another Box (+1 Box)</span>
              </button>
            </div>

            {/* Boxes Cards */}
            <div className="space-y-3">
              {boxes.map((box, idx) => (
                <div key={box.id || idx} className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <span className="w-5 h-5 bg-blue-600 text-white rounded-md flex items-center justify-center text-[10px]">
                        #{idx + 1}
                      </span>
                      Box #{idx + 1} Dimensions & Weight
                    </span>

                    {boxes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setBoxes((prev) => prev.filter((_, i) => i !== idx));
                          setBoxCount(boxes.length - 1);
                        }}
                        className="text-rose-600 hover:text-rose-700 text-xs font-bold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  {/* Quick Preset Buttons for Box */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {BOX_PRESETS.map((preset, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => handleApplyBoxPreset(idx, preset)}
                        className="p-2 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg text-left transition text-xs"
                      >
                        <span className="font-bold text-slate-800 block truncate">{preset.label}</span>
                        <span className="text-[10px] text-slate-400 block">{preset.l}×{preset.w}×{preset.h} cm</span>
                      </button>
                    ))}
                  </div>

                  {/* Manual dimension inputs */}
                  <div className="grid grid-cols-4 gap-2 pt-1 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600">Weight (kg)</label>
                      <input
                        type="number"
                        value={box.weight_kg || ''}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setBoxes((prev) => {
                            const copy = [...prev];
                            copy[idx].weight_kg = val;
                            return copy;
                          });
                        }}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded-md font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600">Length (cm)</label>
                      <input
                        type="number"
                        value={box.length_cm || ''}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setBoxes((prev) => {
                            const copy = [...prev];
                            copy[idx].length_cm = val;
                            return copy;
                          });
                        }}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600">Width (cm)</label>
                      <input
                        type="number"
                        value={box.width_cm || ''}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setBoxes((prev) => {
                            const copy = [...prev];
                            copy[idx].width_cm = val;
                            return copy;
                          });
                        }}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600">Height (cm)</label>
                      <input
                        type="number"
                        value={box.height_cm || ''}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setBoxes((prev) => {
                            const copy = [...prev];
                            copy[idx].height_cm = val;
                            return copy;
                          });
                        }}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 1-Click Item Presets & Item List */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  What items are inside? *
                </h3>
              </div>
              <span className="text-[11px] text-slate-500">
                Click any preset to add instantly
              </span>
            </div>

            {/* Quick 1-Click Item Chips */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-600">Quick Add Common Items:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ITEM_PRESETS.map((preset, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => handleAddPresetItem(preset)}
                    className="p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl text-left transition flex items-center gap-2 group"
                  >
                    <span className="text-lg group-hover:scale-110 transition">{preset.icon}</span>
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-xs text-slate-800 block truncate group-hover:text-blue-700">
                        {preset.name.split(' (')[0]}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {preset.type !== 'Normal' ? `Special (${preset.type})` : 'General'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Items Table / Card List */}
            <div className="space-y-2.5 pt-2">
              <span className="text-[11px] font-bold text-slate-700">Parcel Item List ({items.length}):</span>
              {items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center gap-3"
                >
                  <span className="text-xs font-bold text-slate-400 shrink-0 w-6">
                    #{idx + 1}
                  </span>

                  {/* Item Name Input */}
                  <div className="flex-1 w-full sm:w-auto">
                    <input
                      type="text"
                      placeholder="Item name (e.g. Winter Jackets, Dried Sukuti)"
                      value={item.item_name}
                      onChange={(e) => handleUpdateItem(item.id, 'item_name', e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Item Type (Normal vs Dry Meat vs Pickle) */}
                  <div className="w-full sm:w-36 shrink-0">
                    <select
                      value={item.item_type}
                      onChange={(e) => handleUpdateItem(item.id, 'item_type', e.target.value as ItemType)}
                      className={`w-full px-2 py-1.5 border rounded-lg text-xs font-bold ${
                        item.item_type === 'Dry Meat'
                          ? 'bg-rose-50 border-rose-300 text-rose-800'
                          : item.item_type === 'Pickle'
                          ? 'bg-amber-50 border-amber-300 text-amber-800'
                          : 'bg-white border-slate-300 text-slate-700'
                      }`}
                    >
                      <option value="Normal">General / Normal</option>
                      <option value="Dry Meat">Dry Meat</option>
                      <option value="Pickle">Pickle / Achar</option>
                      <option value="Meat">Fresh Meat</option>
                    </select>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] font-bold text-slate-400">Qty:</span>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleUpdateItem(item.id, 'quantity', Math.max(1, Number(e.target.value)))}
                      className="w-14 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center"
                    />
                  </div>

                  {/* Special Weight if not Normal */}
                  {item.item_type !== 'Normal' && (
                    <div className="flex items-center gap-1 shrink-0 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                      <span className="text-[10px] font-bold text-amber-800">Item Wt:</span>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={item.weight_kg != null ? item.weight_kg : 1}
                        onChange={(e) => handleUpdateItem(item.id, 'weight_kg', Number(e.target.value))}
                        className="w-14 px-1.5 py-0.5 bg-white border border-amber-300 rounded text-xs font-bold text-center"
                      />
                      <span className="text-[10px] font-bold text-amber-800">kg</span>
                    </div>
                  )}

                  {/* Delete Item Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  const newItem: InvoiceItem = {
                    id: `item-${Date.now()}`,
                    item_name: '',
                    quantity: 1,
                    item_type: 'Normal',
                    weight_kg: null,
                    box_number: 1,
                  };
                  setItems((prev) => [...prev, newItem]);
                }}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                <span>Add Blank Item Row (+ Add Item)</span>
              </button>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handlePrevStep}
              className="px-5 py-2.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back: Customer Info</span>
            </button>

            <button
              type="button"
              onClick={handleNextStep}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-2"
            >
              <span>Next: Price & Print</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PRICE, PAYMENT & COMPLETE */}
      {currentStep === 3 && (
        <div className="space-y-5 animate-fadeIn">
          {/* Big Clear Pricing Breakdown Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-lg space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700 pb-4">
              <div>
                <span className="text-xs font-bold text-blue-400 uppercase tracking-widest block">
                  Automatic Billing Summary
                </span>
                <h2 className="text-lg font-black text-white mt-0.5">
                  Shipment to {country} • {weight} KG ({boxCount} Box{boxCount > 1 ? 'es' : ''})
                </h2>
              </div>

              {/* Total To Collect Highlight */}
              <div className="text-left sm:text-right bg-slate-800/80 p-3.5 rounded-xl border border-slate-600">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                  Grand Total to Collect
                </span>
                <span className="text-3xl font-black text-emerald-400 font-mono block">
                  {liveCalculation.result ? formatCurrency(liveCalculation.result.saleAmount) : 'Rs. 0'}
                </span>
              </div>
            </div>

            {/* Price Line Items Breakdown */}
            {liveCalculation.result && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 block text-[11px]">Weight & Rate</span>
                  <span className="font-bold text-white block mt-1">
                    {weight} kg × {formatCurrency(liveCalculation.result.effectiveRatePerKg)}/kg
                  </span>
                </div>

                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 block text-[11px]">Customs & Handling</span>
                  <span className="font-bold text-white block mt-1">
                    {formatCurrency(liveCalculation.result.customDuty)} ({boxCount} Box)
                  </span>
                </div>

                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 block text-[11px]">Special Items Charge</span>
                  <span className="font-bold text-white block mt-1">
                    {formatCurrency(liveCalculation.result.meatExtraCharge)}
                  </span>
                </div>

                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 block text-[11px]">Applied Discount</span>
                  <span className="font-bold text-rose-300 block mt-1">
                    - {formatCurrency(discountAmount)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* EDITABLE AMOUNTS & CUSTOM DEAL PRICING OVERRIDES (Fully Editable) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Custom Deal Rates & Amount Overrides
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomPricing(!showCustomPricing)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                <span>{showCustomPricing ? 'Hide Custom Controls' : 'Edit Rate / Duty / Deal Amount Directly'}</span>
                {showCustomPricing ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Editable Amount Inputs Grid */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 ${showCustomPricing ? 'block' : 'hidden sm:grid'}`}>
              {/* 1. Custom Deal Rate per kg */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700">
                    Deal Rate (Rs/kg)
                  </label>
                  {customRatePerKg !== null && setCustomRatePerKg && (
                    <button
                      type="button"
                      onClick={() => setCustomRatePerKg(null)}
                      className="text-[10px] text-blue-600 hover:underline font-bold"
                    >
                      Auto
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder={liveCalculation.result ? `Auto (${Math.round(liveCalculation.result.baseRatePerKg || liveCalculation.result.effectiveRatePerKg)})` : 'Rate/kg'}
                  value={customRatePerKg ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (setCustomRatePerKg) setCustomRatePerKg(val === '' ? null : Math.max(0, Number(val)));
                    if (val !== '' && setCustomTotalSale) setCustomTotalSale(null);
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 block">
                  {customRatePerKg !== null ? `Custom rate active for ${weight}kg` : `Using matrix rate`}
                </span>
              </div>

              {/* 2. Direct Final Deal Amount (Lump Sum) */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700">
                    Total Deal Amount (Rs)
                  </label>
                  {customTotalSale !== null && setCustomTotalSale && (
                    <button
                      type="button"
                      onClick={() => setCustomTotalSale(null)}
                      className="text-[10px] text-blue-600 hover:underline font-bold"
                    >
                      Auto
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min="0"
                  placeholder={liveCalculation.result ? `Auto (${formatCurrency(liveCalculation.result.saleAmount)})` : 'Total Rs'}
                  value={customTotalSale ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (setCustomTotalSale) setCustomTotalSale(val === '' ? null : Math.max(0, Number(val)));
                    if (val !== '' && setCustomRatePerKg) setCustomRatePerKg(null);
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 block">
                  {customTotalSale !== null ? `Fixed deal amount active` : `Calculated from weight & rate`}
                </span>
              </div>

              {/* 3. Custom Duty Override */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700">
                    Customs Duty (Rs)
                  </label>
                  {customDutyOverride !== null && setCustomDutyOverride && (
                    <button
                      type="button"
                      onClick={() => setCustomDutyOverride(null)}
                      className="text-[10px] text-blue-600 hover:underline font-bold"
                    >
                      Auto
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min="0"
                  placeholder={liveCalculation.result ? `Auto (${formatCurrency(liveCalculation.result.customDuty)})` : 'Duty Rs'}
                  value={customDutyOverride ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (setCustomDutyOverride) setCustomDutyOverride(val === '' ? null : Math.max(0, Number(val)));
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 block">
                  {customDutyOverride !== null ? `Manual duty override` : `Standard ${boxCount} box duty`}
                </span>
              </div>

              {/* 4. Special Meat / Surcharge Override */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700">
                    Meat/Extra Fee (Rs)
                  </label>
                  {meatExtraChargeOverride !== null && setMeatExtraChargeOverride && (
                    <button
                      type="button"
                      onClick={() => setMeatExtraChargeOverride(null)}
                      className="text-[10px] text-blue-600 hover:underline font-bold"
                    >
                      Auto
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min="0"
                  placeholder={liveCalculation.result ? `Auto (${formatCurrency(liveCalculation.result.meatExtraCharge)})` : 'Surcharge Rs'}
                  value={meatExtraChargeOverride ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (setMeatExtraChargeOverride) setMeatExtraChargeOverride(val === '' ? null : Math.max(0, Number(val)));
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 block">
                  {meatExtraChargeOverride !== null ? `Manual surcharge set` : `From special items list`}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Details & Discount Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Payment Method */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Banknote className="w-4 h-4 text-blue-600" />
                <span>Payment Method</span>
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('Cash')}
                  className={`p-3 rounded-xl border text-center font-bold text-xs flex flex-col items-center gap-1.5 transition ${
                    paymentMethod === 'Cash'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500 shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-2xl">💵</span>
                  <span>Cash Payment</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('Online Payment')}
                  className={`p-3 rounded-xl border text-center font-bold text-xs flex flex-col items-center gap-1.5 transition ${
                    paymentMethod === 'Online Payment'
                      ? 'border-blue-600 bg-blue-50 text-blue-900 ring-2 ring-blue-500 shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-2xl">📱</span>
                  <span>Online / QR / eSewa</span>
                </button>
              </div>

              {paymentMethod === 'Online Payment' && (
                <div className="pt-1">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Transaction ID / Reference (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. FONEPAY-98234812"
                    value={onlineTransactionId || ''}
                    onChange={(e) => setOnlineTransactionId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              )}

              {/* Payment Status */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Payment Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentStatus('Paid')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                      paymentStatus === 'Paid'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ✅ Paid in Full
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentStatus('Unpaid')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${
                      paymentStatus === 'Unpaid'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ⏳ Unpaid / Pending
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Discount & Final Check */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Tag className="w-4 h-4 text-blue-600" />
                <span>Special Discount</span>
              </h3>

              <div className="space-y-2">
                <span className="text-[11px] text-slate-500 font-medium">Quick Discount Buttons:</span>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 100, 200, 500].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDiscountAmount(d)}
                      className={`py-2 px-2 rounded-lg font-bold text-xs border transition ${
                        discountAmount === d
                          ? 'bg-rose-50 border-rose-300 text-rose-800 font-extrabold ring-1 ring-rose-400'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {d === 0 ? 'No Discount' : `- Rs. ${d}`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Custom Discount Amount (Rs.)
                </label>
                <input
                  type="number"
                  min="0"
                  value={discountAmount || ''}
                  onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                  placeholder="0"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-bold text-rose-700"
                />
              </div>

              {/* Summary verification pills */}
              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-[11px] text-slate-600 border border-slate-200">
                <div className="flex justify-between">
                  <span>Sender:</span>
                  <strong className="text-slate-800">{senderName}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Receiver:</span>
                  <strong className="text-slate-800">{receiverName} ({phone})</strong>
                </div>
                <div className="flex justify-between">
                  <span>Items:</span>
                  <strong className="text-slate-800">{items.length} item kinds in {boxCount} box(es)</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Final Finish & Print Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
            <button
              type="button"
              onClick={handlePrevStep}
              className="w-full sm:w-auto px-5 py-3 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back: Edit Items</span>
            </button>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onPreviewDraft}
                className="flex-1 sm:flex-none px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 border border-slate-300"
              >
                <Eye className="w-4 h-4 text-slate-600" />
                <span>Live Bill Preview</span>
              </button>

              <button
                type="button"
                onClick={handleFinalSubmit}
                className="flex-1 sm:flex-none px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{editingInvoice ? 'Update Invoice Now' : '🎉 Complete & Save Invoice'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
