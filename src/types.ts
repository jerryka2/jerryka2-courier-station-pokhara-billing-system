export type ItemType = 'Normal' | 'Meat' | 'Dry Meat' | 'Pickle' | 'Medicine';

export type TransportType = 'Air' | 'Cargo';

export type ServiceCategory =
  | 'Air Cargo'
  | 'DHL Express'
  | 'FedEx Express'
  | 'Aramex Express'
  | 'UPS Express'
  | 'Skynet Express'
  | 'Sea / Land Freight';

export type UserRole = 'admin' | 'staff';

export type StaffStatus = 'pending' | 'verified' | 'rejected';

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: StaffStatus;
  registeredAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  pin?: string;
}

export interface SecurityAuditLog {
  id: string;
  timestamp: string;
  action: string;
  userEmail: string;
  userRole: string;
  details: string;
  ipAddress?: string;
}

export interface SystemSettings {
  companyName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  portOfLoading: string;
  adminPin: string;
  requirePinForDelete: boolean;
  autoLogoutMinutes: number;
}

export interface ParcelBox {
  id: string;
  box_number: number;
  weight_kg?: number | null;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  volumetric_weight_kg?: number | null;
  actual_weight_kg?: number;
  billable_weight_kg?: number;
  contents_description?: string;
  max_limit_exceeded?: boolean;
}

export interface Rate {
  id: string;
  country: string;
  item_type: ItemType;
  min_weight: number; // slab min weight e.g. 1, 10, 20
  purchase_rate: number; // per kg
  sale_rate: number; // per kg
  custom_rate: number; // flat charge per box
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id?: string;
  item_name: string;
  quantity: number;
  item_type: ItemType;
  weight_kg?: number | null; // required for Meat / Dry Meat / Pickle
  box_number?: number; // optional assignment to specific box (Box #1, Box #2, etc.)
}

export type PaymentMethod = 'Cash' | 'Online Payment' | 'Bank Transfer' | 'Credit';
export type PaymentStatus = 'Paid' | 'Unpaid' | 'Partial';

export interface ShipperProfile {
  id: string;
  name: string;
  code: string; // e.g. "CSP", "DHL", "FEDEX", "ARAMEX", "SKYNET", "UPS"
  tagline?: string;
  address: string;
  city?: string;
  country?: string;
  phone: string;
  email: string;
  port_of_loading?: string;
  tax_id?: string; // PAN / VAT No.
  is_default?: boolean;
  notes?: string;
}

export interface Invoice {
  id: string;
  invoice_no: string; // INV-001, INV-002...
  invoice_date: string; // YYYY-MM-DD
  sender_name: string;
  sender_phone?: string; // Customer / Sender Mobile Number (for providing tracking code via SMS/WhatsApp)
  sender_address?: string;
  sender_email?: string; // Sender / Customer email (optional)
  receiver_name: string;
  receiver_address?: string; // Full address of the receiver
  receiver_email?: string; // Receiver / Consignee email
  phone: string; // Contact phone
  receiver_phone?: string;
  country: string;
  transport_type: TransportType;
  service_category?: ServiceCategory; // 'Air Cargo' | 'DHL Express' | 'FedEx Express' | 'Aramex Express' | 'UPS Express' etc.
  express_packaging_type?: string; // 'Customer Packaging' | 'DHL Envelope' | 'DHL Flyer' | 'DHL Box 1-8'
  express_content_type?: 'DOCUMENTS' | 'NON_DOCUMENTS / PARCEL';
  declared_customs_value?: number; // Declared value for customs declaration
  declared_customs_currency?: string; // 'USD' | 'EUR' | 'AUD' | 'GBP' | 'NPR'
  duty_tax_payer?: 'Receiver (DDU)' | 'Shipper (DDP)';
  // Shipper / Carrier Forwarding Entity
  shipper_id?: string;
  shipper_name?: string;
  shipper_code?: string;
  shipper_phone?: string;
  shipper_email?: string;
  shipper_address?: string;
  shipper_tax_id?: string;
  weight: number; // total shipment weight in kg (chargeable weight)
  net_weight?: number; // Actual physical scale net weight (kg)
  volume_weight?: number; // Volumetric dimensional weight (kg: L*W*H/5000)
  chargeable_weight?: number; // Final billable weight = Max(net_weight, volume_weight)
  volume_profit_weight?: number; // Extra volume weight billed for profit = Max(0, volume_weight - net_weight)
  box_count: number;
  boxes?: ParcelBox[];
  max_box_weight_limit?: number;
  departure: string;
  port_of_loading: string; // default "Kathmandu, Nepal"
  sale_amount: number;
  purchase_amount: number;
  profit_amount: number;
  discount_amount?: number; // Discount in NPR (Rs)
  custom_duty_amount?: number; // Custom duty charge (Rs)
  meat_extra_charge?: number; // Extra charge for Meat / Dry Meat / Pickle items
  medicine_extra_charge?: number; // Extra fee for medicine handling & prescription clearance
  prescription_no?: string; // Doctor's prescription / Rx reference number
  prescription_doctor?: string; // Prescribing doctor / medical clinic name
  rate_per_kg?: number; // Effective rate per kg
  payment_method?: PaymentMethod;
  payment_status?: PaymentStatus;
  online_transaction_id?: string;
  status?: 'Billed' | 'Dispatched' | 'Delivered';
  pcc_number?: string; // Personal Customs Clearance Code (required for South Korea)
  passport_photo_url?: string; // Passport Photo / ID Copy data URL
  dispatch_date?: string; // YYYY-MM-DD
  awb_no?: string; // Airway bill or tracking number
  dispatch_notes?: string;
  // Connected Kathmandu Billing Reference
  ktm_billing_id?: string;
  ktm_invoice_no?: string;
  ktm_cost?: number;
  created_at: string;
  updated_at: string;
  items: InvoiceItem[];
}

export interface KathmanduBilling {
  id: string; // e.g. "ktm-1724500000"
  ktm_invoice_no: string; // e.g. "KTM-001", "KTM-002"
  ktm_date: string; // YYYY-MM-DD
  
  // Connection to Customer Billing Invoice
  customer_invoice_id?: string; // ID of the Customer Billing record
  customer_invoice_no?: string; // Reference (e.g. "INV-001")
  
  // Customer Details (Auto-fetched from Customer Billing)
  sender_name: string; // Customer Name
  sender_phone: string; // Customer Phone
  sender_address?: string; // Customer Address
  
  // Receiver Details (Auto-fetched from Customer Billing)
  receiver_name: string; // Consignee / Receiver Name
  receiver_phone?: string;
  receiver_address?: string;
  country: string; // Destination country
  transport_type: TransportType;
  
  // Kathmandu Forwarder / Carrier Agent Info
  forwarder_name?: string; // e.g., "Air Cargo Forwarders KTM", "DHL Express KTM Hub", "Skynet Kathmandu"
  forwarder_phone?: string;
  forwarder_pan?: string;
  awb_no?: string; // Airway Bill or Master Tracking Number
  flight_departure?: string; // Flight number / departure info
  
  // Shipment Specs
  weight: number; // Chargeable weight in kg
  net_weight?: number; // Actual physical scale weight (kg)
  volume_weight?: number;
  box_count: number;
  boxes?: ParcelBox[];
  
  // Item List (fetched from Customer Billing)
  items: InvoiceItem[];
  
  // Kathmandu Cost Breakdown (Purchase & Airport Handling)
  freight_rate_per_kg?: number; // Rate per kg paid to KTM cargo/forwarder
  freight_cost: number; // Flight / cargo purchase freight
  custom_clearance_cost: number; // Airport customs clearance fee in KTM
  handling_cost?: number; // Airport documentation / security / handling charges
  meat_extra_cost?: number; // Quarantine & food clearance fee for Dry Meat / Pickle
  medicine_extra_cost?: number; // Quarantine / prescription / pharma doc clearance fee
  other_surcharges?: number; // Surcharges / fuel adjustment
  discount_amount?: number; // Discount received from Kathmandu forwarder
  total_cost: number; // Final Kathmandu Cost = freight_cost + custom_clearance_cost + handling_cost + meat_extra_cost + medicine_extra_cost + other_surcharges - discount_amount
  
  // Payment & Tracking Status
  payment_status?: PaymentStatus; // 'Paid' | 'Unpaid' | 'Partial'
  payment_method?: PaymentMethod;
  amount_paid?: number; // Total amount paid to KTM forwarder
  amount_due?: number; // Remaining balance left to pay = total_cost - (amount_paid || 0)
  payment_history?: KathmanduPaymentRecord[]; // Individual payment logs
  
  // Settlement Cycle & Batch Reset Tracking
  settlement_cycle_id?: string; // ID of the settlement batch if archived/settled
  settlement_cycle_name?: string; // Name/label e.g. "Settlement Batch #1 - Aug 2026"
  is_settled_archived?: boolean; // true when settled in a past cycle to start new active list
  settled_date?: string; // Date when cycle was settled
  
  // Kathmandu Shipping & Dispatch Tracking
  shipping_status?: 'Pending Dispatch' | 'In Transit to KTM' | 'Received at KTM Hub' | 'Customs Cleared at TIA' | 'Dispatched / Air Shipped' | 'Delivered';
  dispatch_date?: string; // Date sent to Kathmandu or flight departure date
  vehicle_no?: string; // Truck/Bus or van vehicle number from Pokhara to KTM
  driver_phone?: string; // Driver contact number
  shipping_notes?: string;
  
  notes?: string;
  
  created_at: string;
  updated_at: string;
}

export interface KathmanduPaymentRecord {
  id: string;
  date: string;
  amount: number;
  payment_method: PaymentMethod;
  reference_no?: string;
  notes?: string;
  recorded_by?: string;
  created_at: string;
}

export interface KathmanduSettlementCycle {
  id: string;
  cycle_name: string; // e.g. "Settlement Cycle #1 - Aug 2026"
  settled_date: string;
  total_billed: number;
  total_paid: number;
  remaining_due: number;
  bill_ids: string[];
  bill_count: number;
  forwarder_name?: string;
  payment_method?: PaymentMethod;
  reference_no?: string;
  notes?: string;
  settled_by?: string;
  created_at: string;
}

export interface Expense {
  id: string;
  expense_name: string;
  amount: number;
  expense_date: string; // YYYY-MM-DD
  created_at: string;
}

export type PDFVersion = 'billing_v1' | 'billing_v2' | 'customer' | 'item_list' | 'kathmandu_bill';

export interface StockItem {
  id: string;
  item_name: string; // e.g. "Carton of 10 kg", "Carton of 15 kg", "Carton of 20 kg", "Brown Tape", "White Tape", "Bora"
  category: 'Carton' | 'Tape' | 'Sack / Bag' | 'Other';
  unit: string; // e.g. "Pcs", "Rolls", "Bags"
  total_stock: number; // Cumulative total added stock
  used_count: number; // Count of pieces used
  low_stock_threshold: number; // Threshold for low stock warning (e.g. 10)
  cost_per_unit?: number; // Purchase cost per unit in NPR
  notes?: string;
  updated_at: string;
}

export interface StockLog {
  id: string;
  stock_id: string;
  item_name: string;
  action_type: 'USED' | 'RESTOCKED' | 'ADJUSTMENT';
  quantity: number;
  reason?: string;
  logged_by?: string;
  created_at: string;
}

export interface CalculationResult {
  saleAmount: number;
  purchaseAmount: number;
  freightPurchaseAmount?: number;
  customPurchaseCost?: number;
  customDuty: number;
  meatExtraCharge?: number;
  meatExtraRatePerKg?: number;
  medicineExtraCharge?: number;
  medicineWeight?: number;
  specialItemsWeight?: number;
  baseFreightAmount?: number;
  baseRatePerKg?: number;
  discountAmount: number;
  finalAmount: number;
  totalPurchase: number;
  profitAmount: number;
  effectiveRatePerKg: number;
  itemTypeBreakdown: Array<{
    item_type: ItemType;
    weight: number;
    saleRate: number;
    purchaseRate: number;
    sale: number;
    purchase: number;
  }>;
}

export interface ExcelValidationError {
  row: number;
  message: string;
}
