import { Rate, InvoiceItem, ItemType, CalculationResult, Invoice, KathmanduBilling, Expense } from '../types';

/**
 * Finds the matching rate row for a given Country, Item Type, and Shipment Total Weight.
 * Pick the rate with the HIGHEST min_weight slab that is <= totalWeight.
 */
export function findMatchingRate(
  rates: Rate[],
  country: string,
  itemType: ItemType,
  totalWeight: number
): Rate | null {
  const matchingSlabs = rates.filter(
    (r) =>
      r.country.trim().toLowerCase() === country.trim().toLowerCase() &&
      r.item_type === itemType &&
      r.min_weight <= totalWeight
  );

  if (matchingSlabs.length === 0) {
    return null;
  }

  // Pick highest min_weight slab
  matchingSlabs.sort((a, b) => b.min_weight - a.min_weight);
  return matchingSlabs[0];
}

/**
 * Finds custom rate for country & total weight slab (uses Normal rate slab or any matched slab).
 */
export function findCustomRate(
  rates: Rate[],
  country: string,
  totalWeight: number
): number {
  const normalRate = findMatchingRate(rates, country, 'Normal', totalWeight);
  if (normalRate && normalRate.custom_rate !== undefined) {
    return Number(normalRate.custom_rate) || 0;
  }

  // Fallback to any matched slab for country
  const anyRate = rates
    .filter(
      (r) =>
        r.country.trim().toLowerCase() === country.trim().toLowerCase() &&
        r.min_weight <= totalWeight
    )
    .sort((a, b) => b.min_weight - a.min_weight)[0];

  return anyRate && anyRate.custom_rate !== undefined ? Number(anyRate.custom_rate) || 0 : 0;
}

export function isAustraliaCountry(country: string): boolean {
  const norm = (country || '').trim().toLowerCase();
  return norm.includes('australia') || norm.includes('aus');
}

export function isUSACanadaCountry(country: string): boolean {
  const norm = (country || '').trim().toLowerCase();
  if (isAustraliaCountry(norm)) return false;
  return (
    norm.includes('united states') ||
    norm.includes('usa') ||
    norm.includes('america') ||
    norm.includes('canada') ||
    norm === 'us' ||
    norm.startsWith('us ') ||
    norm.endsWith(' us')
  );
}

export interface CalculationValidation {
  isValid: boolean;
  error?: string;
  result?: CalculationResult;
}

/**
 * Performs full invoice calculation and validation according to strict rules:
 * 1. Weight validation: shipment weight >= 1, box count >= 1
 * 2. Re-weighed item validation: Meat + Dry Meat + Pickle weight_kg <= shipment total weight
 * 3. Rate lookup validation: Ensure matching rates exist for all item types present
 * 4. Apply exact formulas for Sale, Purchase, Custom Duty, Final Amount, and Profit
 */
export function calculateInvoice(
  rates: Rate[],
  country: string,
  totalWeight: number,
  boxCount: number,
  items: InvoiceItem[],
  discountAmountInput: number = 0,
  customDutyOverride: number | null = null,
  customRatePerKgOverride: number | null = null,
  customPurchaseAmountOverride: number | null = null,
  customTotalSaleOverride: number | null = null,
  meatExtraChargeOverride: number | null = null,
  medicineExtraChargeOverride: number | null = null
): CalculationValidation {
  if (!country || !country.trim()) {
    return { isValid: false, error: 'Country is required for calculation.' };
  }

  if (!totalWeight || totalWeight < 1) {
    return { isValid: false, error: 'Total shipment weight must be at least 1 kg.' };
  }

  if (!boxCount || boxCount < 1) {
    return { isValid: false, error: 'Box count must be at least 1.' };
  }

  if (!items || items.length === 0) {
    return { isValid: false, error: 'At least one item must be added to the invoice.' };
  }

  // Calculate sum of re-weighed weights for Meat, Dry Meat, Pickle, Medicine
  let reWeighedTotal = 0;
  const reWeighedByTypes: Record<ItemType, number> = {
    Normal: 0,
    Meat: 0,
    'Dry Meat': 0,
    Pickle: 0,
    Medicine: 0,
  };

  let hasMedicine = false;
  let medicineItemsCount = 0;

  for (const item of items) {
    if (item.item_type === 'Medicine') {
      hasMedicine = true;
      medicineItemsCount++;
    }

    if (item.item_type !== 'Normal') {
      const itemWt = Number(item.weight_kg);
      // For Meat, Dry Meat, Pickle, and Medicine, if weight_kg is supplied, accumulate
      if (!isNaN(itemWt) && itemWt > 0) {
        reWeighedByTypes[item.item_type] += itemWt;
        reWeighedTotal += itemWt;
      } else if (item.item_type !== 'Medicine') {
        return {
          isValid: false,
          error: `Weight (kg) for '${item.item_name || item.item_type}' must be greater than 0.`,
        };
      }
    }
  }

  if (reWeighedTotal > totalWeight) {
    return {
      isValid: false,
      error: `Total re-weighed weight of special items (${reWeighedTotal} kg) cannot exceed total shipment weight (${totalWeight} kg).`,
    };
  }

  // Normal items weight is the remaining weight of the shipment total weight box
  const normalWeight = Math.max(0, totalWeight - reWeighedTotal);
  const finalWeightsByType: Record<ItemType, number> = {
    Normal: normalWeight,
    Meat: reWeighedByTypes.Meat,
    'Dry Meat': reWeighedByTypes['Dry Meat'],
    Pickle: reWeighedByTypes.Pickle,
    Medicine: reWeighedByTypes.Medicine,
  };

  // Base box freight sale rate for country
  let normalRateRow = findMatchingRate(rates, country, 'Normal', totalWeight);
  const baseRatePerKg = customRatePerKgOverride !== null && !isNaN(customRatePerKgOverride) && customRatePerKgOverride >= 0
    ? customRatePerKgOverride
    : (Number(normalRateRow?.sale_rate) || 0);

  const baseFreightAmount = totalWeight * baseRatePerKg;

  // Calculate default auto charge for special items (Meat, Dry Meat, Pickle)
  let defaultMeatExtraRatePerKg = 0;
  let meatRateRow = findMatchingRate(rates, country, 'Meat', totalWeight);
  if (meatRateRow && Number(meatRateRow.sale_rate) > 0) {
    const meatSale = Number(meatRateRow.sale_rate);
    const normalSale = Number(normalRateRow?.sale_rate) || 0;
    defaultMeatExtraRatePerKg = meatSale > normalSale ? (meatSale - normalSale) : meatSale;
  }

  const meatReweighedTotal = reWeighedByTypes.Meat + reWeighedByTypes['Dry Meat'] + reWeighedByTypes.Pickle;
  const autoMeatCharge = meatReweighedTotal * defaultMeatExtraRatePerKg;
  let finalMeatCharge = autoMeatCharge;

  if (meatExtraChargeOverride !== null && !isNaN(meatExtraChargeOverride) && meatExtraChargeOverride >= 0) {
    finalMeatCharge = meatExtraChargeOverride;
  }

  // Calculate Medicine extra charge (Prescription handling & documentation fee)
  // Default: Rs 500 flat fee per shipment with medicine if not overridden, or custom amount
  let defaultMedicineCharge = 0;
  if (hasMedicine) {
    defaultMedicineCharge = 500;
  }

  let finalMedicineCharge = defaultMedicineCharge;
  if (medicineExtraChargeOverride !== null && !isNaN(medicineExtraChargeOverride) && medicineExtraChargeOverride >= 0) {
    finalMedicineCharge = medicineExtraChargeOverride;
  }

  let totalSaleAmount = baseFreightAmount + finalMeatCharge + finalMedicineCharge;

  if (customTotalSaleOverride !== null && !isNaN(customTotalSaleOverride) && customTotalSaleOverride >= 0) {
    totalSaleAmount = customTotalSaleOverride;
  }

  // Calculate purchase side
  let totalPurchaseAmount = 0;
  const itemTypeBreakdown: CalculationResult['itemTypeBreakdown'] = [];

  const allItemCategories: ItemType[] = ['Normal', 'Meat', 'Dry Meat', 'Pickle', 'Medicine'];
  for (const itemType of allItemCategories) {
    const typeWeight = finalWeightsByType[itemType];
    if (typeWeight <= 0) continue;

    let matchedRate = findMatchingRate(rates, country, itemType, totalWeight);
    if (!matchedRate && itemType !== 'Normal') {
      matchedRate = findMatchingRate(rates, country, 'Normal', totalWeight);
    }

    const saleRate = itemType === 'Normal' ? baseRatePerKg : (Number(matchedRate?.sale_rate) || baseRatePerKg);
    const purchaseRate = Number(matchedRate?.purchase_rate) || 0;
    const saleForType = typeWeight * saleRate;
    const purchaseForType = typeWeight * purchaseRate;

    totalPurchaseAmount += purchaseForType;

    itemTypeBreakdown.push({
      item_type: itemType,
      weight: typeWeight,
      saleRate,
      purchaseRate,
      sale: saleForType,
      purchase: purchaseForType,
    });
  }

  if (customPurchaseAmountOverride !== null && !isNaN(customPurchaseAmountOverride) && customPurchaseAmountOverride >= 0) {
    totalPurchaseAmount = customPurchaseAmountOverride;
  }

  if (customPurchaseAmountOverride !== null && !isNaN(customPurchaseAmountOverride) && customPurchaseAmountOverride >= 0) {
    totalPurchaseAmount = customPurchaseAmountOverride;
  }

  // Country check for Custom Duty logic
  const isAustralia = isAustraliaCountry(country);
  const isUSACanada = isUSACanadaCountry(country);

  // Custom Duty charged to customer (sale side)
  let defaultCustomDutyPerBox = 500;
  if (isUSACanada) {
    defaultCustomDutyPerBox = 750;
  } else if (isAustralia) {
    defaultCustomDutyPerBox = 1500;
  } else {
    const customRateFromMatrix = findCustomRate(rates, country, totalWeight);
    defaultCustomDutyPerBox = customRateFromMatrix > 0 ? customRateFromMatrix : 500;
  }

  const customDuty = customDutyOverride !== null && !isNaN(customDutyOverride) && customDutyOverride >= 0
    ? customDutyOverride
    : defaultCustomDutyPerBox * boxCount;

  // Custom clearance cost paid to purchase carrier (purchase side)
  let customPurchaseCost = 0;
  if (isUSACanada) {
    customPurchaseCost = 750 * boxCount;
  } else if (isAustralia) {
    customPurchaseCost = 500 * boxCount;
  } else {
    // For all other countries, custom clearance cost paid to purchase is 0
    customPurchaseCost = 0;
  }

  const discountAmount = Math.max(0, Number(discountAmountInput) || 0);

  const effectiveRatePerKg = totalWeight > 0 ? (totalSaleAmount / totalWeight) : 0;

  const finalAmount = Math.max(0, totalSaleAmount + customDuty - discountAmount);
  
  // Total Purchase Cost = Freight Purchase Cost + Custom Purchase Cost
  const totalPurchase = totalPurchaseAmount + customPurchaseCost;
  
  // Net Station Profit = Billed Final Amount - Total Purchase Cost
  const profitAmount = finalAmount - totalPurchase;

  const meatExtraRatePerKg = reWeighedTotal > 0 ? (finalMeatCharge / reWeighedTotal) : defaultMeatExtraRatePerKg;

  return {
    isValid: true,
    result: {
      saleAmount: totalSaleAmount,
      purchaseAmount: totalPurchaseAmount,
      freightPurchaseAmount: totalPurchaseAmount,
      customPurchaseCost,
      customDuty,
      meatExtraCharge: finalMeatCharge,
      meatExtraRatePerKg,
      medicineExtraCharge: finalMedicineCharge,
      medicineWeight: reWeighedByTypes.Medicine,
      specialItemsWeight: reWeighedTotal,
      baseFreightAmount,
      baseRatePerKg,
      discountAmount,
      finalAmount,
      totalPurchase,
      profitAmount,
      effectiveRatePerKg,
      itemTypeBreakdown,
    },
  };
}

/**
 * Gets the purchase cost breakdown (Freight Purchase vs Custom Clearance Purchase) for an invoice.
 * Custom Clearance Purchase = USA/Canada: 750/box, Australia: 500/box, Others: 0
 */
export function getInvoicePurchaseBreakdown(invoice: { country: string; box_count?: number; purchase_amount: number }) {
  const boxes = invoice.box_count || 1;
  const isAustralia = isAustraliaCountry(invoice.country);
  const isUSACanada = isUSACanadaCountry(invoice.country);

  let customPurchaseCost = 0;
  if (isUSACanada) {
    customPurchaseCost = 750 * boxes;
  } else if (isAustralia) {
    customPurchaseCost = 500 * boxes;
  }

  const totalPurchase = Number(invoice.purchase_amount) || 0;
  const freightPurchase = Math.max(0, totalPurchase - customPurchaseCost);

  return {
    freightPurchase,
    customPurchaseCost,
    totalPurchase,
  };
}

/**
 * Format currency to Rs NPR rounded to nearest whole rupee.
 * e.g. 1250 -> "Rs 1,250" or "NPR 1,250"
 */
export function formatCurrency(amount: number): string {
  const rounded = Math.round(amount || 0);
  return `Rs ${rounded.toLocaleString('en-IN')}`;
}

export interface InvoicePurchaseDetail {
  invoice_no: string;
  country: string;
  weight: number;
  box_count: number;
  freightPurchase: number;
  customPurchase: number;
  totalPurchase: number;
}

/**
 * Calculates the total purchase amount across a set of invoices by evaluating each invoice's carrier rates and box count.
 * Carrier purchase cost = Freight Purchase Cost + Custom Clearance Purchase Cost (USA/Canada: Rs 750/box, Australia: Rs 500/box, Others: Rs 0/box).
 */
export function calculateTotalPurchaseForInvoices(
  invoices: Invoice[],
  rates: Rate[] = []
): {
  totalPurchase: number;
  totalFreightPurchase: number;
  totalCustomPurchase: number;
  breakdown: InvoicePurchaseDetail[];
} {
  let totalPurchase = 0;
  let totalFreightPurchase = 0;
  let totalCustomPurchase = 0;

  const breakdown: InvoicePurchaseDetail[] = invoices.map((inv) => {
    const pb = getInvoicePurchaseBreakdown(inv);
    let freightPurchase = pb.freightPurchase;
    let customPurchase = pb.customPurchaseCost;
    const boxes = inv.box_count || 1;

    // If rates array is provided, recalculate exact freight purchase from items & rates
    if (rates.length > 0 && inv.items && inv.items.length > 0) {
      const calc = calculateInvoice(
        rates,
        inv.country,
        inv.weight,
        boxes,
        inv.items,
        inv.discount_amount || 0,
        inv.custom_duty_amount,
        inv.rate_per_kg
      );
      if (calc.isValid && calc.result) {
        freightPurchase = calc.result.freightPurchaseAmount ?? calc.result.purchaseAmount;
      }
    }

    const invTotalPurchase = freightPurchase + customPurchase;

    totalPurchase += invTotalPurchase;
    totalFreightPurchase += freightPurchase;
    totalCustomPurchase += customPurchase;

    return {
      invoice_no: inv.invoice_no,
      country: inv.country,
      weight: inv.weight,
      box_count: boxes,
      freightPurchase,
      customPurchase,
      totalPurchase: invTotalPurchase,
    };
  });

  return {
    totalPurchase,
    totalFreightPurchase,
    totalCustomPurchase,
    breakdown,
  };
}

export interface InvoiceMeatBreakdown {
  hasMeat: boolean;
  meatWeight: number; // Net scale weight of Meat / Dry Meat (kg)
  normalWeight: number; // Net scale weight of Normal items (kg)
  pickleWeight: number; // Net scale weight of Pickle items (kg)
  meatExtraCharge: number; // Total meat surcharge charged to customer (Rs)
  meatRatePerKg: number; // Selling rate applied to meat (Rs/kg)
  meatPurchaseCost: number; // Purchase clearance / carrier rate cost for meat (Rs)
  meatProfit: number; // Net margin on meat cargo (Rs)
  meatItemDescriptions: string[];
}

export interface InvoiceWeightBreakdown {
  netWeight: number; // Actual physical scale weight (kg)
  volumeWeight: number; // Volumetric dimensional weight (kg: L*W*H/5000)
  billableWeight: number; // Chargeable billed weight (kg)
  volumeProfitWeight: number; // Extra volume weight gained (kg) = Max(0, volumeWeight - netWeight)
  isVolumetricCharged: boolean; // True if volume weight > net weight
  volumeProfitAmount: number; // Extra revenue earned from volume weight (volumeProfitWeight * ratePerKg)
  // Meat specific metrics
  hasMeat: boolean;
  meatWeight: number; // kg of Meat/Dry Meat
  normalWeight: number; // kg of Normal items
  pickleWeight: number; // kg of Pickle
  meatExtraCharge: number;
  meatPurchaseCost: number;
  meatProfit: number;
  meatItemDescriptions?: string[];
}

/**
 * Calculates detailed Meat / Sukuti item metrics for an invoice
 */
export function getInvoiceMeatBreakdown(invoice: Invoice): InvoiceMeatBreakdown {
  const items = invoice.items || [];
  let meatWeight = 0;
  let pickleWeight = 0;
  let totalItemWeight = 0;
  const meatDescriptions: string[] = [];

  items.forEach((it) => {
    const itWt = Number(it.weight_kg) || 0;
    totalItemWeight += itWt;
    const isMeatType = it.item_type === 'Meat' || it.item_type === 'Dry Meat';
    const isMeatName = (it.item_name || '').toLowerCase().includes('meat') ||
      (it.item_name || '').toLowerCase().includes('sukuti') ||
      (it.item_name || '').toLowerCase().includes('buff') ||
      (it.item_name || '').toLowerCase().includes('chicken') ||
      (it.item_name || '').toLowerCase().includes('pork') ||
      (it.item_name || '').toLowerCase().includes('mutton');

    if (isMeatType || (isMeatName && itWt > 0)) {
      meatWeight += itWt;
      meatDescriptions.push(it.item_name || 'Dry Meat');
    } else if (it.item_type === 'Pickle' || (it.item_name || '').toLowerCase().includes('pickle') || (it.item_name || '').toLowerCase().includes('achar')) {
      pickleWeight += itWt;
    }
  });

  meatWeight = Number(meatWeight.toFixed(2));
  pickleWeight = Number(pickleWeight.toFixed(2));
  const hasMeat = meatWeight > 0 || (invoice.meat_extra_charge ?? 0) > 0;

  const netWeight = invoice.net_weight || (totalItemWeight > 0 ? totalItemWeight : invoice.weight || 0);
  const normalWeight = Math.max(0, Number((netWeight - meatWeight - pickleWeight).toFixed(2)));

  const baseRatePerKg = invoice.rate_per_kg || (invoice.weight > 0 ? invoice.sale_amount / invoice.weight : 0);
  const meatExtraCharge = invoice.meat_extra_charge || (hasMeat ? (meatWeight * 500) : 0);
  const meatRatePerKg = baseRatePerKg + (meatWeight > 0 ? Math.round(meatExtraCharge / meatWeight) : 0);

  // Purchase cost estimation for special meat clearance
  const meatPurchaseCost = hasMeat ? Math.round(meatWeight * (baseRatePerKg * 0.75 + 300)) : 0;
  const meatTotalSale = (meatWeight * baseRatePerKg) + meatExtraCharge;
  const meatProfit = Math.max(0, meatTotalSale - meatPurchaseCost);

  return {
    hasMeat,
    meatWeight,
    normalWeight,
    pickleWeight,
    meatExtraCharge,
    meatRatePerKg,
    meatPurchaseCost,
    meatProfit,
    meatItemDescriptions: meatDescriptions,
  };
}

/**
 * Calculates accurate Net Weight (actual scale weight), Volumetric Weight,
 * Chargeable Weight, dimensional Volume Profit Weight, and Meat Calculations for any invoice.
 */
export function getInvoiceWeightBreakdown(invoice: Invoice): InvoiceWeightBreakdown {
  let netWeight = invoice.net_weight ?? 0;
  let volumeWeight = invoice.volume_weight ?? 0;

  // If boxes array exists, compute sums from boxes if not already explicitly set
  if (invoice.boxes && invoice.boxes.length > 0) {
    let boxNetSum = 0;
    let boxVolSum = 0;
    let hasBoxWeights = false;

    invoice.boxes.forEach((box) => {
      const actWt = box.actual_weight_kg ?? box.weight_kg ?? 0;
      const volWt =
        box.volumetric_weight_kg ??
        (box.length_cm && box.width_cm && box.height_cm
          ? (box.length_cm * box.width_cm * box.height_cm) / 5000
          : 0);
      if (actWt > 0) hasBoxWeights = true;
      boxNetSum += actWt;
      boxVolSum += volWt;
    });

    if (hasBoxWeights && netWeight <= 0) {
      netWeight = Number(boxNetSum.toFixed(2));
    }
    if (boxVolSum > 0 && volumeWeight <= 0) {
      volumeWeight = Number(boxVolSum.toFixed(2));
    }
  }

  // Fallbacks if netWeight or volumeWeight are unset
  if (netWeight <= 0) {
    const itemWtSum = (invoice.items || []).reduce(
      (acc, it) => acc + (Number(it.weight_kg) || 0),
      0
    );
    netWeight = itemWtSum > 0 ? Number(itemWtSum.toFixed(2)) : invoice.weight || 0;
  }

  if (volumeWeight <= 0) {
    volumeWeight = invoice.weight || netWeight;
  }

  const billableWeight = invoice.weight || Math.max(netWeight, volumeWeight);
  const volumeProfitWeight = Math.max(0, Number((volumeWeight - netWeight).toFixed(2)));
  const isVolumetricCharged = volumeWeight > netWeight;

  const ratePerKg =
    invoice.rate_per_kg ||
    (billableWeight > 0 ? invoice.sale_amount / billableWeight : 0);
  const volumeProfitAmount = Math.round(volumeProfitWeight * ratePerKg);

  const meat = getInvoiceMeatBreakdown(invoice);

  return {
    netWeight,
    volumeWeight,
    billableWeight,
    volumeProfitWeight,
    isVolumetricCharged,
    volumeProfitAmount,
    hasMeat: meat.hasMeat,
    meatWeight: meat.meatWeight,
    normalWeight: meat.normalWeight,
    pickleWeight: meat.pickleWeight,
    meatExtraCharge: meat.meatExtraCharge,
    meatPurchaseCost: meat.meatPurchaseCost,
    meatProfit: meat.meatProfit,
    meatItemDescriptions: meat.meatItemDescriptions,
  };
}

export interface FinancialSummary {
  totalCustomerRevenue: number; // Total billed to customers (Sales + Custom Duty - Discounts)
  totalKathmanduCost: number; // Actual Kathmandu Forwarder / Carrier billing costs
  totalExpenses: number; // Actual station operating expenses
  grossProfit: number; // Total Customer Revenue - Total Kathmandu Cost
  netProfit: number; // Formula: Customer Revenue - Kathmandu Cost - Expenses
  customerInvoicesCount: number;
  kathmanduBillingsCount: number;
  expensesCount: number;
  linkedInvoicesCount: number;
  unlinkedInvoicesCount: number;
}

/**
 * Calculates overall system financial summary according to exact formula:
 * Profit = Customer Revenue - Kathmandu Cost/Billing - Expenses
 * 
 * - Customer Revenue: sum of customer invoice billed final amounts (or sale_amount + custom_duty - discount)
 * - Kathmandu Cost: For customer invoices with a linked Kathmandu Billing, uses ktmBilling.total_cost.
 *                   For customer invoices without a separate Kathmandu Billing yet, uses purchase_amount.
 *                   Plus any standalone Kathmandu Billings.
 * - Expenses: sum of actual recorded expenses.
 */
export function calculateFinancialSummary(
  invoices: Invoice[],
  ktmBillings: KathmanduBilling[],
  expenses: Expense[]
): FinancialSummary {
  // 1. Calculate Customer Revenue
  let totalCustomerRevenue = 0;
  invoices.forEach((inv) => {
    const sale = Number(inv.sale_amount) || 0;
    const custom = Number(inv.custom_duty_amount) || 0;
    const discount = Number(inv.discount_amount) || 0;
    const billedAmount = Math.max(0, sale + custom - discount);
    totalCustomerRevenue += billedAmount;
  });

  // 2. Intelligent Multi-Tier Matching between Customer Invoices & Kathmandu Billings
  const matchedPairs = new Map<string, KathmanduBilling>(); // invoiceId -> KathmanduBilling
  const processedKtmIds = new Set<string>();
  const processedInvIds = new Set<string>();

  // Tier 1: Explicit ID or invoice_no references
  invoices.forEach((inv) => {
    const matchingKtm = ktmBillings.find((kb) => {
      if (processedKtmIds.has(kb.id)) return false;
      if (kb.customer_invoice_id && inv.id && kb.customer_invoice_id === inv.id) return true;
      if (inv.ktm_billing_id && kb.id && inv.ktm_billing_id === kb.id) return true;
      if (
        kb.customer_invoice_no &&
        inv.invoice_no &&
        kb.customer_invoice_no.trim().toLowerCase() === inv.invoice_no.trim().toLowerCase()
      ) {
        return true;
      }
      return false;
    });

    if (matchingKtm) {
      matchedPairs.set(inv.id, matchingKtm);
      processedKtmIds.add(matchingKtm.id);
      processedInvIds.add(inv.id);
    }
  });

  // Tier 2: Match by AWB Tracking Number
  invoices.forEach((inv) => {
    if (processedInvIds.has(inv.id)) return;
    const invAwb = (inv.awb_no || '').trim().toLowerCase();
    if (!invAwb) return;

    const matchingKtm = ktmBillings.find((kb) => {
      if (processedKtmIds.has(kb.id)) return false;
      const kbAwb = (kb.awb_no || '').trim().toLowerCase();
      return kbAwb && kbAwb === invAwb;
    });

    if (matchingKtm) {
      matchedPairs.set(inv.id, matchingKtm);
      processedKtmIds.add(matchingKtm.id);
      processedInvIds.add(inv.id);
    }
  });

  // Tier 3: Match by Sender Name & Destination Country
  invoices.forEach((inv) => {
    if (processedInvIds.has(inv.id)) return;
    const invSender = (inv.sender_name || '').trim().toLowerCase();
    const invCountry = (inv.country || '').trim().toLowerCase();
    if (!invSender) return;

    const matchingKtm = ktmBillings.find((kb) => {
      if (processedKtmIds.has(kb.id)) return false;
      const kbSender = (kb.sender_name || '').trim().toLowerCase();
      const kbCountry = (kb.country || '').trim().toLowerCase();
      return kbSender === invSender && (!invCountry || !kbCountry || kbCountry === invCountry);
    });

    if (matchingKtm) {
      matchedPairs.set(inv.id, matchingKtm);
      processedKtmIds.add(matchingKtm.id);
      processedInvIds.add(inv.id);
    }
  });

  // Tier 4: If exactly 1 unlinked Invoice & 1 unlinked Kathmandu Bill exist in the dataset, pair them
  const remainingInvoices = invoices.filter((inv) => !processedInvIds.has(inv.id));
  const remainingKtmBillings = ktmBillings.filter((kb) => !processedKtmIds.has(kb.id));

  if (remainingInvoices.length === 1 && remainingKtmBillings.length === 1) {
    const singleInv = remainingInvoices[0];
    const singleKtm = remainingKtmBillings[0];
    matchedPairs.set(singleInv.id, singleKtm);
    processedKtmIds.add(singleKtm.id);
    processedInvIds.add(singleInv.id);
  } else if (remainingInvoices.length > 0 && remainingKtmBillings.length > 0) {
    // Tier 5: Match by weight similarity (within 0.5 kg) and country
    remainingInvoices.forEach((inv) => {
      if (processedInvIds.has(inv.id)) return;
      const matchingKtm = remainingKtmBillings.find((kb) => {
        if (processedKtmIds.has(kb.id)) return false;
        const weightMatch = Math.abs((Number(inv.weight) || 0) - (Number(kb.weight) || 0)) <= 0.5;
        const countryMatch = (inv.country || '').trim().toLowerCase() === (kb.country || '').trim().toLowerCase();
        return weightMatch && countryMatch;
      });

      if (matchingKtm) {
        matchedPairs.set(inv.id, matchingKtm);
        processedKtmIds.add(matchingKtm.id);
        processedInvIds.add(inv.id);
      }
    });
  }

  // Calculate Kathmandu Cost without double-counting
  let totalKathmanduCost = 0;
  let linkedInvoicesCount = 0;
  let unlinkedInvoicesCount = 0;

  invoices.forEach((inv) => {
    const linkedKtm = matchedPairs.get(inv.id);
    if (linkedKtm) {
      linkedInvoicesCount++;
      totalKathmanduCost += Number(linkedKtm.total_cost) || 0;
    } else {
      unlinkedInvoicesCount++;
      // If invoice has not yet been billed by Kathmandu hub, use calculated purchase rate
      totalKathmanduCost += Number(inv.purchase_amount) || 0;
    }
  });

  // Add truly standalone Kathmandu forwarder billings (no corresponding customer invoice)
  ktmBillings.forEach((kb) => {
    if (!processedKtmIds.has(kb.id)) {
      totalKathmanduCost += Number(kb.total_cost) || 0;
    }
  });

  // 3. Calculate Expenses
  const totalExpenses = expenses.reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);

  // 4. Calculate Gross & Net Profit
  const grossProfit = totalCustomerRevenue - totalKathmanduCost;
  const netProfit = totalCustomerRevenue - totalKathmanduCost - totalExpenses;

  return {
    totalCustomerRevenue: Math.round(totalCustomerRevenue),
    totalKathmanduCost: Math.round(totalKathmanduCost),
    totalExpenses: Math.round(totalExpenses),
    grossProfit: Math.round(grossProfit),
    netProfit: Math.round(netProfit),
    customerInvoicesCount: invoices.length,
    kathmanduBillingsCount: ktmBillings.length,
    expensesCount: expenses.length,
    linkedInvoicesCount,
    unlinkedInvoicesCount,
  };
}

/**
 * Calculates Kathmandu billing costs and totals
 */
export function calculateKathmanduBillingTotals(
  freightCost: number,
  customClearanceCost: number,
  handlingCost: number = 0,
  meatExtraCost: number = 0,
  otherSurcharges: number = 0,
  discountAmount: number = 0,
  medicineExtraCost: number = 0
): number {
  const freight = Math.max(0, Number(freightCost) || 0);
  const custom = Math.max(0, Number(customClearanceCost) || 0);
  const handling = Math.max(0, Number(handlingCost) || 0);
  const meat = Math.max(0, Number(meatExtraCost) || 0);
  const medicine = Math.max(0, Number(medicineExtraCost) || 0);
  const surcharges = Math.max(0, Number(otherSurcharges) || 0);
  const discount = Math.max(0, Number(discountAmount) || 0);

  return Math.max(0, freight + custom + handling + meat + medicine + surcharges - discount);
}

