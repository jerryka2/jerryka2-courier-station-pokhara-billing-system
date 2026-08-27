import { Invoice } from '../types';

/**
 * Normalizes a phone number for WhatsApp wa.me links
 * e.g., "9856012345" -> "9779856012345"
 * "+977-9856012345" -> "9779856012345"
 * "+61 412 345 678" -> "61412345678"
 */
export function formatPhoneForWhatsApp(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  // If 10 digits starting with 97 or 98 (typical Nepal mobile), prepend country code 977
  if (digits.length === 10 && (digits.startsWith('98') || digits.startsWith('97') || digits.startsWith('96'))) {
    return `977${digits}`;
  }
  return digits;
}

/**
 * Generates customer-friendly tracking SMS/WhatsApp text
 */
export function generateCustomerTrackingMessage(invoice: Invoice, customAwb?: string): string {
  const awb = customAwb || invoice.awb_no || 'Processing / Will be assigned upon dispatch';
  const customerName = invoice.sender_name || 'Valued Customer';
  const receiverName = invoice.receiver_name || 'Receiver';
  const destination = invoice.country || 'Destination';
  const status = invoice.status === 'Dispatched' ? `Dispatched (${invoice.dispatch_date || 'Today'})` : 'In Processing';

  return `Namaste ${customerName} ji! 🙏
Thank you for choosing The Courier Station Pokhara.

📦 Shipment Tracking Details:
• Invoice No: ${invoice.invoice_no}
• Destination: ${receiverName}, ${destination}
• Chargeable Weight: ${invoice.weight} kg (${invoice.box_count} Box)
• Status: ${status}
• Airway Bill (AWB) / Tracking No: ${awb}

Track your shipment or reach our Pokhara front desk:
📍 The Courier Station Pokhara, New Road, Pokhara
📞 Tel: +977-61-532155 / +977-9856032155
Have a wonderful day!`;
}

/**
 * Returns a direct WhatsApp click-to-chat URL with tracking message
 * Supports:
 * - getWhatsAppTrackingUrl(invoice, customAwb?)
 * - getWhatsAppTrackingUrl(targetPhone, invoice, customAwb?)
 */
export function getWhatsAppTrackingUrl(
  arg1: Invoice | string,
  arg2?: Invoice | string,
  arg3?: string
): string {
  let invoice: Invoice;
  let targetPhone = '';
  let customAwb: string | undefined;

  if (typeof arg1 === 'object' && arg1 !== null) {
    invoice = arg1 as Invoice;
    customAwb = typeof arg2 === 'string' ? arg2 : undefined;
    targetPhone = invoice.sender_phone || invoice.phone || '';
  } else {
    targetPhone = String(arg1 || '');
    invoice = arg2 as Invoice;
    customAwb = arg3;
  }

  if (!invoice) return '';

  const cleanPhone = formatPhoneForWhatsApp(targetPhone || invoice.sender_phone || invoice.phone);
  const msg = generateCustomerTrackingMessage(invoice, customAwb);
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  }
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

/**
 * Returns a direct SMS protocol link
 * Supports:
 * - getSmsTrackingUrl(invoice, customAwb?)
 * - getSmsTrackingUrl(targetPhone, invoice, customAwb?)
 */
export function getSmsTrackingUrl(
  arg1: Invoice | string,
  arg2?: Invoice | string,
  arg3?: string
): string {
  let invoice: Invoice;
  let targetPhone = '';
  let customAwb: string | undefined;

  if (typeof arg1 === 'object' && arg1 !== null) {
    invoice = arg1 as Invoice;
    customAwb = typeof arg2 === 'string' ? arg2 : undefined;
    targetPhone = invoice.sender_phone || invoice.phone || '';
  } else {
    targetPhone = String(arg1 || '');
    invoice = arg2 as Invoice;
    customAwb = arg3;
  }

  if (!invoice) return '';

  const phone = (targetPhone || invoice.sender_phone || invoice.phone || '').replace(/[^\d+]/g, '');
  const msg = generateCustomerTrackingMessage(invoice, customAwb);
  return `sms:${phone}?body=${encodeURIComponent(msg)}`;
}

/**
 * Copies the tracking message directly to the clipboard
 */
export async function copyTrackingMessage(invoice: Invoice, customAwb?: string): Promise<boolean> {
  const text = generateCustomerTrackingMessage(invoice, customAwb);
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return true;
  } catch (err) {
    console.error('Failed to copy tracking message:', err);
    return false;
  }
}
