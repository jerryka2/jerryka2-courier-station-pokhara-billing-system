import React, { useState, useEffect } from 'react';
import { Invoice, KathmanduBilling, InvoiceItem, TransportType, PaymentMethod, PaymentStatus, Rate } from '../types';
import { calculateKathmanduBillingTotals, formatCurrency, getInvoicePurchaseBreakdown, getInvoiceMeatBreakdown } from '../lib/rateCalculator';
import { generateNextKtmInvoiceNo } from '../lib/storage';
import { downloadKathmanduBillingPDF } from '../lib/pdfGenerator';
import { exportKathmanduBillingToExcel } from '../lib/excelExporter';
import {
  Plane,
  Building2,
  Receipt,
  FileText,
  User,
  Phone,
  MapPin,
  Package,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Sparkles,
  Link as LinkIcon,
  CheckCircle2,
  Info,
  DollarSign,
  TrendingUp,
  Boxes,
  Truck,
  Printer,
  ChevronRight,
  Search,
  Download,
  FileSpreadsheet,
} from 'lucide-react';

interface KathmanduBillingFormProps {
  initialData?: KathmanduBilling | null;
  editingBilling?: KathmanduBilling | null;
  customerInvoices: Invoice[];
  rates?: Rate[];
  allKtmBillings?: KathmanduBilling[];
  onSave: (billing: KathmanduBilling) => void;
  onCancel?: () => void;
  onPrint?: (billing: KathmanduBilling) => void;
  preselectedCustomerInvoiceId?: string;
  initialCustomerInvoiceId?: string;
}

export const KathmanduBillingForm: React.FC<KathmanduBillingFormProps> = ({
  initialData,
  editingBilling,
  customerInvoices,
  rates = [],
  allKtmBillings = [],
  onSave,
  onCancel,
  onPrint,
  preselectedCustomerInvoiceId,
  initialCustomerInvoiceId,
}) => {
  const activeInitial = initialData || editingBilling || null;
  const isEditMode = !!activeInitial;
  const initialInvId = preselectedCustomerInvoiceId || initialCustomerInvoiceId || activeInitial?.customer_invoice_id || '';

  // Selected customer invoice ID
  const [selectedCustInvId, setSelectedCustInvId] = useState<string>(initialInvId);

  // Form state
  const [ktmInvoiceNo, setKtmInvoiceNo] = useState<string>(
    activeInitial?.ktm_invoice_no || generateNextKtmInvoiceNo(allKtmBillings)
  );
  const [ktmDate, setKtmDate] = useState<string>(
    activeInitial?.ktm_date || new Date().toISOString().split('T')[0]
  );

  // Customer / Sender Details
  const [senderName, setSenderName] = useState<string>(activeInitial?.sender_name || '');
  const [senderPhone, setSenderPhone] = useState<string>(activeInitial?.sender_phone || '');
  const [senderAddress, setSenderAddress] = useState<string>(activeInitial?.sender_address || '');

  // Receiver Details
  const [receiverName, setReceiverName] = useState<string>(activeInitial?.receiver_name || '');
  const [receiverPhone, setReceiverPhone] = useState<string>(activeInitial?.receiver_phone || '');
  const [receiverAddress, setReceiverAddress] = useState<string>(activeInitial?.receiver_address || '');
  const [country, setCountry] = useState<string>(activeInitial?.country || 'Australia');
  const [transportType, setTransportType] = useState<TransportType>(activeInitial?.transport_type || 'Air');

  // Forwarder / Airport Hub Info
  const [forwarderName, setForwarderName] = useState<string>(
    activeInitial?.forwarder_name || 'Nepal Air Cargo Forwarders KTM'
  );
  const [forwarderPhone, setForwarderPhone] = useState<string>(activeInitial?.forwarder_phone || '');
  const [forwarderPan, setForwarderPan] = useState<string>(activeInitial?.forwarder_pan || '');
  const [awbNo, setAwbNo] = useState<string>(activeInitial?.awb_no || '');
  const [flightDeparture, setFlightDeparture] = useState<string>(
    activeInitial?.flight_departure || 'TIA KTM Hub - Air Cargo'
  );

  // Shipment Specs
  const [weight, setWeight] = useState<number>(activeInitial?.weight || 5);
  const [netWeight, setNetWeight] = useState<number>(activeInitial?.net_weight || activeInitial?.weight || 5);
  const [boxCount, setBoxCount] = useState<number>(activeInitial?.box_count || 1);

  // Items List
  const [items, setItems] = useState<InvoiceItem[]>(
    activeInitial?.items && activeInitial.items.length > 0
      ? activeInitial.items
      : [{ id: 'item-1', item_name: 'General Cargo & Household Items', quantity: 1, item_type: 'Normal', box_number: 1 }]
  );

  // Cost Breakdown
  const [freightRatePerKg, setFreightRatePerKg] = useState<number>(activeInitial?.freight_rate_per_kg || 0);
  const [freightCost, setFreightCost] = useState<number>(activeInitial?.freight_cost || 0);
  const [customClearanceCost, setCustomClearanceCost] = useState<number>(activeInitial?.custom_clearance_cost || 0);
  const [handlingCost, setHandlingCost] = useState<number>(activeInitial?.handling_cost || 0);
  const [meatExtraCost, setMeatExtraCost] = useState<number>(activeInitial?.meat_extra_cost || 0);
  const [medicineExtraCost, setMedicineExtraCost] = useState<number>(activeInitial?.medicine_extra_cost || 0);
  const [otherSurcharges, setOtherSurcharges] = useState<number>(activeInitial?.other_surcharges || 0);
  const [discountAmount, setDiscountAmount] = useState<number>(activeInitial?.discount_amount || 0);

  // Payment Status & Tracking
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(activeInitial?.payment_status || 'Paid');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(activeInitial?.payment_method || 'Bank Transfer');
  const [amountPaid, setAmountPaid] = useState<number>(
    activeInitial?.amount_paid !== undefined
      ? activeInitial.amount_paid
      : (activeInitial?.payment_status === 'Paid' ? (activeInitial?.total_cost || 0) : 0)
  );

  // Shipping & Transit Status
  const [shippingStatus, setShippingStatus] = useState<
    'Pending Dispatch' | 'In Transit to KTM' | 'Received at KTM Hub' | 'Customs Cleared at TIA' | 'Dispatched / Air Shipped' | 'Delivered'
  >(activeInitial?.shipping_status || 'Pending Dispatch');
  const [dispatchDate, setDispatchDate] = useState<string>(
    activeInitial?.dispatch_date || activeInitial?.ktm_date || new Date().toISOString().split('T')[0]
  );
  const [vehicleNo, setVehicleNo] = useState<string>(activeInitial?.vehicle_no || '');
  const [driverPhone, setDriverPhone] = useState<string>(activeInitial?.driver_phone || '');
  const [notes, setNotes] = useState<string>(activeInitial?.notes || '');

  // Validation error & status toast
  const [error, setError] = useState<string | null>(null);
  const [autoFetchedNotification, setAutoFetchedNotification] = useState<string | null>(null);
  const [hasDraftRestored, setHasDraftRestored] = useState<boolean>(false);

  // Helper to get linked customer invoice
  const linkedCustomerInvoice = customerInvoices.find((inv) => inv.id === selectedCustInvId);

  // On mount: if not editing, check for auto-saved draft
  useEffect(() => {
    if (!activeInitial) {
      try {
        const savedDraft = localStorage.getItem('csp_ktm_billing_draft');
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed.selectedCustInvId) setSelectedCustInvId(parsed.selectedCustInvId);
          if (parsed.ktmInvoiceNo) setKtmInvoiceNo(parsed.ktmInvoiceNo);
          if (parsed.ktmDate) setKtmDate(parsed.ktmDate);
          if (parsed.senderName) setSenderName(parsed.senderName);
          if (parsed.senderPhone) setSenderPhone(parsed.senderPhone);
          if (parsed.senderAddress) setSenderAddress(parsed.senderAddress);
          if (parsed.receiverName) setReceiverName(parsed.receiverName);
          if (parsed.receiverPhone) setReceiverPhone(parsed.receiverPhone);
          if (parsed.receiverAddress) setReceiverAddress(parsed.receiverAddress);
          if (parsed.country) setCountry(parsed.country);
          if (parsed.transportType) setTransportType(parsed.transportType);
          if (parsed.forwarderName) setForwarderName(parsed.forwarderName);
          if (parsed.forwarderPhone) setForwarderPhone(parsed.forwarderPhone);
          if (parsed.forwarderPan) setForwarderPan(parsed.forwarderPan);
          if (parsed.awbNo) setAwbNo(parsed.awbNo);
          if (parsed.flightDeparture) setFlightDeparture(parsed.flightDeparture);
          if (parsed.weight !== undefined) setWeight(parsed.weight);
          if (parsed.netWeight !== undefined) setNetWeight(parsed.netWeight);
          if (parsed.boxCount !== undefined) setBoxCount(parsed.boxCount);
          if (parsed.items && Array.isArray(parsed.items)) setItems(parsed.items);
          if (parsed.freightRatePerKg !== undefined) setFreightRatePerKg(parsed.freightRatePerKg);
          if (parsed.freightCost !== undefined) setFreightCost(parsed.freightCost);
          if (parsed.customClearanceCost !== undefined) setCustomClearanceCost(parsed.customClearanceCost);
          if (parsed.handlingCost !== undefined) setHandlingCost(parsed.handlingCost);
          if (parsed.meatExtraCost !== undefined) setMeatExtraCost(parsed.meatExtraCost);
          if (parsed.otherSurcharges !== undefined) setOtherSurcharges(parsed.otherSurcharges);
          if (parsed.discountAmount !== undefined) setDiscountAmount(parsed.discountAmount);
          if (parsed.paymentStatus) setPaymentStatus(parsed.paymentStatus);
          if (parsed.paymentMethod) setPaymentMethod(parsed.paymentMethod);
          if (parsed.notes) setNotes(parsed.notes);
          setHasDraftRestored(true);
        } else if (initialInvId) {
          handleSelectCustomerInvoice(initialInvId);
        }
      } catch (e) {
        console.error('Error loading KTM draft:', e);
      }
    } else {
      // If editing an existing billing, populate all its fields
      setSelectedCustInvId(activeInitial.customer_invoice_id || '');
      setKtmInvoiceNo(activeInitial.ktm_invoice_no || '');
      setKtmDate(activeInitial.ktm_date || new Date().toISOString().split('T')[0]);
      setSenderName(activeInitial.sender_name || '');
      setSenderPhone(activeInitial.sender_phone || '');
      setSenderAddress(activeInitial.sender_address || '');
      setReceiverName(activeInitial.receiver_name || '');
      setReceiverPhone(activeInitial.receiver_phone || '');
      setReceiverAddress(activeInitial.receiver_address || '');
      setCountry(activeInitial.country || 'Australia');
      setTransportType(activeInitial.transport_type || 'Air');
      setForwarderName(activeInitial.forwarder_name || 'Nepal Air Cargo Forwarders KTM');
      setForwarderPhone(activeInitial.forwarder_phone || '');
      setForwarderPan(activeInitial.forwarder_pan || '');
      setAwbNo(activeInitial.awb_no || '');
      setFlightDeparture(activeInitial.flight_departure || 'TIA KTM Hub - Air Cargo');
      setWeight(activeInitial.weight || 5);
      setNetWeight(activeInitial.net_weight || activeInitial.weight || 5);
      setBoxCount(activeInitial.box_count || 1);
      if (activeInitial.items && activeInitial.items.length > 0) {
        setItems(activeInitial.items);
      }
      setFreightRatePerKg(activeInitial.freight_rate_per_kg || 0);
      setFreightCost(activeInitial.freight_cost || 0);
      setCustomClearanceCost(activeInitial.custom_clearance_cost || 0);
      setHandlingCost(activeInitial.handling_cost || 0);
      setMeatExtraCost(activeInitial.meat_extra_cost || 0);
      setMedicineExtraCost(activeInitial.medicine_extra_cost || 0);
      setOtherSurcharges(activeInitial.other_surcharges || 0);
      setDiscountAmount(activeInitial.discount_amount || 0);
      setPaymentStatus(activeInitial.payment_status || 'Paid');
      setPaymentMethod(activeInitial.payment_method || 'Bank Transfer');
      setNotes(activeInitial.notes || '');
    }
  }, [activeInitial]);

  // Auto-save draft when not in edit mode
  useEffect(() => {
    if (!activeInitial) {
      const draft = {
        selectedCustInvId,
        ktmInvoiceNo,
        ktmDate,
        senderName,
        senderPhone,
        senderAddress,
        receiverName,
        receiverPhone,
        receiverAddress,
        country,
        transportType,
        forwarderName,
        forwarderPhone,
        forwarderPan,
        awbNo,
        flightDeparture,
        weight,
        netWeight,
        boxCount,
        items,
        freightRatePerKg,
        freightCost,
        customClearanceCost,
        handlingCost,
        meatExtraCost,
        medicineExtraCost,
        otherSurcharges,
        discountAmount,
        paymentStatus,
        paymentMethod,
        notes,
      };
      try {
        localStorage.setItem('csp_ktm_billing_draft', JSON.stringify(draft));
      } catch (e) {
        console.error('Failed to save KTM draft:', e);
      }
    }
  }, [
    activeInitial,
    selectedCustInvId,
    ktmInvoiceNo,
    ktmDate,
    senderName,
    senderPhone,
    senderAddress,
    receiverName,
    receiverPhone,
    receiverAddress,
    country,
    transportType,
    forwarderName,
    forwarderPhone,
    forwarderPan,
    awbNo,
    flightDeparture,
    weight,
    netWeight,
    boxCount,
    items,
    freightRatePerKg,
    freightCost,
    customClearanceCost,
    handlingCost,
    meatExtraCost,
    medicineExtraCost,
    otherSurcharges,
    discountAmount,
    paymentStatus,
    paymentMethod,
    notes,
  ]);

  const handleClearDraft = () => {
    localStorage.removeItem('csp_ktm_billing_draft');
    setHasDraftRestored(false);
    setSenderName('');
    setSenderPhone('');
    setSenderAddress('');
    setReceiverName('');
    setReceiverPhone('');
    setReceiverAddress('');
    setCountry('Australia');
    setTransportType('Air');
    setWeight(5);
    setNetWeight(5);
    setBoxCount(1);
    setItems([{ id: 'item-1', item_name: 'General Cargo & Household Items', quantity: 1, item_type: 'Normal', box_number: 1 }]);
    setFreightRatePerKg(0);
    setFreightCost(0);
    setCustomClearanceCost(0);
    setHandlingCost(0);
    setMeatExtraCost(0);
    setMedicineExtraCost(0);
    setOtherSurcharges(0);
    setDiscountAmount(0);
    setAwbNo('');
    setSelectedCustInvId('');
    setAutoFetchedNotification('Working draft cleared. You can start fresh or select a customer invoice.');
    setTimeout(() => setAutoFetchedNotification(null), 3000);
  };

  // Auto-fetch data whenever a Customer Invoice is selected
  const handleSelectCustomerInvoice = (invId: string) => {
    setSelectedCustInvId(invId);
    if (!invId) return;

    const targetInv = customerInvoices.find((inv) => inv.id === invId);
    if (!targetInv) return;

    // Auto-populate customer & receiver details with strict phone field separation
    setSenderName(targetInv.sender_name || '');
    setSenderPhone(targetInv.sender_phone || '');
    setSenderAddress(targetInv.sender_address || '');
    setReceiverName(targetInv.receiver_name || '');
    setReceiverPhone(targetInv.receiver_phone || targetInv.phone || '');
    setReceiverAddress(targetInv.receiver_address || '');
    setCountry(targetInv.country || 'Australia');
    setTransportType(targetInv.transport_type || 'Air');
    setWeight(targetInv.weight || 1);
    setNetWeight(targetInv.net_weight || targetInv.weight || 1);
    setBoxCount(targetInv.box_count || 1);

    if (targetInv.items && targetInv.items.length > 0) {
      setItems(JSON.parse(JSON.stringify(targetInv.items)));
    }

    if (targetInv.awb_no) {
      setAwbNo(targetInv.awb_no);
    }
    if (targetInv.departure) {
      setFlightDeparture(targetInv.departure);
    }

    // Auto-calculate suggested purchase freight & customs cost
    const pb = getInvoicePurchaseBreakdown(targetInv);
    const meat = getInvoiceMeatBreakdown(targetInv);

    const calcFreight = pb.freightPurchase || (targetInv.weight * 900);
    const calcCustom = pb.customPurchaseCost || 0;
    const calcMeat = meat.hasMeat ? Math.round(meat.meatWeight * 200) : 0;

    setFreightCost(calcFreight);
    setFreightRatePerKg(targetInv.weight > 0 ? Math.round((calcFreight / targetInv.weight) * 100) / 100 : 0);
    setCustomClearanceCost(calcCustom);
    setMeatExtraCost(calcMeat);
    setHandlingCost(300 * (targetInv.box_count || 1));

    setAutoFetchedNotification(
      `✓ Successfully auto-fetched customer details & items from Invoice #${targetInv.invoice_no} (${targetInv.sender_name} → ${targetInv.receiver_name})`
    );

    setTimeout(() => {
      setAutoFetchedNotification(null);
    }, 4000);
  };

  // If preselectedCustomerInvoiceId was given on mount and no initialData, auto-select
  useEffect(() => {
    if (!initialData && preselectedCustomerInvoiceId) {
      handleSelectCustomerInvoice(preselectedCustomerInvoiceId);
    }
  }, [preselectedCustomerInvoiceId]);

  // Recalculate freight cost when freight rate per kg or weight changes (if freight cost is not manually typed)
  const handleFreightRateChange = (ratePerKg: number) => {
    setFreightRatePerKg(ratePerKg);
    if (ratePerKg > 0 && weight > 0) {
      setFreightCost(Math.round(ratePerKg * weight));
    }
  };

  // Compute live total Kathmandu Cost
  const totalKathmanduCost = calculateKathmanduBillingTotals(
    freightCost,
    customClearanceCost,
    handlingCost,
    meatExtraCost,
    otherSurcharges,
    discountAmount,
    medicineExtraCost
  );

  // Customer Billed Revenue & Estimated Gross Margin on this shipment
  const customerBilledRevenue = linkedCustomerInvoice
    ? Math.max(0, (linkedCustomerInvoice.sale_amount || 0) + (linkedCustomerInvoice.custom_duty_amount || 0) - (linkedCustomerInvoice.discount_amount || 0))
    : 0;

  const shipmentGrossMargin = customerBilledRevenue > 0 ? customerBilledRevenue - totalKathmanduCost : 0;

  // Item management
  const addItem = () => {
    setItems([
      ...items,
      {
        id: `item-${Date.now()}`,
        item_name: '',
        quantity: 1,
        item_type: 'Normal',
        box_number: 1,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((it) => it.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, val: any) => {
    setItems(
      items.map((it) => {
        if (it.id === id) {
          return { ...it, [field]: val };
        }
        return it;
      })
    );
  };

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!ktmInvoiceNo.trim()) {
      setError('Kathmandu Invoice Number is required.');
      return;
    }
    if (!senderName.trim()) {
      setError('Customer / Sender name is required.');
      return;
    }
    if (!receiverName.trim()) {
      setError('Consignee / Receiver name is required.');
      return;
    }
    if (!country.trim()) {
      setError('Destination country is required.');
      return;
    }
    if (weight <= 0) {
      setError('Shipment weight must be greater than 0 kg.');
      return;
    }
    if (boxCount <= 0) {
      setError('Box count must be at least 1.');
      return;
    }
    if (freightCost < 0) {
      setError('Freight cost cannot be negative.');
      return;
    }

    // Find best matching customer invoice if not explicitly chosen
    let effectiveCustInvId = selectedCustInvId || undefined;
    let effectiveCustInvNo = linkedCustomerInvoice?.invoice_no || undefined;

    if (!effectiveCustInvId && customerInvoices.length > 0) {
      const match = customerInvoices.find(
        (inv) =>
          (awbNo && inv.awb_no && inv.awb_no.trim().toLowerCase() === awbNo.trim().toLowerCase()) ||
          (senderName &&
            inv.sender_name &&
            inv.sender_name.trim().toLowerCase() === senderName.trim().toLowerCase() &&
            inv.country?.trim().toLowerCase() === country.trim().toLowerCase()) ||
          customerInvoices.length === 1
      );
      if (match) {
        effectiveCustInvId = match.id;
        effectiveCustInvNo = match.invoice_no;
      }
    }

    const billingRecord: KathmanduBilling = {
      id: activeInitial?.id || `ktm-${Date.now()}`,
      ktm_invoice_no: ktmInvoiceNo.trim().toUpperCase(),
      ktm_date: ktmDate,
      customer_invoice_id: effectiveCustInvId,
      customer_invoice_no: effectiveCustInvNo,
      sender_name: senderName.trim(),
      sender_phone: senderPhone.trim(),
      sender_address: senderAddress.trim() || undefined,
      receiver_name: receiverName.trim(),
      receiver_phone: receiverPhone.trim() || undefined,
      receiver_address: receiverAddress.trim() || undefined,
      country: country.trim(),
      transport_type: transportType,
      forwarder_name: forwarderName.trim() || undefined,
      forwarder_phone: forwarderPhone.trim() || undefined,
      forwarder_pan: forwarderPan.trim() || undefined,
      awb_no: awbNo.trim() || undefined,
      flight_departure: flightDeparture.trim() || undefined,
      weight: Number(weight) || 1,
      net_weight: Number(netWeight) || Number(weight) || 1,
      box_count: Number(boxCount) || 1,
      items: items.map((it) => ({
        ...it,
        item_name: it.item_name.trim() || 'Cargo Item',
      })),
      freight_rate_per_kg: Number(freightRatePerKg) || undefined,
      freight_cost: Number(freightCost) || 0,
      custom_clearance_cost: Number(customClearanceCost) || 0,
      handling_cost: Number(handlingCost) || 0,
      meat_extra_cost: Number(meatExtraCost) || 0,
      medicine_extra_cost: Number(medicineExtraCost) || 0,
      other_surcharges: Number(otherSurcharges) || 0,
      discount_amount: Number(discountAmount) || 0,
      total_cost: totalKathmanduCost,
      amount_paid: paymentStatus === 'Paid' ? totalKathmanduCost : (paymentStatus === 'Unpaid' ? 0 : Math.min(totalKathmanduCost, Number(amountPaid) || 0)),
      amount_due: Math.max(0, totalKathmanduCost - (paymentStatus === 'Paid' ? totalKathmanduCost : (paymentStatus === 'Unpaid' ? 0 : Math.min(totalKathmanduCost, Number(amountPaid) || 0)))),
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      shipping_status: shippingStatus,
      dispatch_date: dispatchDate,
      vehicle_no: vehicleNo.trim() || undefined,
      driver_phone: driverPhone.trim() || undefined,
      notes: notes.trim() || undefined,
      created_at: activeInitial?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    localStorage.removeItem('csp_ktm_billing_draft');
    onSave(billingRecord);
  };

  const handleSaveAndDownloadPDF = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!ktmInvoiceNo.trim() || !senderName.trim() || !receiverName.trim() || !country.trim()) {
      setError('Please fill in required fields (Invoice No, Sender, Receiver, Country) before saving.');
      return;
    }

    const computedPaid = paymentStatus === 'Paid' ? totalKathmanduCost : (paymentStatus === 'Unpaid' ? 0 : Math.min(totalKathmanduCost, Number(amountPaid) || 0));
    const computedDue = Math.max(0, totalKathmanduCost - computedPaid);

    const currentBilling: KathmanduBilling = {
      id: activeInitial?.id || `ktm-${Date.now()}`,
      ktm_invoice_no: ktmInvoiceNo.trim().toUpperCase(),
      ktm_date: ktmDate,
      customer_invoice_id: selectedCustInvId || undefined,
      customer_invoice_no: linkedCustomerInvoice?.invoice_no || undefined,
      sender_name: senderName.trim(),
      sender_phone: senderPhone.trim(),
      sender_address: senderAddress.trim() || undefined,
      receiver_name: receiverName.trim(),
      receiver_phone: receiverPhone.trim() || undefined,
      receiver_address: receiverAddress.trim() || undefined,
      country: country.trim(),
      transport_type: transportType,
      forwarder_name: forwarderName.trim() || undefined,
      forwarder_phone: forwarderPhone.trim() || undefined,
      forwarder_pan: forwarderPan.trim() || undefined,
      awb_no: awbNo.trim() || undefined,
      flight_departure: flightDeparture.trim() || undefined,
      weight: Number(weight) || 1,
      net_weight: Number(netWeight) || Number(weight) || 1,
      box_count: Number(boxCount) || 1,
      items: items.map((it) => ({ ...it, item_name: it.item_name.trim() || 'Cargo Item' })),
      freight_rate_per_kg: Number(freightRatePerKg) || undefined,
      freight_cost: Number(freightCost) || 0,
      custom_clearance_cost: Number(customClearanceCost) || 0,
      handling_cost: Number(handlingCost) || 0,
      meat_extra_cost: Number(meatExtraCost) || 0,
      medicine_extra_cost: Number(medicineExtraCost) || 0,
      other_surcharges: Number(otherSurcharges) || 0,
      discount_amount: Number(discountAmount) || 0,
      total_cost: totalKathmanduCost,
      amount_paid: computedPaid,
      amount_due: computedDue,
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      shipping_status: shippingStatus,
      dispatch_date: dispatchDate,
      vehicle_no: vehicleNo.trim() || undefined,
      driver_phone: driverPhone.trim() || undefined,
      notes: notes.trim() || undefined,
      created_at: activeInitial?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    localStorage.removeItem('csp_ktm_billing_draft');
    onSave(currentBilling);
    downloadKathmanduBillingPDF(currentBilling);
  };

  const handleDownloadExcel = (e: React.MouseEvent) => {
    e.preventDefault();
    const currentBilling: KathmanduBilling = {
      id: activeInitial?.id || `ktm-${Date.now()}`,
      ktm_invoice_no: ktmInvoiceNo.trim().toUpperCase(),
      ktm_date: ktmDate,
      customer_invoice_id: selectedCustInvId || undefined,
      customer_invoice_no: linkedCustomerInvoice?.invoice_no || undefined,
      sender_name: senderName.trim() || 'Sender',
      sender_phone: senderPhone.trim(),
      sender_address: senderAddress.trim() || undefined,
      receiver_name: receiverName.trim() || 'Receiver',
      receiver_phone: receiverPhone.trim() || undefined,
      receiver_address: receiverAddress.trim() || undefined,
      country: country.trim() || 'Nepal',
      transport_type: transportType,
      forwarder_name: forwarderName.trim() || undefined,
      forwarder_phone: forwarderPhone.trim() || undefined,
      forwarder_pan: forwarderPan.trim() || undefined,
      awb_no: awbNo.trim() || undefined,
      flight_departure: flightDeparture.trim() || undefined,
      weight: Number(weight) || 1,
      net_weight: Number(netWeight) || Number(weight) || 1,
      box_count: Number(boxCount) || 1,
      items: items.map((it) => ({ ...it, item_name: it.item_name.trim() || 'Cargo Item' })),
      freight_rate_per_kg: Number(freightRatePerKg) || undefined,
      freight_cost: Number(freightCost) || 0,
      custom_clearance_cost: Number(customClearanceCost) || 0,
      handling_cost: Number(handlingCost) || 0,
      meat_extra_cost: Number(meatExtraCost) || 0,
      medicine_extra_cost: Number(medicineExtraCost) || 0,
      other_surcharges: Number(otherSurcharges) || 0,
      discount_amount: Number(discountAmount) || 0,
      total_cost: totalKathmanduCost,
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      notes: notes.trim() || undefined,
      created_at: initialData?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    exportKathmanduBillingToExcel(currentBilling);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 sm:p-6 rounded-xl shadow-md border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600/30 border border-blue-400/30 text-blue-300">
              <Building2 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                {isEditMode ? `Edit Kathmandu Bill: ${ktmInvoiceNo}` : 'New Kathmandu Billing Voucher'}
              </h2>
              <p className="text-xs text-slate-300">
                Forwarder purchase cost, airport customs clearance, & Kathmandu dispatch statement
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleDownloadExcel}
            title="Download Kathmandu billing data in Excel format"
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 border border-emerald-600/50 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Download Excel</span>
          </button>
          <button
            type="button"
            onClick={handleSaveAndDownloadPDF}
            title="Save to database & download PDF voucher"
            className="px-3.5 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save & Download PDF</span>
          </button>
          {initialData && onPrint && (
            <button
              type="button"
              onClick={() => onPrint(initialData)}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Bill</span>
            </button>
          )}
        </div>
      </div>

      {/* Auto-Fetched Notification Banner */}
      {autoFetchedNotification && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-lg text-xs font-medium flex items-center gap-2 shadow-xs transition animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{autoFetchedNotification}</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-300 text-rose-800 px-4 py-3 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs">
          <Info className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Customer Invoice Connection & Automatic Fetcher */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800">
                1. Connect to Customer Billing (Auto-Fetch Details)
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
              Links Customer Revenue to Kathmandu Cost
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Select Customer Invoice to Auto-Populate:
              </label>
              <div className="relative">
                <select
                  value={selectedCustInvId}
                  onChange={(e) => handleSelectCustomerInvoice(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                >
                  <option value="">-- Standalone Kathmandu Bill (Or Select Customer Invoice) --</option>
                  {customerInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_no} | {inv.sender_name} → {inv.receiver_name} ({inv.country}, {inv.weight} kg, {formatCurrency(inv.sale_amount)})
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-slate-500">
                Selecting a customer invoice automatically fills customer name, phone, address, receiver, item list, box weights, and destination.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">KTM Bill No.</label>
                <input
                  type="text"
                  value={ktmInvoiceNo}
                  onChange={(e) => setKtmInvoiceNo(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-blue-700 uppercase"
                  placeholder="KTM-001"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">KTM Bill Date</label>
                <input
                  type="date"
                  value={ktmDate}
                  onChange={(e) => setKtmDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700"
                  required
                />
              </div>
            </div>
          </div>

          {/* Linked Customer Invoice Mini Summary Card */}
          {linkedCustomerInvoice && (
            <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  INV
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-900">
                      Linked Customer Ref: {linkedCustomerInvoice.invoice_no}
                    </span>
                    <span className="text-[10px] bg-blue-200/80 text-blue-800 font-semibold px-2 py-0.5 rounded">
                      {linkedCustomerInvoice.invoice_date}
                    </span>
                  </div>
                  <p className="text-xs text-blue-800">
                    Sender: <span className="font-semibold">{linkedCustomerInvoice.sender_name}</span> | Destination: <span className="font-semibold">{linkedCustomerInvoice.country}</span> ({linkedCustomerInvoice.weight} kg)
                  </p>
                </div>
              </div>

              <div className="text-right sm:border-l sm:border-blue-200 sm:pl-4">
                <p className="text-[10px] text-blue-700 font-medium">Customer Billed Amount</p>
                <p className="text-sm font-bold text-blue-900">
                  {formatCurrency(customerBilledRevenue)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Forwarder, Route & Shipment Specs */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Plane className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">
              2. Kathmandu Forwarder, Airline & Carrier Specs
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kathmandu Forwarder / Hub</label>
              <input
                type="text"
                value={forwarderName}
                onChange={(e) => setForwarderName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:bg-white"
                placeholder="e.g. Nepal Air Cargo Forwarders"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Forwarder Phone / Contact</label>
              <input
                type="text"
                value={forwarderPhone}
                onChange={(e) => setForwarderPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:bg-white"
                placeholder="+977-1-4478901"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Master AWB / Tracking No.</label>
              <input
                type="text"
                value={awbNo}
                onChange={(e) => setAwbNo(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:bg-white"
                placeholder="AWB-987654321"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Flight / Departure Hub</label>
              <input
                type="text"
                value={flightDeparture}
                onChange={(e) => setFlightDeparture(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:bg-white"
                placeholder="TIA KTM - Flight SQ 442"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Chargeable Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={weight || ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setWeight(val);
                  if (freightRatePerKg > 0) {
                    setFreightCost(Math.round(val * freightRatePerKg));
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-blue-700"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Net Scale Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={netWeight || ''}
                onChange={(e) => setNetWeight(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Box / Package Count</label>
              <input
                type="number"
                min="1"
                value={boxCount || ''}
                onChange={(e) => setBoxCount(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Transport Mode</label>
              <select
                value={transportType}
                onChange={(e) => setTransportType(e.target.value as TransportType)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800"
              >
                <option value="Air">Air Cargo Express</option>
                <option value="Cargo">Commercial Surface Cargo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Customer & Consignee Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <User className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">
              3. Customer (Sender) & Consignee (Receiver) Details
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Sender Column */}
            <div className="p-3.5 rounded-lg bg-slate-50/70 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Customer (Sender)</span>
                <span className="text-[10px] text-slate-400">Auto-fetched from Customer Invoice</span>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Sender Name</label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold text-slate-800"
                    placeholder="Customer Name"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Phone</label>
                    <input
                      type="text"
                      value={senderPhone}
                      onChange={(e) => setSenderPhone(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800"
                      placeholder="Phone"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Address / Origin</label>
                    <input
                      type="text"
                      value={senderAddress}
                      onChange={(e) => setSenderAddress(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800"
                      placeholder="Pokhara, Nepal"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Receiver Column */}
            <div className="p-3.5 rounded-lg bg-slate-50/70 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Consignee (Receiver)</span>
                <span className="text-[10px] text-slate-400">Destination</span>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Receiver Name</label>
                  <input
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold text-slate-800"
                    placeholder="Receiver / Consignee"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Destination Country</label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-bold text-blue-800"
                      placeholder="e.g. Australia"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Receiver Phone</label>
                    <input
                      type="text"
                      value={receiverPhone}
                      onChange={(e) => setReceiverPhone(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800"
                      placeholder="Receiver Phone"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Delivery Address</label>
                  <input
                    type="text"
                    value={receiverAddress}
                    onChange={(e) => setReceiverAddress(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800"
                    placeholder="Street, City, Postal Code"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Item List */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800">
                4. Manifest Items & Customs Categories ({items.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={addItem}
              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded flex items-center gap-1 border border-blue-200 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="space-y-2">
            {items.map((item, idx) => (
              <div
                key={item.id || idx}
                className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
              >
                <div className="col-span-12 sm:col-span-5">
                  <input
                    type="text"
                    value={item.item_name}
                    onChange={(e) => updateItem(item.id, 'item_name', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-medium text-slate-800"
                    placeholder="Description of Goods"
                    required
                  />
                </div>

                <div className="col-span-4 sm:col-span-2">
                  <select
                    value={item.item_type}
                    onChange={(e) => updateItem(item.id, 'item_type', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-slate-700"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Dry Meat">Dry Meat / Sukuti</option>
                    <option value="Pickle">Pickle / Achar</option>
                    <option value="Meat">Fresh Meat</option>
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity || 1}
                    onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-xs text-center"
                    placeholder="Qty"
                    title="Quantity"
                  />
                </div>

                <div className="col-span-3 sm:col-span-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={item.weight_kg != null ? item.weight_kg : ''}
                    onChange={(e) => updateItem(item.id, 'weight_kg', parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs"
                    placeholder="Weight (kg)"
                    title="Scale Weight in kg"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <input
                    type="number"
                    min="1"
                    value={item.box_number || 1}
                    onChange={(e) => updateItem(item.id, 'box_number', parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-xs text-center"
                    placeholder="Box #"
                    title="Assigned Box Number"
                  />
                </div>

                <div className="col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length <= 1}
                    className={`p-1 rounded text-slate-400 hover:text-rose-600 transition ${
                      items.length <= 1 ? 'opacity-30 cursor-not-allowed' : ''
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 5: Kathmandu Cost Breakdown & Real-Time Profit Calculation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Cost Inputs (2 cols) */}
          <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-800">
                5. Kathmandu Cost & Forwarder Billing Breakdown
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Freight Rate per kg (Rs/kg)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={freightRatePerKg || ''}
                  onChange={(e) => handleFreightRateChange(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800"
                  placeholder="e.g. 950"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Freight Purchase Cost (Rs)
                </label>
                <input
                  type="number"
                  min="0"
                  value={freightCost || ''}
                  onChange={(e) => setFreightCost(parseFloat(e.target.value) || 0)}
                  className="w-full bg-blue-50/50 border border-blue-300 rounded-lg px-3 py-1.5 text-xs font-bold text-blue-900"
                  placeholder="e.g. 14200"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Airport Customs Clearance Cost (Rs)
                </label>
                <input
                  type="number"
                  min="0"
                  value={customClearanceCost || ''}
                  onChange={(e) => setCustomClearanceCost(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800"
                  placeholder="e.g. 1000"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cargo Handling & Security Fee (Rs)
                </label>
                <input
                  type="number"
                  min="0"
                  value={handlingCost || ''}
                  onChange={(e) => setHandlingCost(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800"
                  placeholder="e.g. 500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dry Meat / Quarantine Clearance (Rs)
                </label>
                <input
                  type="number"
                  min="0"
                  value={meatExtraCost || ''}
                  onChange={(e) => setMeatExtraCost(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800"
                  placeholder="e.g. 600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Medicine & Pharma Clearance (Rs)
                </label>
                <input
                  type="number"
                  min="0"
                  value={medicineExtraCost || ''}
                  onChange={(e) => setMedicineExtraCost(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-emerald-800"
                  placeholder="e.g. 500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Forwarder Discount / Rebate (Rs)
                </label>
                <input
                  type="number"
                  min="0"
                  value={discountAmount || ''}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-rose-700"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => {
                    const next = e.target.value as PaymentStatus;
                    setPaymentStatus(next);
                    if (next === 'Paid') {
                      setAmountPaid(totalKathmanduCost);
                    } else if (next === 'Unpaid') {
                      setAmountPaid(0);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800"
                >
                  <option value="Paid">Paid to Forwarder (Settled)</option>
                  <option value="Partial">Partially Paid</option>
                  <option value="Unpaid">Unpaid / Due to Forwarder</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800"
                >
                  <option value="Bank Transfer">Bank Transfer (e.g. Nabil/Global)</option>
                  <option value="Cash">Cash at Counter</option>
                  <option value="eSewa / Khalti">eSewa / Khalti</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount Paid (NPR)
                </label>
                <input
                  type="number"
                  min="0"
                  max={totalKathmanduCost}
                  value={paymentStatus === 'Paid' ? totalKathmanduCost : (paymentStatus === 'Unpaid' ? 0 : amountPaid)}
                  disabled={paymentStatus === 'Paid' || paymentStatus === 'Unpaid'}
                  onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                  className={`w-full border rounded-lg px-3 py-1.5 text-xs font-bold ${
                    paymentStatus === 'Paid'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : paymentStatus === 'Unpaid'
                      ? 'bg-rose-50 text-rose-800 border-rose-300'
                      : 'bg-white text-blue-800 border-blue-300'
                  }`}
                  placeholder="Paid amount"
                />
              </div>
            </div>

            {/* Live payment balance feedback */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <span className="text-slate-500">Total Billed: </span>
                <span className="font-bold text-slate-800">{formatCurrency(totalKathmanduCost)}</span>
              </div>
              <div>
                <span className="text-slate-500">Paid so far: </span>
                <span className="font-bold text-emerald-700">
                  {formatCurrency(paymentStatus === 'Paid' ? totalKathmanduCost : (paymentStatus === 'Unpaid' ? 0 : amountPaid))}
                </span>
              </div>
              <div className="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-md">
                <span className="text-amber-800 font-semibold">Remaining Balance Left: </span>
                <span className="font-black text-amber-900">
                  {formatCurrency(
                    Math.max(
                      0,
                      totalKathmanduCost - (paymentStatus === 'Paid' ? totalKathmanduCost : (paymentStatus === 'Unpaid' ? 0 : amountPaid))
                    )
                  )}
                </span>
              </div>
            </div>

            {/* Shipping & Transit Details */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-2">
                <Truck className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-bold text-slate-700">Shipping & Transport Manifest Info</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Shipping Status</label>
                  <select
                    value={shippingStatus}
                    onChange={(e) => setShippingStatus(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold text-slate-800"
                  >
                    <option value="Pending Dispatch">Pending Dispatch</option>
                    <option value="In Transit to KTM">In Transit to KTM</option>
                    <option value="Received at KTM Hub">Received at KTM Hub</option>
                    <option value="Customs Cleared at TIA">Customs Cleared at TIA</option>
                    <option value="Dispatched / Air Shipped">Dispatched / Air Shipped</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Vehicle / Transporter No</label>
                  <input
                    type="text"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800"
                    placeholder="e.g. GA 2 KHA 8492"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Driver / Contact Phone</label>
                  <input
                    type="text"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800"
                    placeholder="e.g. 9846000000"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Remarks</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-800"
                placeholder="e.g. Delivered to KTM cargo hub, flight confirmed"
              />
            </div>
          </div>

          {/* Financial Reconciliation Card (1 col) */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-xl p-5 shadow-sm border border-slate-800 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Shipment Margin Summary
                </h4>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Customer Revenue:</span>
                  <span className="font-semibold text-white">
                    {customerBilledRevenue > 0 ? formatCurrency(customerBilledRevenue) : 'N/A (Unlinked)'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span>Kathmandu Freight:</span>
                  <span className="font-semibold">{formatCurrency(freightCost)}</span>
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span>Customs & Clearance:</span>
                  <span className="font-semibold">{formatCurrency(customClearanceCost)}</span>
                </div>

                {(handlingCost > 0 || meatExtraCost > 0) && (
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Handling & Surcharges:</span>
                    <span className="font-semibold">{formatCurrency(handlingCost + meatExtraCost)}</span>
                  </div>
                )}

                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-emerald-400">
                    <span>Forwarder Discount:</span>
                    <span className="font-semibold">-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 space-y-3">
              <div className="bg-slate-800/80 rounded-lg p-3 border border-slate-700/60">
                <p className="text-[11px] text-slate-400 font-medium">Total Kathmandu Billing Cost</p>
                <p className="text-xl font-black text-rose-400 tracking-tight">
                  {formatCurrency(totalKathmanduCost)}
                </p>
              </div>

              {customerBilledRevenue > 0 && (
                <div className="bg-emerald-950/40 rounded-lg p-3 border border-emerald-800/50">
                  <p className="text-[11px] text-emerald-300 font-medium">Estimated Shipment Margin</p>
                  <p className={`text-lg font-black tracking-tight ${shipmentGrossMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(shipmentGrossMargin)}
                  </p>
                  <p className="text-[10px] text-emerald-400/80 mt-0.5">
                    Revenue ({formatCurrency(customerBilledRevenue)}) − KTM Cost ({formatCurrency(totalKathmanduCost)})
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-4 border-t border-slate-200">
          <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">Direct Cloud Firestore Database Persistence Enabled</span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadExcel}
              className="px-4 py-2.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAndDownloadPDF}
              className="px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-blue-300" />
              <span>Save & Download PDF</span>
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isEditMode ? 'Update Kathmandu Billing' : 'Save Kathmandu Voucher'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
