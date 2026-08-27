import React, { useState, useEffect, useMemo } from 'react';
import { Invoice, InvoiceItem, Rate, ItemType, TransportType, ParcelBox, PaymentMethod, PaymentStatus } from '../types';
import { calculateInvoice, formatCurrency, isAustraliaCountry } from '../lib/rateCalculator';
import { generateNextInvoiceNo } from '../lib/storage';
import { InvoiceDetail } from './InvoiceDetail';
import { EasyBillingWizard } from './EasyBillingWizard';
import { QuickGuideModal } from './QuickGuideModal';
import {
  Plus,
  Trash2,
  Save,
  AlertCircle,
  CheckCircle2,
  Package,
  Plane,
  Scale,
  Calendar,
  User,
  Phone,
  Globe,
  MapPin,
  RefreshCw,
  Eye,
  X,
  Camera,
  Upload,
  Shield,
  Image as ImageIcon,
  FileText,
  CreditCard,
  QrCode,
  Banknote,
  Landmark,
  Boxes,
  LayoutGrid,
  ListFilter,
  Sparkles,
  HelpCircle,
  Mail,
  Info,
} from 'lucide-react';

interface BillingFormProps {
  rates: Rate[];
  invoices: Invoice[];
  editingInvoice?: Invoice | null;
  onSaveInvoice: (invoice: Invoice) => void;
  onCancelEdit?: () => void;
}

export const BillingForm: React.FC<BillingFormProps> = ({
  rates,
  invoices,
  editingInvoice,
  onSaveInvoice,
  onCancelEdit,
}) => {
  // Extract distinct countries from rates table
  const availableCountries = useMemo(() => {
    const list = Array.from(new Set(rates.map((r) => r.country.trim()))).sort();
    return list.length > 0 ? list : ['Australia', 'United States', 'United Kingdom', 'Japan', 'India'];
  }, [rates]);

  // Form State
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [receiverEmail, setReceiverEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState(availableCountries[0] || 'Australia');
  const [transportType, setTransportType] = useState<TransportType>('Air');
  const [weight, setWeight] = useState<number>(10);
  const [boxCount, setBoxCount] = useState<number>(1);

  // Multi-Box Breakdown State
  const [boxes, setBoxes] = useState<ParcelBox[]>([
    { id: 'box-1', box_number: 1, weight_kg: 10, length_cm: 40, width_cm: 30, height_cm: 30 },
  ]);

  const [departure, setDeparture] = useState('KTM - TIA Flight');
  const [portOfLoading, setPortOfLoading] = useState('Kathmandu, Nepal');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [customDutyOverride, setCustomDutyOverride] = useState<number | null>(null);
  const [customRatePerKg, setCustomRatePerKg] = useState<number | null>(null);
  const [customPurchaseAmount, setCustomPurchaseAmount] = useState<number | null>(null);
  const [customTotalSale, setCustomTotalSale] = useState<number | null>(null);
  const [meatExtraChargeOverride, setMeatExtraChargeOverride] = useState<number | null>(null);

  // South Korea Special Customs & Passport Photo State
  const [pccNumber, setPccNumber] = useState('');
  const [passportPhotoUrl, setPassportPhotoUrl] = useState('');

  // Payment Method & Status State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Paid');
  const [onlineTransactionId, setOnlineTransactionId] = useState('');

  // Form Mode: 'easy' (3-step wizard) vs 'advanced' (full sheet)
  const [formMode, setFormMode] = useState<'easy' | 'advanced'>('easy');
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Live Customer Bill Preview Modal State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [draftInvoice, setDraftInvoice] = useState<Invoice | null>(null);

  const handlePassportUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('Passport photo image size must be less than 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPassportPhotoUrl(reader.result as string);
        setErrorMessage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Add Box Handler
  const handleAddBox = () => {
    const uniqueBoxTag = Math.random().toString(36).substring(2, 7);
    const uniqueItemTag = Math.random().toString(36).substring(2, 7);
    let assignedBoxNum = 1;

    setBoxes((prev) => {
      assignedBoxNum = prev.length + 1;
      const newBoxList = [
        ...prev,
        {
          id: `box-${Date.now()}-${uniqueBoxTag}-${assignedBoxNum}`,
          box_number: assignedBoxNum,
          weight_kg: 10,
          length_cm: 40,
          width_cm: 30,
          height_cm: 30,
        },
      ];
      setBoxCount(newBoxList.length);
      // Auto sum total weight (higher of actual vs volumetric per box)
      const totalBoxWeight = newBoxList.reduce((acc, b) => {
        const act = Number(b.weight_kg) || 0;
        const vol = ((Number(b.length_cm) || 0) * (Number(b.width_cm) || 0) * (Number(b.height_cm) || 0)) / 5000;
        return acc + Math.max(act, vol);
      }, 0);
      setWeight(Math.max(1, Number(totalBoxWeight.toFixed(2))));
      return newBoxList;
    });

    // Automatically add a shipment item row for this newly added box!
    setItems((prevItems) => [
      ...prevItems,
      {
        id: `item-${Date.now()}-${uniqueItemTag}-${prevItems.length + 1}`,
        item_name: '',
        quantity: 1,
        item_type: 'Normal',
        weight_kg: null,
        box_number: assignedBoxNum,
      },
    ]);
  };

  const handleRemoveBox = (index: number) => {
    if (boxes.length <= 1) return;
    setBoxes((prev) => {
      const updated = prev.filter((_, i) => i !== index).map((b, i) => ({ ...b, box_number: i + 1 }));
      setBoxCount(updated.length);
      const totalBoxWeight = updated.reduce((acc, b) => {
        const act = Number(b.weight_kg) || 0;
        const vol = ((Number(b.length_cm) || 0) * (Number(b.width_cm) || 0) * (Number(b.height_cm) || 0)) / 5000;
        return acc + Math.max(act, vol);
      }, 0);
      setWeight(Math.max(1, Number(totalBoxWeight.toFixed(2))));
      return updated;
    });
  };

  const handleBoxChange = (index: number, field: keyof ParcelBox, value: any) => {
    setBoxes((prev) => {
      const copy = [...prev];
      const box = { ...copy[index] };
      (box as any)[field] = value === '' ? null : Number(value);
      copy[index] = box;

      if (['weight_kg', 'length_cm', 'width_cm', 'height_cm'].includes(field as string)) {
        const totalBoxWeight = copy.reduce((acc, b) => {
          const act = Number(b.weight_kg) || 0;
          const vol = ((Number(b.length_cm) || 0) * (Number(b.width_cm) || 0) * (Number(b.height_cm) || 0)) / 5000;
          return acc + Math.max(act, vol);
        }, 0);
        setWeight(Math.max(1, Number(totalBoxWeight.toFixed(2))));
      }
      return copy;
    });
  };

  // Repeatable Items
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: 'init-1',
      item_name: 'Handicraft & General Goods',
      quantity: 1,
      item_type: 'Normal',
      weight_kg: null,
    },
  ]);

  // View mode state for Box items
  const [itemDisplayMode, setItemDisplayMode] = useState<'boxes' | 'flat'>('boxes');
  const [selectedBoxFilter, setSelectedBoxFilter] = useState<number | 'all'>('all');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Initialize or Load Form Draft
  useEffect(() => {
    if (editingInvoice) {
      setInvoiceNo(editingInvoice.invoice_no);
      setInvoiceDate(editingInvoice.invoice_date);
      setSenderName(editingInvoice.sender_name);
      setSenderPhone(editingInvoice.sender_phone || '');
      setSenderAddress(editingInvoice.sender_address || '');
      setSenderEmail(editingInvoice.sender_email || '');
      setReceiverName(editingInvoice.receiver_name);
      setReceiverAddress(editingInvoice.receiver_address || '');
      setReceiverEmail(editingInvoice.receiver_email || '');
      setPhone(editingInvoice.receiver_phone || editingInvoice.phone || '');
      setCountry(editingInvoice.country);
      setTransportType(editingInvoice.transport_type);
      setWeight(editingInvoice.weight);
      setBoxCount(editingInvoice.box_count);
      setDeparture(editingInvoice.departure);
      setPortOfLoading(editingInvoice.port_of_loading || 'Kathmandu, Nepal');
      setDiscountAmount(editingInvoice.discount_amount || 0);
      setCustomDutyOverride(editingInvoice.custom_duty_amount ?? null);
      setCustomRatePerKg(editingInvoice.rate_per_kg ?? null);
      setCustomPurchaseAmount(editingInvoice.purchase_amount ?? null);
      setCustomTotalSale(null);
      setMeatExtraChargeOverride(editingInvoice.meat_extra_charge ?? null);
      setPccNumber(editingInvoice.pcc_number || '');
      setPassportPhotoUrl(editingInvoice.passport_photo_url || '');
      setPaymentMethod(editingInvoice.payment_method || 'Cash');
      setPaymentStatus(editingInvoice.payment_status || 'Paid');
      setOnlineTransactionId(editingInvoice.online_transaction_id || '');

      // Load boxes state
      if (editingInvoice.boxes && editingInvoice.boxes.length > 0) {
        setBoxes(editingInvoice.boxes.map((b) => ({ ...b })));
      } else {
        const count = editingInvoice.box_count || 1;
        const initialBoxes: ParcelBox[] = [];
        const perBoxWt = Math.max(1, Number((editingInvoice.weight / count).toFixed(2)));
        for (let i = 1; i <= count; i++) {
          initialBoxes.push({
            id: `box-edit-${i}`,
            box_number: i,
            weight_kg: perBoxWt,
            length_cm: 40,
            width_cm: 30,
            height_cm: 30,
          });
        }
        setBoxes(initialBoxes);
      }

      setItems(
        editingInvoice.items && editingInvoice.items.length > 0
          ? editingInvoice.items.map((it, idx) => ({
              ...it,
              id: it.id || `item-edit-${Date.now()}-${idx}`,
              box_number: it.box_number || 1,
            }))
          : [{ id: `item-edit-${Date.now()}-1`, item_name: '', quantity: 1, item_type: 'Normal', weight_kg: null, box_number: 1 }]
      );
    } else {
      // Try loading saved draft from localStorage
      try {
        const savedDraft = localStorage.getItem('csp_billing_draft');
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed.senderName !== undefined) setSenderName(parsed.senderName);
          if (parsed.senderPhone !== undefined) setSenderPhone(parsed.senderPhone);
          if (parsed.senderAddress !== undefined) setSenderAddress(parsed.senderAddress);
          if (parsed.senderEmail !== undefined) setSenderEmail(parsed.senderEmail);
          if (parsed.receiverName !== undefined) setReceiverName(parsed.receiverName);
          if (parsed.receiverAddress !== undefined) setReceiverAddress(parsed.receiverAddress);
          if (parsed.receiverEmail !== undefined) setReceiverEmail(parsed.receiverEmail);
          if (parsed.phone !== undefined) setPhone(parsed.phone);
          if (parsed.country !== undefined) setCountry(parsed.country);
          if (parsed.transportType !== undefined) setTransportType(parsed.transportType);
          if (parsed.weight !== undefined) setWeight(parsed.weight);
          if (parsed.boxCount !== undefined) setBoxCount(parsed.boxCount);
          if (parsed.boxes !== undefined && Array.isArray(parsed.boxes)) setBoxes(parsed.boxes);
          if (parsed.items !== undefined && Array.isArray(parsed.items)) setItems(parsed.items);
          if (parsed.departure !== undefined) setDeparture(parsed.departure);
          if (parsed.portOfLoading !== undefined) setPortOfLoading(parsed.portOfLoading);
          if (parsed.discountAmount !== undefined) setDiscountAmount(parsed.discountAmount);
          if (parsed.customDutyOverride !== undefined) setCustomDutyOverride(parsed.customDutyOverride);
          if (parsed.customRatePerKg !== undefined) setCustomRatePerKg(parsed.customRatePerKg);
          if (parsed.customPurchaseAmount !== undefined) setCustomPurchaseAmount(parsed.customPurchaseAmount);
          if (parsed.customTotalSale !== undefined) setCustomTotalSale(parsed.customTotalSale);
          if (parsed.meatExtraChargeOverride !== undefined) setMeatExtraChargeOverride(parsed.meatExtraChargeOverride);
          if (parsed.pccNumber !== undefined) setPccNumber(parsed.pccNumber);
          if (parsed.passportPhotoUrl !== undefined) setPassportPhotoUrl(parsed.passportPhotoUrl);
          if (parsed.paymentMethod !== undefined) setPaymentMethod(parsed.paymentMethod);
          if (parsed.paymentStatus !== undefined) setPaymentStatus(parsed.paymentStatus);
          if (parsed.onlineTransactionId !== undefined) setOnlineTransactionId(parsed.onlineTransactionId);
        }
      } catch (e) {
        console.error('Failed to load billing draft:', e);
      }
      setInvoiceNo(generateNextInvoiceNo(invoices));
    }
  }, [editingInvoice]);

  // Auto-save form draft to localStorage when user modifies fields
  useEffect(() => {
    if (!editingInvoice) {
      const draft = {
        senderName,
        senderPhone,
        senderAddress,
        senderEmail,
        receiverName,
        receiverAddress,
        receiverEmail,
        phone,
        country,
        transportType,
        weight,
        boxCount,
        boxes,
        items,
        departure,
        portOfLoading,
        discountAmount,
        customDutyOverride,
        customRatePerKg,
        customPurchaseAmount,
        customTotalSale,
        meatExtraChargeOverride,
        pccNumber,
        passportPhotoUrl,
        paymentMethod,
        paymentStatus,
        onlineTransactionId,
      };
      try {
        localStorage.setItem('csp_billing_draft', JSON.stringify(draft));
      } catch (e) {}
    }
  }, [
    editingInvoice,
    senderName,
    senderPhone,
    senderAddress,
    senderEmail,
    receiverName,
    receiverAddress,
    receiverEmail,
    phone,
    country,
    transportType,
    weight,
    boxCount,
    boxes,
    items,
    departure,
    portOfLoading,
    discountAmount,
    customDutyOverride,
    customRatePerKg,
    customPurchaseAmount,
    customTotalSale,
    meatExtraChargeOverride,
    pccNumber,
    passportPhotoUrl,
    paymentMethod,
    paymentStatus,
    onlineTransactionId,
  ]);

  const handleResetForm = () => {
    try {
      localStorage.removeItem('csp_billing_draft');
    } catch (e) {}
    setInvoiceNo(generateNextInvoiceNo(invoices));
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setSenderName('');
    setSenderAddress('');
    setSenderEmail('');
    setReceiverName('');
    setReceiverAddress('');
    setReceiverEmail('');
    setPhone('');
    setPccNumber('');
    setPassportPhotoUrl('');
    if (availableCountries.length > 0) {
      setCountry(availableCountries[0]);
    }
    setDeparture('Kathmandu (KTM)');
    setTransportType('Air');
    setWeight(10);
    setBoxCount(1);
    setBoxes([
      { id: 'box-1', box_number: 1, weight_kg: 10, length_cm: 40, width_cm: 30, height_cm: 30 },
    ]);
    setPortOfLoading('Kathmandu, Nepal');
    setDiscountAmount(0);
    setCustomDutyOverride(null);
    setCustomRatePerKg(null);
    setCustomPurchaseAmount(null);
    setCustomTotalSale(null);
    setMeatExtraChargeOverride(null);
    setPaymentMethod('Cash');
    setPaymentStatus('Paid');
    setOnlineTransactionId('');
    setItems([
      {
        id: `item-${Date.now()}-1`,
        item_name: '',
        quantity: 1,
        item_type: 'Normal',
        weight_kg: null,
        box_number: 1,
      },
    ]);
    setErrorMessage(null);
    setSuccessMessage('Billing form draft reset. Ready for a new invoice.');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Live calculation preview
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
      customTotalSale,
      meatExtraChargeOverride
    );
  }, [rates, country, weight, boxCount, items, discountAmount, customDutyOverride, customRatePerKg, customPurchaseAmount, customTotalSale, meatExtraChargeOverride]);

  // Add Item Row
  const handleAddItem = (targetBoxNumber?: number) => {
    const uniqueTag = Math.random().toString(36).substring(2, 7);
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${uniqueTag}-${prev.length + 1}`,
        item_name: '',
        quantity: 1,
        item_type: 'Normal',
        weight_kg: null,
        box_number: targetBoxNumber || (boxes.length > 0 ? boxes[boxes.length - 1].box_number : 1),
      },
    ]);
  };

  // Remove Item Row
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setErrorMessage('An invoice must have at least one item row.');
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
    setErrorMessage(null);
  };

  // Helper to sync box weight from parcel boxes
  const syncShipmentWeight = (updatedItems: InvoiceItem[], updatedBoxes: ParcelBox[]) => {
    const boxTotal = updatedBoxes.reduce((acc, b) => {
      const act = Number(b.weight_kg) || 0;
      const vol = ((Number(b.length_cm) || 0) * (Number(b.width_cm) || 0) * (Number(b.height_cm) || 0)) / 5000;
      return acc + Math.max(act, vol);
    }, 0);

    if (boxTotal > 0) {
      setWeight(Math.max(1, Number(boxTotal.toFixed(2))));
    }
  };

  // Item Field Change
  const handleItemChange = (
    index: number,
    field: keyof InvoiceItem,
    value: any
  ) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };

      if (field === 'item_type') {
        const newType = value as ItemType;
        item.item_type = newType;
        // Reset or initialize weight_kg if switching type
        if (newType === 'Normal') {
          item.weight_kg = null;
        } else if (!item.weight_kg || item.weight_kg <= 0) {
          item.weight_kg = 1;
        }
      } else if (field === 'quantity' || field === 'weight_kg' || field === 'box_number') {
        item[field] = value === '' ? null : Number(value);
      } else {
        (item as any)[field] = value;
      }

      copy[index] = item;
      syncShipmentWeight(copy, boxes);
      return copy;
    });
    setErrorMessage(null);
  };

  // Item Change By ID (for Box-by-Box Cards View)
  const handleItemChangeById = (
    id: string,
    field: keyof InvoiceItem,
    value: any
  ) => {
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.id === id);
      if (idx === -1) return prev;
      const copy = [...prev];
      const item = { ...copy[idx] };

      if (field === 'item_type') {
        const newType = value as ItemType;
        item.item_type = newType;
        if (newType === 'Normal') {
          item.weight_kg = null;
        } else if (!item.weight_kg || item.weight_kg <= 0) {
          item.weight_kg = 1;
        }
      } else if (field === 'quantity' || field === 'weight_kg' || field === 'box_number') {
        item[field] = value === '' ? null : Number(value);
      } else {
        (item as any)[field] = value;
      }

      copy[idx] = item;
      syncShipmentWeight(copy, boxes);
      return copy;
    });
    setErrorMessage(null);
  };

  // Remove Item By ID
  const handleRemoveItemById = (id: string) => {
    if (items.length <= 1) {
      setErrorMessage('An invoice must have at least one item row.');
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
    setErrorMessage(null);
  };

  // Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Basic Validations
    if (!senderName.trim()) {
      setErrorMessage('Sender name is required.');
      return;
    }
    if (!receiverName.trim()) {
      setErrorMessage('Receiver name is required.');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Phone number is required.');
      return;
    }
    if (weight < 1) {
      setErrorMessage('Shipment total weight must be at least 1 kg.');
      return;
    }
    if (boxCount < 1) {
      setErrorMessage('Box count must be at least 1.');
      return;
    }

    // Check item names
    for (let i = 0; i < items.length; i++) {
      if (!items[i].item_name.trim()) {
        setErrorMessage(`Item #${i + 1} name cannot be empty.`);
        return;
      }
    }

    // Run Calculation & Validation
    const calc = calculateInvoice(
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

    if (!calc.isValid || !calc.result) {
      setErrorMessage(calc.error || 'Invoice calculation failed. Please verify rates.');
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
    } = calc.result;

    const finalInvoiceNo = editingInvoice
      ? editingInvoice.invoice_no
      : generateNextInvoiceNo(invoices);

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
      sender_phone: senderPhone.trim() || undefined,
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
      departure: departure.trim() || 'Kathmandu (KTM)',
      port_of_loading: portOfLoading.trim() || 'Kathmandu, Nepal',
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
      dispatch_date: editingInvoice?.dispatch_date,
      awb_no: editingInvoice?.awb_no,
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

    try {
      localStorage.removeItem('csp_billing_draft');
    } catch (e) {}

    setSuccessMessage(
      editingInvoice
        ? `Invoice ${finalInvoiceNo} updated successfully!`
        : `Invoice ${finalInvoiceNo} created successfully!`
    );

    // Reset if creating new
    if (!editingInvoice) {
      setSenderName('');
      setSenderAddress('');
      setSenderEmail('');
      setReceiverName('');
      setReceiverAddress('');
      setReceiverEmail('');
      setPhone('');
      setWeight(10);
      setBoxCount(1);
      setItems([
        {
          id: `item-${Date.now()}`,
          item_name: '',
          quantity: 1,
          item_type: 'Normal',
          weight_kg: null,
          box_number: 1,
        },
      ]);
      setBoxes([
        {
          box_number: 1,
          weight_kg: 10,
          length_cm: null,
          width_cm: null,
          height_cm: null,
        },
      ]);
      setPccNumber('');
      setPassportPhotoUrl('');
      setDiscountAmount(0);
      setCustomDutyOverride(null);
      setCustomRatePerKg(null);
      setCustomPurchaseAmount(null);
      setCustomTotalSale(null);
      setMeatExtraChargeOverride(null);
    }
  };

  const buildDraftInvoice = (): Invoice | null => {
    if (!liveCalculation.isValid || !liveCalculation.result) return null;
    const { saleAmount, totalPurchase, profitAmount, customDuty, meatExtraCharge, discountAmount: finalDiscount, effectiveRatePerKg } = liveCalculation.result;
    return {
      id: editingInvoice ? editingInvoice.id : `draft-${Date.now()}`,
      invoice_no: invoiceNo || 'INV-DRAFT',
      invoice_date: invoiceDate,
      shipper_id: 'shipper-sadobato',
      shipper_name: 'The Courier Station Sadobato',
      shipper_code: 'CSS-SDB',
      shipper_phone: '+977-1-5544332',
      shipper_email: 'info@courierstationsadobato.com',
      shipper_address: 'Sadobato, Lalitpur / Kathmandu, Nepal',
      shipper_tax_id: 'PAN: 601234567',
      sender_name: senderName.trim() || 'Sender Name',
      sender_phone: senderPhone.trim() || undefined,
      sender_address: senderAddress.trim() || undefined,
      sender_email: senderEmail.trim() || undefined,
      receiver_name: receiverName.trim() || 'Receiver Name',
      receiver_address: receiverAddress.trim() || undefined,
      receiver_email: receiverEmail.trim() || undefined,
      receiver_phone: phone.trim() || '+977-9800000000',
      phone: phone.trim() || '+977-9800000000',
      country: country.trim(),
      transport_type: transportType,
      weight: Number(weight) || 1,
      box_count: Number(boxCount) || 1,
      boxes: boxes.map((b) => ({ ...b })),
      departure: departure.trim() || 'Kathmandu (KTM)',
      port_of_loading: portOfLoading.trim() || 'Kathmandu, Nepal',
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
      created_at: editingInvoice ? editingInvoice.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: items.map((it, idx) => ({
        ...it,
        item_name: it.item_name.trim() || `Item #${idx + 1}`,
        quantity: Number(it.quantity) || 1,
        weight_kg: it.item_type !== 'Normal' ? Number(it.weight_kg) || 0 : null,
        box_number: it.box_number || 1,
      })),
    };
  };

  const handlePreviewDraft = () => {
    const draft = buildDraftInvoice();
    if (draft) {
      setDraftInvoice(draft);
      setIsPreviewOpen(true);
      setErrorMessage(null);
    } else {
      setErrorMessage('Live calculation is not ready. Please verify country and shipment parameters.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            <span>{editingInvoice ? `Edit Invoice: ${editingInvoice.invoice_no}` : 'New Courier Billing'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Fill shipment details. Re-weighed items (Meat, Dry Meat, Pickle) are entered per item.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!editingInvoice && (
            <button
              type="button"
              onClick={handleResetForm}
              className="px-3.5 py-1.5 border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg transition flex items-center gap-1.5"
              title="Clear active draft and start a fresh blank invoice"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Clear Form / Reset Draft</span>
            </button>
          )}

          {editingInvoice && onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-3.5 py-1.5 border border-slate-300 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-50 transition"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="font-bold block">Validation Error</strong>
            <p className="leading-relaxed">{errorMessage}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="font-bold">{successMessage}</span>
          </div>
        </div>
      )}

      {/* Mode Switcher Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setFormMode('easy')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-xs font-bold transition flex items-center justify-center gap-2 ${
              formMode === 'easy'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>🌟 Easy 3-Step Mode</span>
          </button>
          <button
            type="button"
            onClick={() => setFormMode('advanced')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-xs font-bold transition flex items-center justify-center gap-2 ${
              formMode === 'advanced'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>⚙️ Advanced Full Sheet</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsGuideOpen(true)}
          className="px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 flex items-center justify-center gap-1.5 transition shadow-2xs"
        >
          <HelpCircle className="w-4 h-4 text-blue-600" />
          <span>💡 Beginner Guide & Tips</span>
        </button>
      </div>

      {/* RENDER MODE 1: Easy 3-Step Wizard */}
      {formMode === 'easy' ? (
        <EasyBillingWizard
          rates={rates}
          invoices={invoices}
          availableCountries={availableCountries}
          invoiceNo={invoiceNo}
          invoiceDate={invoiceDate}
          setInvoiceDate={setInvoiceDate}
          senderName={senderName}
          setSenderName={setSenderName}
          senderPhone={senderPhone}
          setSenderPhone={setSenderPhone}
          senderAddress={senderAddress}
          setSenderAddress={setSenderAddress}
          senderEmail={senderEmail}
          setSenderEmail={setSenderEmail}
          receiverName={receiverName}
          setReceiverName={setReceiverName}
          receiverAddress={receiverAddress}
          setReceiverAddress={setReceiverAddress}
          receiverEmail={receiverEmail}
          setReceiverEmail={setReceiverEmail}
          phone={phone}
          setPhone={setPhone}
          country={country}
          setCountry={setCountry}
          transportType={transportType}
          setTransportType={setTransportType}
          weight={weight}
          setWeight={setWeight}
          boxCount={boxCount}
          setBoxCount={setBoxCount}
          boxes={boxes}
          setBoxes={setBoxes}
          items={items}
          setItems={setItems}
          discountAmount={discountAmount}
          setDiscountAmount={setDiscountAmount}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          paymentStatus={paymentStatus}
          setPaymentStatus={setPaymentStatus}
          onlineTransactionId={onlineTransactionId}
          setOnlineTransactionId={setOnlineTransactionId}
          pccNumber={pccNumber}
          setPccNumber={setPccNumber}
          passportPhotoUrl={passportPhotoUrl}
          setPassportPhotoUrl={setPassportPhotoUrl}
          customDutyOverride={customDutyOverride}
          setCustomDutyOverride={setCustomDutyOverride}
          customRatePerKg={customRatePerKg}
          setCustomRatePerKg={setCustomRatePerKg}
          customPurchaseAmount={customPurchaseAmount}
          setCustomPurchaseAmount={setCustomPurchaseAmount}
          customTotalSale={customTotalSale}
          setCustomTotalSale={setCustomTotalSale}
          meatExtraChargeOverride={meatExtraChargeOverride}
          setMeatExtraChargeOverride={setMeatExtraChargeOverride}
          onSaveInvoice={onSaveInvoice}
          onPreviewDraft={handlePreviewDraft}
          onResetForm={handleResetForm}
          editingInvoice={editingInvoice}
        />
      ) : (
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Beginner Helper Tip Bar */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-blue-900 shadow-2xs">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-blue-950">Advanced Billing Worksheet</p>
            <p className="text-blue-800/90 leading-relaxed">
              Fill in customer details, parcel dimensions, and items. Rates, customs clearance, and dry meat quarantine surcharges calculate automatically in real time.
            </p>
          </div>
        </div>

        {/* Section 1: Shipment & Customer Details */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-600" />
            <span>Shipment Header & Customer Information</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Invoice No */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Invoice Number
              </label>
              <input
                type="text"
                readOnly
                value={invoiceNo}
                className="w-full px-3 py-2 bg-slate-100 text-slate-700 font-mono font-bold text-xs border border-slate-300 rounded-lg cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Auto-generated read-only</span>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Invoice Date</span>
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Destination Country */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span>Destination Country</span>
              </label>
              <select
                value={country}
                onChange={(e) => {
                  const newCountry = e.target.value;
                  setCountry(newCountry);
                  setErrorMessage(null);
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold bg-white"
              >
                {availableCountries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* South Korea Special Customs & Passport Requirement Panel */}
          {(country.toLowerCase().includes('korea') || country === 'South Korea') && (
            <div className="p-4 bg-amber-50/90 border-2 border-amber-300 rounded-xl space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-700 shrink-0" />
                  <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    South Korea Customs Required Documents
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 bg-amber-200 text-amber-900 font-extrabold text-[10px] rounded-full uppercase tracking-wider">
                  Korea Unipass Clearance
                </span>
              </div>

              <p className="text-[11px] text-amber-800 leading-relaxed">
                South Korea Customs enforces strict receiver identification. Please enter the receiver's Personal Customs Clearance (PCC) code or upload a clear photo/scan of their passport.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* PCC Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-amber-700" />
                    <span>Personal Customs Clearance Code (PCC)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. P123456789012"
                    value={pccNumber}
                    onChange={(e) => setPccNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white font-mono font-bold"
                  />
                  <span className="text-[10px] text-amber-700 mt-1 block">
                    12-digit Unipass PCC code assigned to South Korea receiver
                  </span>
                </div>

                {/* Passport Photo Attachment */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-amber-700" />
                    <span>Receiver Passport Photo / Identity Copy</span>
                  </label>

                  {passportPhotoUrl ? (
                    <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-amber-300">
                      <img
                        src={passportPhotoUrl}
                        alt="Receiver Passport Photo"
                        className="w-12 h-12 object-cover rounded-md border border-slate-200 shadow-2xs shrink-0"
                      />
                      <div className="flex-1 min-w-0 text-xs">
                        <span className="font-bold text-emerald-700 block truncate">Passport Photo Attached</span>
                        <span className="text-[10px] text-slate-400 block">Saved for custom clearance</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPassportPhotoUrl('')}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Remove passport photo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 p-2 bg-white border border-dashed border-amber-400 hover:border-amber-600 rounded-lg cursor-pointer text-xs font-semibold text-amber-900 transition">
                      <Upload className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Upload Passport Photo / ID Copy</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePassportUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                  <span className="text-[10px] text-amber-700 mt-1 block">
                    Accepted formats: JPG, PNG, WEBP (Max 5MB)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Sender & Receiver Inputs with Email Support */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            {/* Sender Column */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>Sender (Origin Consignor)</span>
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sender Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ram Bahadur Thapa"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 bg-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    <span>Sender / Customer Mobile Number *</span>
                  </span>
                  <span className="text-[10px] text-blue-700 font-semibold bg-blue-100/80 px-2 py-0.5 rounded">
                    For Tracking Code
                  </span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9856012345 / +977-9800000000"
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-blue-200 bg-blue-50/20 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-slate-900"
                />
                <span className="text-[10.5px] text-slate-500 mt-1 block">
                  Customer number to provide AWB tracking code & dispatch SMS/WhatsApp.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sender Address</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lakeside-6, Pokhara, Nepal"
                  value={senderAddress}
                  onChange={(e) => setSenderAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 bg-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                />
              </div>

              {/* Optional Email */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400" />
                  <span>Sender Email (Optional)</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. ram.thapa@gmail.com (optional)"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 bg-slate-50/50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-600"
                />
              </div>
            </div>

            {/* Receiver Column */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>Receiver (Destination Consignee)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Receiver Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Suman Thapa"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 bg-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Receiver Phone *</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +61 412 345 678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 bg-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Receiver Email</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. suman.thapa@gmail.com"
                  value={receiverEmail}
                  onChange={(e) => setReceiverEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 bg-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Receiver Full Delivery Address</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. House No. 42, St George Street, Sydney, NSW 2000"
                  value={receiverAddress}
                  onChange={(e) => setReceiverAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 bg-white rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Total Shipment Weight */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-slate-400" />
                <span>Total Shipment Weight (kg) *</span>
              </label>
              <input
                type="number"
                min="1"
                step="0.5"
                value={weight}
                onChange={(e) => setWeight(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-slate-900"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Min 1 kg</span>
            </div>

            {/* Box Count */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Box Count *
              </label>
              <input
                type="number"
                min="1"
                value={boxCount}
                onChange={(e) => setBoxCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Used for custom duty</span>
            </div>

            {/* Transport Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Plane className="w-3.5 h-3.5 text-slate-400" />
                <span>Transport Type</span>
              </label>
              <select
                value={transportType}
                onChange={(e) => setTransportType(e.target.value as TransportType)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold bg-white"
              >
                <option value="Air">Air Courier</option>
                <option value="Cargo">Cargo Cargo</option>
              </select>
            </div>

            {/* Departure */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Departure Flight / Port</label>
              <input
                type="text"
                placeholder="e.g. KTM - TIA Flight"
                value={departure}
                onChange={(e) => setDeparture(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Port of Loading</span>
            </label>
            <input
              type="text"
              value={portOfLoading}
              onChange={(e) => setPortOfLoading(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Section: Multi-Box & Individual Box Weight Limits */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" />
                <span>Parcel Box Breakdown & Country Weight Limits</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Add multiple boxes for this shipment. Most destination countries enforce max 25kg–30kg per box limit.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddBox}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Box</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-2.5 min-w-[90px] whitespace-nowrap">Box #</th>
                  <th className="p-2.5 min-w-[130px] whitespace-nowrap">Actual Weight (kg) *</th>
                  <th className="p-2.5 min-w-[180px] whitespace-nowrap">L × W × H (cm)</th>
                  <th className="p-2.5 min-w-[130px] whitespace-nowrap">Volumetric Weight</th>
                  <th className="p-2.5 min-w-[140px] whitespace-nowrap">Chargeable Weight</th>
                  <th className="p-2.5 min-w-[180px]">Weight Limit Warning</th>
                  <th className="p-2.5 text-center min-w-[210px] whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {boxes.map((box, index) => {
                  const actWeight = box.weight_kg || 0;
                  const volWeight = ((box.length_cm || 0) * (box.width_cm || 0) * (box.height_cm || 0)) / 5000;
                  const chargeableWeight = Math.max(actWeight, volWeight);
                  const isVolumetricApplied = volWeight > actWeight && volWeight > 0;
                  const isOverLimit = actWeight > 30 || chargeableWeight > 30;

                  return (
                    <tr key={box.id ? `${box.id}-box-${index}` : `box-row-${index}`} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-slate-900 whitespace-nowrap">
                        <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-md text-slate-800 font-mono text-xs whitespace-nowrap inline-block">
                          Box #{box.box_number || index + 1}
                        </span>
                      </td>

                      {/* Weight */}
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="0.5"
                          step="0.5"
                          value={box.weight_kg ?? ''}
                          onChange={(e) => handleBoxChange(index, 'weight_kg', e.target.value)}
                          className="w-28 px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                        />
                      </td>

                      {/* L x W x H */}
                      <td className="p-2.5">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            placeholder="L"
                            value={box.length_cm ?? ''}
                            onChange={(e) => handleBoxChange(index, 'length_cm', e.target.value)}
                            className="w-16 px-2 py-1 text-xs border border-slate-300 rounded text-center"
                          />
                          <span className="text-slate-400">×</span>
                          <input
                            type="number"
                            placeholder="W"
                            value={box.width_cm ?? ''}
                            onChange={(e) => handleBoxChange(index, 'width_cm', e.target.value)}
                            className="w-16 px-2 py-1 text-xs border border-slate-300 rounded text-center"
                          />
                          <span className="text-slate-400">×</span>
                          <input
                            type="number"
                            placeholder="H"
                            value={box.height_cm ?? ''}
                            onChange={(e) => handleBoxChange(index, 'height_cm', e.target.value)}
                            className="w-16 px-2 py-1 text-xs border border-slate-300 rounded text-center"
                          />
                        </div>
                      </td>

                      {/* Volumetric Weight */}
                      <td className="p-2.5 font-mono text-slate-600 font-semibold whitespace-nowrap">
                        {volWeight > 0 ? `${volWeight.toFixed(2)} kg` : '—'}
                      </td>

                      {/* Chargeable Weight */}
                      <td className="p-2.5 font-mono whitespace-nowrap">
                        <span className="font-bold text-slate-900">{chargeableWeight > 0 ? `${chargeableWeight.toFixed(2)} kg` : '—'}</span>
                        {isVolumetricApplied && (
                          <span className="block text-[10px] text-indigo-600 font-bold">Volumetric Applied</span>
                        )}
                      </td>

                      {/* Limit Warning */}
                      <td className="p-2.5">
                        {isOverLimit ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span>Exceeds 30kg country box limit! Split into 2 boxes.</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Within {country} limits ({box.weight_kg || 0} kg)</span>
                          </span>
                        )}
                      </td>

                      {/* Quick Add Item to Box & Remove Box */}
                      <td className="p-2.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleAddItem(box.box_number || index + 1)}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 font-bold text-xs rounded-lg transition whitespace-nowrap inline-flex items-center gap-1.5 shadow-2xs"
                            title={`Add item row specifically to Box #${box.box_number || index + 1}`}
                          >
                            <Plus className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>+ Item to Box #{box.box_number || index + 1}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveBox(index)}
                            disabled={boxes.length <= 1}
                            className={`p-2 rounded-lg transition shrink-0 ${
                              boxes.length > 1
                                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-slate-200 cursor-not-allowed'
                            }`}
                            title="Delete Box"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-center justify-between font-medium">
            <span>
              Total Multi-Box Weight: <strong className="font-extrabold text-blue-900 font-mono">{boxes.reduce((acc, b) => acc + (b.weight_kg || 0), 0)} kg</strong> across <strong className="font-extrabold font-mono">{boxes.length} box(es)</strong>
            </span>
            <span className="text-[11px] text-blue-700">
              Auto-synced to Shipment Total Weight
            </span>
          </div>
        </div>

        {/* Section 2: Split Box Items & Packing Assignment */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-emerald-600" />
                <span>Shipment Items & Box Packing Assignment</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Add items directly inside each Box section below. Re-weighed items (Meat/Dry Meat/Pickle) require manual weight (kg).
              </p>
            </div>

            {/* View Mode Toggle & Box Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setItemDisplayMode('boxes')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition ${
                    itemDisplayMode === 'boxes'
                      ? 'bg-white text-blue-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Boxes className="w-3.5 h-3.5 text-blue-600" />
                  <span>Split by Box Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setItemDisplayMode('flat')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition ${
                    itemDisplayMode === 'flat'
                      ? 'bg-white text-blue-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-slate-600" />
                  <span>Combined Table</span>
                </button>
              </div>
            </div>
          </div>

          {/* Box Filter Pills (if multiple boxes exist) */}
          {boxes.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-slate-400 font-bold uppercase text-[10px] mr-1 shrink-0 flex items-center gap-1">
                <ListFilter className="w-3 h-3" />
                Filter Box:
              </span>
              <button
                type="button"
                onClick={() => setSelectedBoxFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition shrink-0 border ${
                  selectedBoxFilter === 'all'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                All Boxes ({items.length} items)
              </button>
              {boxes.map((b, bIdx) => {
                const bNum = b.box_number || bIdx + 1;
                const count = items.filter((it) => (it.box_number || 1) === bNum).length;
                return (
                  <button
                    key={`filter-b-${b.id || bIdx}`}
                    type="button"
                    onClick={() => setSelectedBoxFilter(bNum)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition shrink-0 border ${
                      selectedBoxFilter === bNum
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-blue-50/70 text-blue-900 border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    Box #{bNum} ({count} items)
                  </button>
                );
              })}
            </div>
          )}

          {/* SPLIT BY BOX CARDS VIEW */}
          {itemDisplayMode === 'boxes' ? (
            <div className="space-y-4">
              {boxes
                .filter((b) => selectedBoxFilter === 'all' || (b.box_number || 1) === selectedBoxFilter)
                .map((b, bIdx) => {
                  const bNum = b.box_number || bIdx + 1;
                  const boxItems = items.filter((it) => (it.box_number || 1) === bNum);

                  return (
                    <div
                      key={`box-card-section-${b.id || bIdx}`}
                      className="border border-slate-300 rounded-xl bg-slate-50/50 p-4 space-y-3"
                    >
                      {/* Box Card Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-blue-900 text-white flex items-center justify-center font-extrabold text-xs font-mono shadow-2xs">
                            #{bNum}
                          </span>
                          <div>
                            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-tight">
                              Box #{bNum} Packing List
                            </h3>
                            <p className="text-[10px] text-slate-500 font-medium">
                              Actual: <strong className="text-slate-800">{b.weight_kg || 0} kg</strong> • {boxItems.length} item(s) packed
                            </p>
                          </div>
                        </div>

                        {/* Direct Add Button Right in Box Header! */}
                        <button
                          type="button"
                          onClick={() => handleAddItem(bNum)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center gap-1.5 shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Add Item to Box #{bNum}</span>
                        </button>
                      </div>

                      {/* Box Items Table */}
                      {boxItems.length > 0 ? (
                        <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
                                <th className="p-2 w-8 text-center">#</th>
                                <th className="p-2 min-w-[180px]">Item Description *</th>
                                <th className="p-2 w-20 text-center">Qty</th>
                                <th className="p-2 w-32">Type</th>
                                <th className="p-2 w-36">Re-weighed Weight</th>
                                <th className="p-2 w-28">Box</th>
                                <th className="p-2 w-10 text-center">Del</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {boxItems.map((item, itemIdx) => {
                                const isReWeighed = item.item_type !== 'Normal';
                                return (
                                  <tr key={item.id || `b-${bNum}-it-${itemIdx}`} className="hover:bg-slate-50">
                                    <td className="p-2 text-center font-mono font-bold text-slate-400">
                                      {itemIdx + 1}
                                    </td>

                                    {/* Item Description */}
                                    <td className="p-2">
                                      <input
                                        type="text"
                                        placeholder="e.g. Sukuti, Pashmina Shawl, Pickle"
                                        value={item.item_name || ''}
                                        onChange={(e) => handleItemChangeById(item.id, 'item_name', e.target.value)}
                                        className="w-full px-2.5 py-1 border border-slate-300 rounded font-medium focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                      />
                                    </td>

                                    {/* Quantity */}
                                    <td className="p-2">
                                      <input
                                        type="number"
                                        min="1"
                                        value={item.quantity ?? ''}
                                        onChange={(e) => handleItemChangeById(item.id, 'quantity', e.target.value)}
                                        className="w-full px-2 py-1 border border-slate-300 rounded text-center font-bold"
                                      />
                                    </td>

                                    {/* Type */}
                                    <td className="p-2">
                                      <select
                                        value={item.item_type}
                                        onChange={(e) => handleItemChangeById(item.id, 'item_type', e.target.value)}
                                        className="w-full px-2 py-1 border border-slate-300 rounded font-semibold bg-white"
                                      >
                                        <option value="Normal">Normal</option>
                                        <option value="Meat">Meat</option>
                                        <option value="Dry Meat">Dry Meat</option>
                                        <option value="Pickle">Pickle</option>
                                      </select>
                                    </td>

                                    {/* Re-weighed Weight */}
                                    <td className="p-2">
                                      {isReWeighed ? (
                                        <input
                                          type="number"
                                          min="0.1"
                                          step="0.1"
                                          placeholder="kg"
                                          value={item.weight_kg ?? ''}
                                          onChange={(e) => handleItemChangeById(item.id, 'weight_kg', e.target.value)}
                                          className="w-full px-2 py-1 border border-amber-400 bg-amber-50/60 rounded font-bold text-amber-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                        />
                                      ) : (
                                        <span className="text-[10px] text-slate-400 italic block text-center">
                                          Standard
                                        </span>
                                      )}
                                    </td>

                                    {/* Move to another Box */}
                                    <td className="p-2">
                                      <select
                                        value={item.box_number || bNum}
                                        onChange={(e) => handleItemChangeById(item.id, 'box_number', Number(e.target.value))}
                                        className="w-full px-1.5 py-1 border border-blue-200 bg-blue-50/50 rounded font-bold text-blue-900 text-[11px]"
                                      >
                                        {boxes.map((optBox, optIdx) => {
                                          const optNum = optBox.box_number || optIdx + 1;
                                          return (
                                            <option key={`opt-b-${optNum}`} value={optNum}>
                                              Box #{optNum}
                                            </option>
                                          );
                                        })}
                                      </select>
                                    </td>

                                    {/* Delete */}
                                    <td className="p-2 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveItemById(item.id)}
                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                                        title="Delete Item"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="bg-white p-4 rounded-lg border border-dashed border-slate-300 text-center space-y-2">
                          <p className="text-xs text-slate-500">No items packed in Box #{bNum} yet.</p>
                          <button
                            type="button"
                            onClick={() => handleAddItem(bNum)}
                            className="px-3 py-1 bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 font-bold text-xs rounded-md transition inline-flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add First Item to Box #{bNum}</span>
                          </button>
                        </div>
                      )}

                      {/* Bottom Add Item button inside Box Card */}
                      {boxItems.length > 0 && (
                        <div className="pt-1 flex justify-start">
                          <button
                            type="button"
                            onClick={() => handleAddItem(bNum)}
                            className="px-3 py-1 bg-white hover:bg-blue-50 border border-blue-300 text-blue-700 font-bold text-xs rounded-lg transition inline-flex items-center gap-1.5 shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Add Another Item to Box #{bNum}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          ) : (
            /* FLAT COMBINED TABLE VIEW */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="p-2.5 w-10 text-center">#</th>
                    <th className="p-2.5 w-28">Packed Box</th>
                    <th className="p-2.5 min-w-[200px]">Item Description *</th>
                    <th className="p-2.5 w-24">Quantity</th>
                    <th className="p-2.5 w-36">Item Type</th>
                    <th className="p-2.5 w-40">Re-weighed Weight (kg)</th>
                    <th className="p-2.5 w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item, index) => {
                    const isReWeighed = item.item_type !== 'Normal';
                    return (
                      <tr key={item.id || `item-flat-${index}`} className="hover:bg-slate-50/80">
                        <td className="p-2.5 text-center font-semibold text-slate-400">
                          {index + 1}
                        </td>
                        <td className="p-2.5">
                          <select
                            value={item.box_number || 1}
                            onChange={(e) => handleItemChangeById(item.id, 'box_number', Number(e.target.value))}
                            className="w-full px-2 py-1.5 border border-blue-200 bg-blue-50/60 rounded-lg font-bold text-blue-900 text-xs"
                          >
                            {boxes.map((b, bIdx) => (
                              <option key={`b-opt-${bIdx}`} value={b.box_number || bIdx + 1}>
                                Box #{b.box_number || bIdx + 1}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            placeholder="e.g. Sukuti, Pashmina Shawl, Pickle Jar"
                            value={item.item_name || ''}
                            onChange={(e) => handleItemChangeById(item.id, 'item_name', e.target.value)}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-medium"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity ?? ''}
                            onChange={(e) => handleItemChangeById(item.id, 'quantity', e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-center font-bold"
                          />
                        </td>
                        <td className="p-2.5">
                          <select
                            value={item.item_type}
                            onChange={(e) => handleItemChangeById(item.id, 'item_type', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded-md font-semibold bg-white"
                          >
                            <option value="Normal">Normal</option>
                            <option value="Meat">Meat</option>
                            <option value="Dry Meat">Dry Meat</option>
                            <option value="Pickle">Pickle</option>
                          </select>
                        </td>
                        <td className="p-2.5">
                          {isReWeighed ? (
                            <input
                              type="number"
                              min="0.1"
                              step="0.1"
                              placeholder="kg (Required)"
                              value={item.weight_kg ?? ''}
                              onChange={(e) => handleItemChangeById(item.id, 'weight_kg', e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-amber-400 bg-amber-50/50 rounded-md font-bold text-amber-900"
                            />
                          ) : (
                            <span className="text-[11px] text-slate-400 italic block py-1.5 px-2 bg-slate-50 border border-slate-200 rounded text-center">
                              Calculated
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItemById(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payment Method & Settlement Options Card */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Payment Method & Settlement Status
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              Record cash, QR / Fonepay, bank transfer, or credit / due status
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Payment Method Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-slate-500" />
                <span>Payment Mode</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'Cash', label: '💵 Cash Pay', color: 'emerald' },
                  { id: 'Online Payment', label: '📱 Online Pay', color: 'blue' },
                ].map((pm) => (
                  <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethod(pm.id as PaymentMethod)}
                    className={`px-3 py-2 text-xs font-bold rounded-lg border transition text-left flex items-center justify-between cursor-pointer ${
                      paymentMethod === pm.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{pm.label}</span>
                    {paymentMethod === pm.id && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Status Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-slate-500" />
                <span>Payment Status</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Paid', label: 'Paid', bg: 'bg-emerald-600 text-white', inactive: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                  { id: 'Unpaid', label: 'Unpaid', bg: 'bg-rose-600 text-white', inactive: 'bg-rose-50 text-rose-800 border-rose-200' },
                  { id: 'Partial', label: 'Partial', bg: 'bg-amber-500 text-white', inactive: 'bg-amber-50 text-amber-800 border-amber-200' },
                ].map((ps) => (
                  <button
                    key={ps.id}
                    type="button"
                    onClick={() => setPaymentStatus(ps.id as PaymentStatus)}
                    className={`py-2 px-2 text-center text-xs font-bold rounded-lg border transition cursor-pointer ${
                      paymentStatus === ps.id
                        ? `${ps.bg} shadow-xs border-transparent`
                        : `${ps.inactive} hover:opacity-90`
                    }`}
                  >
                    {ps.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Online / Bank Transaction ID or Reference */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-slate-500" />
                <span>Txn ID / Ref / Remarks</span>
              </label>
              <input
                type="text"
                placeholder={
                  paymentMethod === 'Online / Fonepay / QR'
                    ? 'e.g. Fonepay Txn #984123'
                    : paymentMethod === 'Bank Transfer'
                    ? 'e.g. Bank Ref #883921'
                    : 'Optional reference or remarks'
                }
                value={onlineTransactionId}
                onChange={(e) => setOnlineTransactionId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
              <span className="text-[10px] text-slate-400 block mt-1">
                Recorded on receipt & invoice history
              </span>
            </div>
          </div>
        </div>

        {/* Dedicated Section for Meat & Special Items Pricing */}
        <div className="bg-amber-50/80 p-4.5 rounded-xl border border-amber-300 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xl">🥩</span>
              <div>
                <h3 className="text-xs font-extrabold text-amber-950 uppercase tracking-wider">
                  Meat & Special Items Surcharge & Pricing
                </h3>
                <p className="text-[11px] text-amber-800 font-medium">
                  All shipment kg is included in total box weight ({weight} kg). Meat / Dry Meat / Pickle items incur an extra surcharge fee.
                </p>
              </div>
            </div>
            {meatExtraChargeOverride !== null && (
              <button
                type="button"
                onClick={() => setMeatExtraChargeOverride(null)}
                className="px-2.5 py-1 bg-amber-200/80 hover:bg-amber-300 text-amber-950 font-bold text-xs rounded-lg transition shrink-0"
              >
                Reset to Auto Surcharge
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Total Meat & Special Weight in Shipment */}
            <div className="bg-white p-3 rounded-lg border border-amber-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold text-amber-900 uppercase block tracking-wider">
                  Special Items Weight (Meat / Dry Meat / Pickle)
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-lg font-black text-amber-950">
                    {liveCalculation.result?.specialItemsWeight || 0} kg
                  </span>
                  <span className="text-[10px] text-amber-800 font-semibold">
                    / {weight} kg total
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Weight is already inside the box
                </span>
              </div>
              <div className="p-2.5 bg-amber-100/80 rounded-lg text-amber-800">
                <Package className="w-5 h-5" />
              </div>
            </div>

            {/* Extra Surcharge Rate per kg */}
            <div className="bg-white p-3 rounded-lg border border-amber-200">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider">
                  Surcharge Rate (Rs / kg)
                </label>
                <span className="text-[10px] font-bold text-amber-800">
                  {Math.round(liveCalculation.result?.meatExtraRatePerKg || 0)} Rs/kg
                </span>
              </div>
              <input
                type="number"
                min="0"
                step="any"
                placeholder={
                  (liveCalculation.result?.specialItemsWeight || 0) > 0
                    ? `Auto (${Math.round(liveCalculation.result?.meatExtraRatePerKg || 0)} Rs/kg)`
                    : 'Extra Rs/kg'
                }
                value={
                  meatExtraChargeOverride !== null && meatExtraChargeOverride !== undefined && (liveCalculation.result?.specialItemsWeight || 0) > 0
                    ? Math.round((meatExtraChargeOverride / (liveCalculation.result?.specialItemsWeight || 1)) * 100) / 100
                    : ''
                }
                onChange={(e) => {
                  const val = e.target.value;
                  const specialWt = liveCalculation.result?.specialItemsWeight || 1;
                  if (val === '') {
                    setMeatExtraChargeOverride(null);
                  } else {
                    const ratePerKg = Math.max(0, Number(val));
                    setMeatExtraChargeOverride(ratePerKg * specialWt);
                  }
                }}
                className="w-full px-2.5 py-1.5 text-xs border border-amber-300 bg-amber-50/20 rounded-md font-extrabold text-amber-950 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <span className="text-[9px] text-amber-800 font-medium block mt-1">
                Per-kg extra fee applied to special items
              </span>
            </div>

            {/* Total Meat Extra Surcharge */}
            <div className="bg-white p-3 rounded-lg border border-amber-200">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wider">
                  Total Meat Surcharge (Rs)
                </label>
                <span className="text-[10px] font-extrabold text-amber-900">
                  {formatCurrency(liveCalculation.result?.meatExtraCharge || 0)}
                </span>
              </div>
              <input
                type="number"
                min="0"
                placeholder={
                  liveCalculation.result?.meatExtraCharge !== undefined
                    ? `Auto (${formatCurrency(liveCalculation.result.meatExtraCharge)})`
                    : 'Total Meat Surcharge Rs'
                }
                value={meatExtraChargeOverride ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setMeatExtraChargeOverride(val === '' ? null : Math.max(0, Number(val)));
                }}
                className="w-full px-2.5 py-1.5 text-xs border border-amber-400 bg-amber-50/30 rounded-md font-extrabold text-amber-950 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <span className="text-[9px] text-amber-800 font-medium block mt-1">
                {meatExtraChargeOverride !== null ? 'Manual Meat Surcharge Override Active' : 'Auto calculated from special items'}
              </span>
            </div>
          </div>
        </div>

        {/* Custom Deal Pricing & Financial Adjustments Bar */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>🤝 Deal Sale Rate & Financial Customizations</span>
            </span>
            <span className="text-[11px] text-slate-500">
              Set custom deal sale rates or manual purchase costs without relying on matrix lookups.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
            {/* Custom Per Kg Sale Rate */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">
                  Deal Rate (Rs/kg)
                </label>
                {customRatePerKg !== null && (
                  <button
                    type="button"
                    onClick={() => setCustomRatePerKg(null)}
                    className="text-[9px] text-blue-600 hover:underline font-semibold"
                  >
                    Reset
                  </button>
                )}
              </div>
              <input
                type="number"
                min="0"
                step="any"
                placeholder={
                  liveCalculation.result
                    ? `Auto (${Math.round(liveCalculation.result.baseRatePerKg || liveCalculation.result.effectiveRatePerKg)} Rs/kg)`
                    : 'Auto Matrix'
                }
                value={customRatePerKg ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomRatePerKg(val === '' ? null : Math.max(0, Number(val)));
                  if (val !== '') setCustomTotalSale(null); // reset total sale if rate per kg entered
                }}
                className="w-full px-2.5 py-1.5 text-xs border border-blue-300 bg-blue-50/20 rounded font-bold text-blue-900 focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[9px] text-slate-400 block mt-1">
                {customRatePerKg !== null ? `Custom rate for ${weight} kg` : `Matrix rate applied`}
              </span>
            </div>

            {/* Direct Lump-Sum Deal Sale Amount */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">
                  Deal Sale (Rs)
                </label>
                {customTotalSale !== null && (
                  <button
                    type="button"
                    onClick={() => setCustomTotalSale(null)}
                    className="text-[9px] text-blue-600 hover:underline font-semibold"
                  >
                    Reset
                  </button>
                )}
              </div>
              <input
                type="number"
                min="0"
                placeholder={
                  liveCalculation.result
                    ? `Auto (${formatCurrency(liveCalculation.result.saleAmount)})`
                    : 'Lump Sum Rs'
                }
                value={customTotalSale ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomTotalSale(val === '' ? null : Math.max(0, Number(val)));
                  if (val !== '') setCustomRatePerKg(null); // reset rate per kg if total sale entered
                }}
                className="w-full px-2.5 py-1.5 text-xs border border-blue-300 bg-blue-50/20 rounded font-bold text-blue-900 focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[9px] text-slate-400 block mt-1">
                {customTotalSale !== null ? `Fixed deal total sale` : `Calculated from weight`}
              </span>
            </div>

            {/* Direct Purchase Cost Input */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">
                  Purchase Cost (Rs)
                </label>
                {customPurchaseAmount !== null && (
                  <button
                    type="button"
                    onClick={() => setCustomPurchaseAmount(null)}
                    className="text-[9px] text-blue-600 hover:underline font-semibold"
                  >
                    Reset
                  </button>
                )}
              </div>
              <input
                type="number"
                min="0"
                placeholder={
                  liveCalculation.result
                    ? `Auto (${formatCurrency(liveCalculation.result.purchaseAmount)})`
                    : 'Purchase Cost'
                }
                value={customPurchaseAmount ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomPurchaseAmount(val === '' ? null : Math.max(0, Number(val)));
                }}
                className="w-full px-2.5 py-1.5 text-xs border border-purple-300 bg-purple-50/20 rounded font-bold text-purple-900 focus:ring-1 focus:ring-purple-500"
              />
              <span className="text-[9px] text-slate-400 block mt-1">
                {customPurchaseAmount !== null ? `Manual purchase cost set` : `Matrix purchase cost`}
              </span>
            </div>

            {/* Custom Duty Adjustment */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">
                  Custom Duty (Rs)
                </label>
                {customDutyOverride !== null && (
                  <button
                    type="button"
                    onClick={() => setCustomDutyOverride(null)}
                    className="text-[9px] text-blue-600 hover:underline font-semibold"
                  >
                    Reset
                  </button>
                )}
              </div>
              <input
                type="number"
                min="0"
                placeholder={
                  liveCalculation.result
                    ? `Auto (${formatCurrency(liveCalculation.result.customDuty)})`
                    : 'Auto Duty'
                }
                value={customDutyOverride ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomDutyOverride(val === '' ? null : Math.max(0, Number(val)));
                }}
                className="w-full px-2.5 py-1.5 text-xs border border-amber-300 bg-amber-50/20 rounded font-bold text-amber-900 focus:ring-1 focus:ring-amber-500"
              />
              <span className="text-[9px] text-slate-400 block mt-1">Clearing duty fee</span>
            </div>

            {/* Discount Option */}
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <label className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider block mb-1">
                Discount (Rs)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 500"
                value={discountAmount === 0 ? '' : (discountAmount ?? '')}
                onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
                className="w-full px-2.5 py-1.5 text-xs border border-emerald-300 bg-emerald-50/30 rounded font-bold text-emerald-900 focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-[9px] text-slate-400 block mt-1">Deducted from total</span>
            </div>
          </div>
        </div>

        {/* Live Calculation Preview Card */}
        <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
            <div>
              <h3 className="font-bold text-sm tracking-tight text-emerald-400 uppercase flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin-slow" />
                <span>Live Billing & Profit Engine</span>
              </h3>
              <p className="text-xs text-slate-400">
                Rates looked up dynamically for Country: <strong className="text-white">{country}</strong> at{' '}
                <strong className="text-white">{weight} kg</strong> slab.
              </p>
            </div>

            {liveCalculation.isValid && liveCalculation.result && (
              <div className="flex flex-wrap items-center gap-5 text-right">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                    Base Freight ({weight} kg)
                  </span>
                  <span className="text-sm font-bold text-white">
                    {formatCurrency(liveCalculation.result.baseFreightAmount ?? liveCalculation.result.saleAmount)}
                  </span>
                </div>
                {(liveCalculation.result.meatExtraCharge || 0) > 0 && (
                  <div>
                    <span className="text-[10px] text-amber-400 uppercase block font-semibold flex items-center justify-end gap-0.5">
                      <span>🥩</span> Meat Extra
                    </span>
                    <span className="text-sm font-bold text-amber-300">
                      + {formatCurrency(liveCalculation.result.meatExtraCharge || 0)}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                    Custom Duty
                  </span>
                  <span className="text-sm font-bold text-amber-400">
                    + {formatCurrency(liveCalculation.result.customDuty)}
                  </span>
                </div>
                {liveCalculation.result.discountAmount > 0 && (
                  <div>
                    <span className="text-[10px] text-emerald-400 uppercase block font-semibold">
                      Discount
                    </span>
                    <span className="text-sm font-bold text-emerald-400">
                      - {formatCurrency(liveCalculation.result.discountAmount)}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">
                    Net Payable
                  </span>
                  <span className="text-xl font-extrabold text-emerald-400">
                    {formatCurrency(liveCalculation.result.finalAmount)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {!liveCalculation.isValid ? (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{liveCalculation.error}</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[11px]">Freight Purchase:</span>
                  <span className="font-semibold text-white">
                    {formatCurrency(liveCalculation.result?.freightPurchaseAmount ?? liveCalculation.result?.purchaseAmount ?? 0)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Custom Purchase:</span>
                  <span className="font-semibold text-amber-300">
                    + {formatCurrency(liveCalculation.result?.customPurchaseCost || 0)}
                  </span>
                  {(liveCalculation.result?.customPurchaseCost || 0) > 0 && (
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      ({isAustraliaCountry(country) ? 'Aus 500/box' : 'USA/Can 750/box'} × {boxCount})
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Total Purchase Cost:</span>
                  <span className="font-bold text-white">
                    {formatCurrency(liveCalculation.result?.totalPurchase || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Rate / kg:</span>
                  <span className="font-bold text-blue-400">
                    {formatCurrency(liveCalculation.result?.effectiveRatePerKg || 0)} / kg
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Net Estimated Profit:</span>
                  <span className="font-extrabold text-emerald-400 text-sm">
                    {formatCurrency(liveCalculation.result?.profitAmount || 0)}
                  </span>
                </div>
              </div>

              {liveCalculation.result?.itemTypeBreakdown && liveCalculation.result.itemTypeBreakdown.length > 0 && (
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Category Weight & Rate Breakdown (Added to Both Purchase & Sale):
                  </span>
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    {liveCalculation.result.itemTypeBreakdown.map((bd) => (
                      <div key={bd.item_type} className="bg-slate-800/90 px-2.5 py-1.5 rounded-md border border-slate-700 flex flex-wrap items-center gap-2">
                        <span className="font-bold text-amber-400">{bd.item_type}:</span>
                        <span className="text-white font-mono font-bold">{bd.weight} kg</span>
                        <span className="text-slate-300 text-[10px] font-mono">
                          (Sale: {formatCurrency(bd.sale)} @ {formatCurrency(bd.saleRate)}/kg | Purchase: {formatCurrency(bd.purchase)} @ {formatCurrency(bd.purchaseRate)}/kg)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          {editingInvoice && onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-5 py-2.5 border border-slate-300 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          )}

          {/* Live Preview Button */}
          <button
            type="button"
            onClick={handlePreviewDraft}
            disabled={!liveCalculation.isValid}
            className={`flex items-center gap-2 px-5 py-2.5 font-bold text-xs rounded-lg transition shadow-xs border ${
              liveCalculation.isValid
                ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900 cursor-pointer'
                : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            }`}
            title="Preview how the Customer Bill and Item Manifest will look"
          >
            <Eye className="w-4 h-4 text-cyan-400" />
            <span>Preview Customer Bill</span>
          </button>

          <button
            type="submit"
            disabled={!liveCalculation.isValid}
            className={`flex items-center gap-2 px-6 py-2.5 font-bold text-xs rounded-lg transition shadow-md ${
              liveCalculation.isValid
                ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{editingInvoice ? 'Update Invoice' : 'Save & Issue Invoice'}</span>
          </button>
        </div>
      </form>
      )}

      {/* Beginner Quick Guide Modal */}
      <QuickGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onStartEasyBill={() => {
          setFormMode('easy');
          setIsGuideOpen(false);
        }}
      />

      {/* Live Preview Customer Bill Modal */}
      {isPreviewOpen && draftInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-100 rounded-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-300">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-900">
                  Live Preview: Customer Bill ({draftInvoice.invoice_no})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-xs">
              <InvoiceDetail
                invoice={draftInvoice}
                role="admin"
                onBack={() => setIsPreviewOpen(false)}
                onEdit={() => setIsPreviewOpen(false)}
                onDelete={() => setIsPreviewOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
