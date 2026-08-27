import React, { useState, useEffect, useMemo } from 'react';
import {
  Invoice,
  InvoiceItem,
  Rate,
  TransportType,
  ServiceCategory,
  ItemType,
  ParcelBox,
  PaymentMethod,
  PaymentStatus,
} from '../types';
import { calculateInvoice, formatCurrency } from '../lib/rateCalculator';
import { generateNextInvoiceNo, getShipperProfiles } from '../lib/storage';
import {
  Plane,
  Truck,
  Package,
  Zap,
  Globe,
  FileText,
  User,
  Phone,
  MapPin,
  Mail,
  Shield,
  CreditCard,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Pill,
  Sparkles,
  Barcode,
  Layers,
  DollarSign,
  Tag,
  Stethoscope,
  Info,
} from 'lucide-react';

interface ExpressBillingFormProps {
  rates: Rate[];
  invoices: Invoice[];
  editingInvoice?: Invoice | null;
  onSaveInvoice: (invoice: Invoice) => void;
  onCancelEdit?: () => void;
}

const EXPRESS_NETWORKS: { id: ServiceCategory; name: string; prefix: string; color: string; badge: string }[] = [
  { id: 'DHL Express', name: 'DHL Express (Worldwide)', prefix: 'DHL', color: 'bg-amber-500 text-slate-950 border-amber-600', badge: 'DHL' },
  { id: 'FedEx Express', name: 'FedEx Express International', prefix: 'FDX', color: 'bg-purple-600 text-white border-purple-700', badge: 'FedEx' },
  { id: 'Aramex Express', name: 'Aramex Express Global', prefix: 'ARX', color: 'bg-red-600 text-white border-red-700', badge: 'Aramex' },
  { id: 'UPS Express', name: 'UPS Worldwide Express', prefix: 'UPS', color: 'bg-amber-800 text-amber-100 border-amber-900', badge: 'UPS' },
  { id: 'Skynet Express', name: 'Skynet Worldwide Express', prefix: 'SKY', color: 'bg-sky-600 text-white border-sky-700', badge: 'Skynet' },
];

const PACKAGING_OPTIONS = [
  { id: 'Customer Packaging', label: 'Customer Own Box / Packaging', maxWeight: 'Unlimited' },
  { id: 'DHL Envelope', label: 'Express Envelope (DOX - up to 0.5 kg)', maxWeight: '0.5 kg' },
  { id: 'DHL Flyer', label: 'Express Flyer / Pouch (up to 2 kg)', maxWeight: '2.0 kg' },
  { id: 'DHL Box 2', label: 'Express Box 2 (Small - up to 1.5 kg)', maxWeight: '1.5 kg' },
  { id: 'DHL Box 3', label: 'Express Box 3 (Medium - up to 3 kg)', maxWeight: '3.0 kg' },
  { id: 'DHL Box 4', label: 'Express Box 4 (Standard - up to 7 kg)', maxWeight: '7.0 kg' },
  { id: 'DHL Box 5', label: 'Express Box 5 (Large - up to 12 kg)', maxWeight: '12.0 kg' },
  { id: 'DHL Box 6', label: 'Express Box 6 (Extra Large - up to 18 kg)', maxWeight: '18.0 kg' },
  { id: 'DHL Box 7', label: 'Express Box 7 (Heavy - up to 25 kg)', maxWeight: '25.0 kg' },
  { id: 'DHL Box 8', label: 'Express Box 8 (Jumbo - up to 30 kg)', maxWeight: '30.0 kg' },
];

export const ExpressBillingForm: React.FC<ExpressBillingFormProps> = ({
  rates,
  invoices,
  editingInvoice,
  onSaveInvoice,
  onCancelEdit,
}) => {
  // Extract distinct countries
  const availableCountries = useMemo(() => {
    const list = Array.from(new Set(rates.map((r) => r.country.trim()))).sort();
    return list.length > 0 ? list : ['Australia', 'United States', 'United Kingdom', 'Japan', 'India', 'Canada', 'Germany', 'UAE'];
  }, [rates]);

  // Express Network & Service Selection
  const [serviceCategory, setServiceCategory] = useState<ServiceCategory>(
    editingInvoice?.service_category || 'DHL Express'
  );
  const [expressPackaging, setExpressPackaging] = useState<string>(
    editingInvoice?.express_packaging_type || 'Customer Packaging'
  );
  const [expressContentType, setExpressContentType] = useState<'DOCUMENTS' | 'NON_DOCUMENTS / PARCEL'>(
    editingInvoice?.express_content_type || 'NON_DOCUMENTS / PARCEL'
  );

  // Core Form Fields
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [awbNo, setAwbNo] = useState('');

  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [senderEmail, setSenderEmail] = useState('');

  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [receiverEmail, setReceiverEmail] = useState('');
  const [country, setCountry] = useState(availableCountries[0] || 'Australia');

  // Shipment Dimensions & Weights
  const [weight, setWeight] = useState<number>(2.5);
  const [boxCount, setBoxCount] = useState<number>(1);
  const [boxes, setBoxes] = useState<ParcelBox[]>([
    { id: 'box-exp-1', box_number: 1, weight_kg: 2.5, length_cm: 30, width_cm: 20, height_cm: 15 },
  ]);

  // Customs & Commercial Declaration
  const [declaredValue, setDeclaredValue] = useState<number>(50);
  const [declaredCurrency, setDeclaredCurrency] = useState<string>('USD');
  const [dutyTaxPayer, setDutyTaxPayer] = useState<'Receiver (DDU)' | 'Shipper (DDP)'>('Receiver (DDU)');
  const [pccNumber, setPccNumber] = useState('');

  // Medicine Section & Prescription Details
  const [hasMedicine, setHasMedicine] = useState<boolean>(false);
  const [prescriptionNo, setPrescriptionNo] = useState<string>('');
  const [prescriptionDoctor, setPrescriptionDoctor] = useState<string>('');
  const [medicineExtraCharge, setMedicineExtraCharge] = useState<number>(500);
  const [medicineNotes, setMedicineNotes] = useState<string>('');

  // Financial Overrides
  const [customRatePerKg, setCustomRatePerKg] = useState<number | null>(null);
  const [customDutyOverride, setCustomDutyOverride] = useState<number | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [customPurchaseAmount, setCustomPurchaseAmount] = useState<number | null>(null);
  const [meatExtraChargeOverride, setMeatExtraChargeOverride] = useState<number | null>(null);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Paid');
  const [onlineTransactionId, setOnlineTransactionId] = useState<string>('');

  // Items List
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: 'item-exp-1',
      item_name: 'Express Courier Shipment Goods',
      quantity: 1,
      item_type: 'Normal',
      weight_kg: null,
      box_number: 1,
    },
  ]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auto generate AWB tracking code on service change
  const generateExpressAwb = (category: ServiceCategory) => {
    const selected = EXPRESS_NETWORKS.find((n) => n.id === category) || EXPRESS_NETWORKS[0];
    const randomDigits = Math.floor(1000000000 + Math.random() * 9000000000);
    return `${selected.prefix}-${randomDigits}`;
  };

  // Initialize or Load Form
  useEffect(() => {
    if (editingInvoice) {
      setInvoiceNo(editingInvoice.invoice_no);
      setInvoiceDate(editingInvoice.invoice_date);
      setServiceCategory(editingInvoice.service_category || 'DHL Express');
      setExpressPackaging(editingInvoice.express_packaging_type || 'Customer Packaging');
      setExpressContentType(editingInvoice.express_content_type || 'NON_DOCUMENTS / PARCEL');
      setAwbNo(editingInvoice.awb_no || generateExpressAwb(editingInvoice.service_category || 'DHL Express'));
      setSenderName(editingInvoice.sender_name);
      setSenderPhone(editingInvoice.sender_phone || '');
      setSenderAddress(editingInvoice.sender_address || '');
      setSenderEmail(editingInvoice.sender_email || '');
      setReceiverName(editingInvoice.receiver_name);
      setReceiverPhone(editingInvoice.receiver_phone || editingInvoice.phone || '');
      setReceiverAddress(editingInvoice.receiver_address || '');
      setReceiverEmail(editingInvoice.receiver_email || '');
      setCountry(editingInvoice.country);
      setWeight(editingInvoice.weight);
      setBoxCount(editingInvoice.box_count);
      setDeclaredValue(editingInvoice.declared_customs_value || 50);
      setDeclaredCurrency(editingInvoice.declared_customs_currency || 'USD');
      setDutyTaxPayer(editingInvoice.duty_tax_payer || 'Receiver (DDU)');
      setPccNumber(editingInvoice.pcc_number || '');

      // Medicine fields
      const medItem = editingInvoice.items?.some((i) => i.item_type === 'Medicine');
      setHasMedicine(Boolean(medItem || editingInvoice.prescription_no || editingInvoice.medicine_extra_charge));
      setPrescriptionNo(editingInvoice.prescription_no || '');
      setPrescriptionDoctor(editingInvoice.prescription_doctor || '');
      setMedicineExtraCharge(editingInvoice.medicine_extra_charge || 500);

      if (editingInvoice.boxes && editingInvoice.boxes.length > 0) {
        setBoxes(editingInvoice.boxes);
      }
      if (editingInvoice.items && editingInvoice.items.length > 0) {
        setItems(editingInvoice.items);
      }
      setDiscountAmount(editingInvoice.discount_amount || 0);
      setCustomDutyOverride(editingInvoice.custom_duty_amount ?? null);
      setCustomRatePerKg(editingInvoice.rate_per_kg ?? null);
      setCustomPurchaseAmount(editingInvoice.purchase_amount ?? null);
      setMeatExtraChargeOverride(editingInvoice.meat_extra_charge ?? null);
      setPaymentMethod(editingInvoice.payment_method || 'Cash');
      setPaymentStatus(editingInvoice.payment_status || 'Paid');
      setOnlineTransactionId(editingInvoice.online_transaction_id || '');
    } else {
      setInvoiceNo(generateNextInvoiceNo(invoices));
      setAwbNo(generateExpressAwb('DHL Express'));
    }
  }, [editingInvoice]);

  // Handle Box Management
  const handleAddBox = () => {
    const newBoxNum = boxes.length + 1;
    const newBoxList: ParcelBox[] = [
      ...boxes,
      {
        id: `box-exp-${Date.now()}-${newBoxNum}`,
        box_number: newBoxNum,
        weight_kg: 2.5,
        length_cm: 30,
        width_cm: 20,
        height_cm: 15,
      },
    ];
    setBoxes(newBoxList);
    setBoxCount(newBoxList.length);
    recalcTotalWeight(newBoxList);
  };

  const handleRemoveBox = (index: number) => {
    if (boxes.length <= 1) return;
    const updated = boxes.filter((_, i) => i !== index).map((b, i) => ({ ...b, box_number: i + 1 }));
    setBoxes(updated);
    setBoxCount(updated.length);
    recalcTotalWeight(updated);
  };

  const handleBoxChange = (index: number, field: keyof ParcelBox, val: any) => {
    const copy = [...boxes];
    copy[index] = { ...copy[index], [field]: val === '' ? null : Number(val) };
    setBoxes(copy);
    recalcTotalWeight(copy);
  };

  const recalcTotalWeight = (boxArr: ParcelBox[]) => {
    const total = boxArr.reduce((acc, b) => {
      const act = Number(b.weight_kg) || 0;
      const vol = ((Number(b.length_cm) || 0) * (Number(b.width_cm) || 0) * (Number(b.height_cm) || 0)) / 5000;
      return acc + Math.max(act, vol);
    }, 0);
    setWeight(Math.max(0.5, Number(total.toFixed(2))));
  };

  // Add Item
  const handleAddItem = (type: ItemType = 'Normal') => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-exp-${Date.now()}-${prev.length + 1}`,
        item_name: type === 'Medicine' ? 'Prescribed Medication / Health Supplement' : '',
        quantity: 1,
        item_type: type,
        weight_kg: type !== 'Normal' ? 1 : null,
        box_number: 1,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setErrorMessage('At least one item row is required.');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
    setErrorMessage(null);
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, val: any) => {
    setItems((prev) => {
      const copy = [...prev];
      const it = { ...copy[index] };
      if (field === 'item_type') {
        it.item_type = val as ItemType;
        if (val === 'Medicine') {
          setHasMedicine(true);
          it.weight_kg = it.weight_kg || 1;
        } else if (val === 'Normal') {
          it.weight_kg = null;
        } else {
          it.weight_kg = it.weight_kg || 1;
        }
      } else if (field === 'quantity' || field === 'weight_kg') {
        it[field] = val === '' ? null : Number(val);
      } else {
        (it as any)[field] = val;
      }
      copy[index] = it;
      return copy;
    });
    setErrorMessage(null);
  };

  // Live calculation
  const liveCalculation = useMemo(() => {
    return calculateInvoice(
      rates,
      country,
      weight,
      boxCount,
      items,
      discountAmount,
      customDutyOverride,
      customRatePerKg,
      customPurchaseAmount,
      null,
      meatExtraChargeOverride,
      hasMedicine ? medicineExtraCharge : 0
    );
  }, [
    rates,
    country,
    weight,
    boxCount,
    items,
    discountAmount,
    customDutyOverride,
    customRatePerKg,
    customPurchaseAmount,
    meatExtraChargeOverride,
    hasMedicine,
    medicineExtraCharge,
  ]);

  // Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!senderName.trim()) {
      setErrorMessage('Sender full name is required.');
      return;
    }
    if (!senderPhone.trim()) {
      setErrorMessage('Sender mobile number is required.');
      return;
    }
    if (!receiverName.trim()) {
      setErrorMessage('Receiver full name is required.');
      return;
    }
    if (!receiverPhone.trim()) {
      setErrorMessage('Receiver contact phone is required.');
      return;
    }
    if (weight <= 0) {
      setErrorMessage('Total chargeable weight must be greater than 0 kg.');
      return;
    }

    if (hasMedicine && !prescriptionNo.trim()) {
      setErrorMessage('Please enter Doctor Prescription / Rx number for the medicine shipment.');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      if (!items[i].item_name.trim()) {
        setErrorMessage(`Item #${i + 1} description cannot be empty.`);
        return;
      }
    }

    const calc = liveCalculation;
    if (!calc.isValid || !calc.result) {
      setErrorMessage(calc.error || 'Invoice calculation failed. Please review rates.');
      return;
    }

    const {
      saleAmount,
      totalPurchase,
      profitAmount,
      customDuty,
      meatExtraCharge,
      medicineExtraCharge: finalMedCharge,
      discountAmount: finalDiscount,
      effectiveRatePerKg,
    } = calc.result;

    const finalInvoiceNo = editingInvoice ? editingInvoice.invoice_no : generateNextInvoiceNo(invoices);
    const finalAwb = awbNo.trim() || generateExpressAwb(serviceCategory);

    const savedInvoice: Invoice = {
      id: editingInvoice ? editingInvoice.id : `inv-exp-${Date.now()}`,
      invoice_no: finalInvoiceNo,
      invoice_date: invoiceDate,
      service_category: serviceCategory,
      express_packaging_type: expressPackaging,
      express_content_type: expressContentType,
      declared_customs_value: Number(declaredValue) || 50,
      declared_customs_currency: declaredCurrency,
      duty_tax_payer: dutyTaxPayer,
      pcc_number: pccNumber.trim() || undefined,
      prescription_no: hasMedicine ? prescriptionNo.trim() : undefined,
      prescription_doctor: hasMedicine ? prescriptionDoctor.trim() : undefined,
      medicine_extra_charge: hasMedicine ? Number(finalMedCharge || medicineExtraCharge) : undefined,
      shipper_id: 'shipper-sadobato',
      shipper_name: 'The Courier Station Sadobato',
      shipper_code: 'CSS-SDB',
      shipper_phone: '+977-1-5544332',
      shipper_email: 'info@courierstationsadobato.com',
      shipper_address: 'Sadobato, Lalitpur / Kathmandu, Nepal',
      shipper_tax_id: 'PAN: 601234567',
      sender_name: senderName.trim(),
      sender_phone: senderPhone.trim(),
      sender_address: senderAddress.trim() || undefined,
      sender_email: senderEmail.trim() || undefined,
      receiver_name: receiverName.trim(),
      receiver_phone: receiverPhone.trim(),
      receiver_address: receiverAddress.trim() || undefined,
      receiver_email: receiverEmail.trim() || undefined,
      phone: receiverPhone.trim() || '+977-9800000000',
      country: country.trim(),
      transport_type: 'Air',
      weight: Number(weight),
      box_count: Number(boxCount),
      boxes: boxes.map((b) => ({ ...b })),
      departure: 'KTM TIA / International Express Hub',
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
      awb_no: finalAwb,
      status: editingInvoice ? (editingInvoice.status || 'Billed') : 'Billed',
      dispatch_date: editingInvoice?.dispatch_date,
      dispatch_notes: editingInvoice?.dispatch_notes,
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

    setSuccessMessage(
      editingInvoice
        ? `Express Invoice ${finalInvoiceNo} (${serviceCategory}) updated successfully!`
        : `Express Invoice ${finalInvoiceNo} (${serviceCategory} • AWB: ${finalAwb}) created successfully!`
    );

    if (!editingInvoice) {
      setSenderName('');
      setSenderPhone('');
      setSenderAddress('');
      setSenderEmail('');
      setReceiverName('');
      setReceiverPhone('');
      setReceiverAddress('');
      setReceiverEmail('');
      setPrescriptionNo('');
      setPrescriptionDoctor('');
      setHasMedicine(false);
      setAwbNo(generateExpressAwb(serviceCategory));
      setInvoiceNo(generateNextInvoiceNo(invoices));
    }
  };

  const activeNetwork = EXPRESS_NETWORKS.find((n) => n.id === serviceCategory) || EXPRESS_NETWORKS[0];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 rounded-2xl p-6 text-slate-950 shadow-md border border-amber-400/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center shadow-md shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-950">
                  DHL & Express Service Invoice
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-950 text-amber-300 uppercase tracking-wide">
                  Global Express
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-900 font-medium mt-0.5">
                Worldwide Door-to-Door Courier, Documents & Medicine Express Clearance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-950/10 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-slate-950/20 text-right">
              <span className="text-[11px] font-bold uppercase text-slate-900 block">Invoice Number</span>
              <span className="font-mono text-sm sm:text-base font-black text-slate-950">
                {editingInvoice ? editingInvoice.invoice_no : (invoiceNo || 'INV-EXP-NEW')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error & Success Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-bold">Please check form details:</strong>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-3 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-bold">Success!</strong>
            <p className="mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Express Courier Carrier & Service Level Selection */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-600" />
              <span>1. Select Express Courier Carrier & Packaging</span>
            </h3>
            <span className="text-xs text-slate-500">Fast tracking & airwaybill assignment</span>
          </div>

          {/* Carrier Network Radio Pills */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Express Carrier Network:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {EXPRESS_NETWORKS.map((network) => {
                const isSelected = serviceCategory === network.id;
                return (
                  <button
                    key={network.id}
                    type="button"
                    onClick={() => {
                      setServiceCategory(network.id);
                      if (!editingInvoice) {
                        setAwbNo(generateExpressAwb(network.id));
                      }
                    }}
                    className={`p-3 rounded-xl border text-left transition relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/70 shadow-xs ring-2 ring-amber-400/40'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase mb-1.5 ${network.color}`}>
                        {network.badge}
                      </span>
                      <p className="text-xs font-bold text-slate-900 leading-snug">{network.name}</p>
                    </div>
                    {isSelected && (
                      <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-amber-700">
                        <CheckCircle2 className="w-3 h-3" /> Selected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Express Waybill / AWB & Packaging Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Barcode className="w-3.5 h-3.5 text-amber-600" />
                Airway Bill / Tracking Code (AWB #)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={awbNo}
                  onChange={(e) => setAwbNo(e.target.value)}
                  placeholder="e.g. DHL-9482019482"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 font-mono text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setAwbNo(generateExpressAwb(serviceCategory))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded text-[10px] font-bold transition"
                >
                  Generate
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Packaging Format:
              </label>
              <select
                value={expressPackaging}
                onChange={(e) => setExpressPackaging(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-hidden"
              >
                {PACKAGING_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Content Classification:
              </label>
              <select
                value={expressContentType}
                onChange={(e) => setExpressContentType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-hidden"
              >
                <option value="NON_DOCUMENTS / PARCEL">Non-Documents / Commercial Parcel (WPX)</option>
                <option value="DOCUMENTS">Documents / Personal Papers (DOX)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Step 2: Sender & Receiver Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SENDER CARD */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-amber-600" />
                <span>Shipper / Sender (Nepal)</span>
              </h4>
              <span className="text-[11px] font-bold text-slate-400 uppercase">From</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Sender Full Name *
              </label>
              <input
                type="text"
                required
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="e.g. Ramesh Gurung"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1 text-emerald-700">
                <Phone className="w-3 h-3 text-emerald-600" />
                Sender Mobile Number (For Tracking Updates) *
              </label>
              <input
                type="tel"
                required
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                placeholder="e.g. 9856012345 / +977-9801234567"
                className="w-full px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50/30 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Sender Address & City
              </label>
              <input
                type="text"
                value={senderAddress}
                onChange={(e) => setSenderAddress(e.target.value)}
                placeholder="e.g. New Road, Pokhara, Kaski, Nepal"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-amber-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Sender Email (Optional)
              </label>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="e.g. ramesh@example.com"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-amber-500 outline-hidden"
              />
            </div>
          </div>

          {/* RECEIVER CARD */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600" />
                <span>Consignee / Receiver (Worldwide)</span>
              </h4>
              <span className="text-[11px] font-bold text-slate-400 uppercase">To Destination</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Receiver Full Name *
              </label>
              <input
                type="text"
                required
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                placeholder="e.g. John Doe / Suman Sharma"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1 text-emerald-700">
                <Phone className="w-3 h-3 text-emerald-600" />
                Receiver Mobile / Contact Phone *
              </label>
              <input
                type="tel"
                required
                value={receiverPhone}
                onChange={(e) => setReceiverPhone(e.target.value)}
                placeholder="e.g. +61 412 345 678 / +1 415 555 2671"
                className="w-full px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50/30 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Destination Country *
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
                >
                  {availableCountries.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Customs PCC / Tax ID
                </label>
                <input
                  type="text"
                  value={pccNumber}
                  onChange={(e) => setPccNumber(e.target.value)}
                  placeholder="e.g. P123456789012"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Full Street Delivery Address, Postal Code & City
              </label>
              <input
                type="text"
                value={receiverAddress}
                onChange={(e) => setReceiverAddress(e.target.value)}
                placeholder="e.g. 142 George St, Sydney NSW 2000, Australia"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Step 3: Medicine & Prescription Section (CRITICAL NEW FEATURE) */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Medicine & Doctor's Prescription Documents (Rx Clearance)
                </h3>
                <p className="text-xs text-slate-500">
                  Special airport quarantine clearance & doctor prescription verification
                </p>
              </div>
            </div>

            {/* Toggle Medicine Mode */}
            <label className="flex items-center gap-2 cursor-pointer select-none bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200 hover:bg-teal-100/70 transition">
              <input
                type="checkbox"
                checked={hasMedicine}
                onChange={(e) => {
                  setHasMedicine(e.target.checked);
                  if (e.target.checked && !items.some((i) => i.item_type === 'Medicine')) {
                    handleAddItem('Medicine');
                  }
                }}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
              />
              <span className="text-xs font-bold text-teal-900">Contains Medicine / Rx</span>
            </label>
          </div>

          {hasMedicine ? (
            <div className="bg-teal-50/50 rounded-xl p-4 border border-teal-200/80 space-y-3.5 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-teal-950 uppercase mb-1">
                    Doctor / Hospital / Clinic Name *
                  </label>
                  <input
                    type="text"
                    value={prescriptionDoctor}
                    onChange={(e) => setPrescriptionDoctor(e.target.value)}
                    placeholder="e.g. Dr. Sharma Clinic / Gandaki Hospital"
                    className="w-full px-3.5 py-2 rounded-lg border border-teal-300 bg-white text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-teal-950 uppercase mb-1">
                    Doctor's Prescription / Rx No. *
                  </label>
                  <input
                    type="text"
                    value={prescriptionNo}
                    onChange={(e) => setPrescriptionNo(e.target.value)}
                    placeholder="e.g. RX-2025-09823"
                    className="w-full px-3.5 py-2 rounded-lg border border-teal-300 bg-white font-mono text-sm font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-teal-950 uppercase mb-1">
                    Medicine Extra Handling Fee (Rs)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={medicineExtraCharge}
                    onChange={(e) => setMedicineExtraCharge(Number(e.target.value) || 0)}
                    placeholder="500"
                    className="w-full px-3.5 py-2 rounded-lg border border-teal-300 bg-white font-mono text-sm font-bold text-slate-900 focus:ring-2 focus:ring-teal-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-teal-950 uppercase mb-1">
                  Extra About Medicine / Form / Composition / Dosage Notes
                </label>
                <input
                  type="text"
                  value={medicineNotes}
                  onChange={(e) => setMedicineNotes(e.target.value)}
                  placeholder="e.g. 3 months personal supply, Tablets & Herbal syrup in sealed blister packs with original doctor prescription copy"
                  className="w-full px-3.5 py-2 rounded-lg border border-teal-300 bg-white text-xs text-slate-800 focus:ring-2 focus:ring-teal-500 outline-hidden"
                />
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              No medicine items flagged. Check "Contains Medicine / Rx" above if shipping tablets, syrups, or healthcare prescriptions.
            </p>
          )}
        </div>

        {/* Step 4: Weight & Parcel Dimensions */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-600" />
              <span>4. Shipment Weight & Dimensions</span>
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
                Total Chargeable Weight: <strong className="text-amber-700 font-mono text-sm">{weight} kg</strong>
              </span>
              <button
                type="button"
                onClick={handleAddBox}
                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Box
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {boxes.map((box, idx) => {
              const act = Number(box.weight_kg) || 0;
              const vol = ((Number(box.length_cm) || 0) * (Number(box.width_cm) || 0) * (Number(box.height_cm) || 0)) / 5000;
              const boxChargeable = Math.max(act, vol);

              return (
                <div key={box.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-wrap items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center shrink-0">
                    #{idx + 1}
                  </span>

                  <div className="flex-1 min-w-[110px]">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Scale Wt (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={box.weight_kg || ''}
                      onChange={(e) => handleBoxChange(idx, 'weight_kg', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs font-bold text-slate-900"
                    />
                  </div>

                  <div className="flex-1 min-w-[80px]">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">L (cm)</label>
                    <input
                      type="number"
                      min="1"
                      value={box.length_cm || ''}
                      onChange={(e) => handleBoxChange(idx, 'length_cm', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs text-slate-900"
                    />
                  </div>

                  <div className="flex-1 min-w-[80px]">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">W (cm)</label>
                    <input
                      type="number"
                      min="1"
                      value={box.width_cm || ''}
                      onChange={(e) => handleBoxChange(idx, 'width_cm', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs text-slate-900"
                    />
                  </div>

                  <div className="flex-1 min-w-[80px]">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">H (cm)</label>
                    <input
                      type="number"
                      min="1"
                      value={box.height_cm || ''}
                      onChange={(e) => handleBoxChange(idx, 'height_cm', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs text-slate-900"
                    />
                  </div>

                  <div className="text-right px-2 min-w-[100px]">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Vol Wt: {vol.toFixed(2)} kg</span>
                    <span className="text-xs font-bold text-slate-800 font-mono">Billed: {boxChargeable.toFixed(2)} kg</span>
                  </div>

                  {boxes.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveBox(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 5: Item Manifest & Commodity List */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-600" />
              <span>5. Express Customs Commodity Manifest</span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAddItem('Medicine')}
                className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 rounded-lg text-xs font-bold transition flex items-center gap-1"
              >
                <Pill className="w-3.5 h-3.5 text-teal-700" /> + Add Medicine
              </button>
              <button
                type="button"
                onClick={() => handleAddItem('Normal')}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> + Add Item
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {items.map((it, idx) => (
              <div key={it.id || idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-slate-400 w-5">#{idx + 1}</span>

                <div className="flex-2 min-w-[180px]">
                  <input
                    type="text"
                    required
                    value={it.item_name}
                    onChange={(e) => handleItemChange(idx, 'item_name', e.target.value)}
                    placeholder="e.g. Documents / Garments / Prescribed Ayurvedic Medicine"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-hidden"
                  />
                </div>

                <div className="w-20">
                  <input
                    type="number"
                    min="1"
                    value={it.quantity || 1}
                    onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                    placeholder="Qty"
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs text-center text-slate-900"
                  />
                </div>

                <div className="w-32">
                  <select
                    value={it.item_type}
                    onChange={(e) => handleItemChange(idx, 'item_type', e.target.value)}
                    className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-bold outline-hidden ${
                      it.item_type === 'Medicine'
                        ? 'border-teal-400 bg-teal-50 text-teal-900'
                        : it.item_type === 'Meat' || it.item_type === 'Dry Meat' || it.item_type === 'Pickle'
                        ? 'border-amber-400 bg-amber-50 text-amber-900'
                        : 'border-slate-300 bg-white text-slate-800'
                    }`}
                  >
                    <option value="Normal">Normal</option>
                    <option value="Medicine">Medicine / Rx</option>
                    <option value="Meat">Meat</option>
                    <option value="Dry Meat">Dry Meat / Sukuti</option>
                    <option value="Pickle">Pickle / Achar</option>
                  </select>
                </div>

                {it.item_type !== 'Normal' && (
                  <div className="w-24">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={it.weight_kg || ''}
                      onChange={(e) => handleItemChange(idx, 'weight_kg', e.target.value)}
                      placeholder="Wt (kg)"
                      className="w-full px-2 py-1.5 rounded-lg border border-amber-300 bg-amber-50 font-mono text-xs font-bold text-amber-950"
                    />
                  </div>
                )}

                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition ml-auto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 6: Commercial Customs Valuation & Terms */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>Customs Commercial Invoice Declaration</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Declared Customs Value
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  value={declaredValue}
                  onChange={(e) => setDeclaredValue(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm font-bold text-slate-900"
                />
                <select
                  value={declaredCurrency}
                  onChange={(e) => setDeclaredCurrency(e.target.value)}
                  className="px-2.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="AUD">AUD ($)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="NPR">NPR (Rs)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Duty / Tax Payer Terms
              </label>
              <select
                value={dutyTaxPayer}
                onChange={(e) => setDutyTaxPayer(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900"
              >
                <option value="Receiver (DDU)">Receiver Pays Duty (DDU / DAP)</option>
                <option value="Shipper (DDP)">Shipper Pays Duty (DDP)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Payment Status
              </label>
              <div className="flex gap-2">
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800"
                >
                  <option value="Cash">Cash</option>
                  <option value="eSewa">eSewa</option>
                  <option value="Khalti">Khalti</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Card">Card</option>
                </select>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as any)}
                  className={`w-full px-2.5 py-2 rounded-xl border text-xs font-bold ${
                    paymentStatus === 'Paid'
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'border-rose-300 bg-rose-50 text-rose-800'
                  }`}
                >
                  <option value="Paid">Paid</option>
                  <option value="Unpaid">Unpaid</option>
                  <option value="Partial">Partial</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Live Calculation & Save Action Card */}
        {liveCalculation.result && (
          <div className="bg-slate-950 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                  Express Calculation Summary • {serviceCategory}
                </span>
                <p className="text-sm text-slate-300 mt-0.5">
                  Destination: <strong className="text-white">{country}</strong> • Billed Weight:{' '}
                  <strong className="text-white">{weight} kg</strong>
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 uppercase">Final Total Payable</span>
                <p className="text-2xl sm:text-3xl font-black font-mono text-amber-400">
                  {formatCurrency(liveCalculation.result.finalAmount)}
                </p>
              </div>
            </div>

            {/* Financial Details Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">Base Express Rate:</span>
                <strong className="text-sm font-mono text-white">
                  {formatCurrency(liveCalculation.result.effectiveRatePerKg)} / kg
                </strong>
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">Customs Duty Fee:</span>
                <strong className="text-sm font-mono text-white">
                  {formatCurrency(liveCalculation.result.customDuty)}
                </strong>
              </div>

              {hasMedicine && (
                <div className="bg-teal-950/80 p-3 rounded-xl border border-teal-800 text-teal-200">
                  <span className="text-teal-300 block mb-1">Medicine Handling:</span>
                  <strong className="text-sm font-mono text-teal-100">
                    +{formatCurrency(liveCalculation.result.medicineExtraCharge || 0)}
                  </strong>
                </div>
              )}

              <div className="bg-emerald-950/80 p-3 rounded-xl border border-emerald-800 text-emerald-200">
                <span className="text-emerald-300 block mb-1">Net Station Margin:</span>
                <strong className="text-sm font-mono text-emerald-300">
                  +{formatCurrency(liveCalculation.result.profitAmount)}
                </strong>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              {onCancelEdit && (
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 text-sm font-bold transition"
                >
                  Cancel Edit
                </button>
              )}
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-sm font-black uppercase tracking-wider transition shadow-lg flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingInvoice ? 'Update Express Invoice' : 'Create & Save Express Invoice'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
