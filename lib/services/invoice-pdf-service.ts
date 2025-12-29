import { generateInvoicePDF } from '@/lib/services/pdf-generator';

export interface InvoicePDFData {
  date: string;
  dueDate?: string;
  from: {
    name: string;
    email: string;
    address?: string;
  };
  to: {
    name: string;
    email: string;
    address?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  subtotal: number;
  tax?: number;
  taxRate?: number;
  total: number;
  currency: string;
  notes?: string;
}

export interface SimpleInvoiceInput {
  customerName: string;
  customerEmail: string;
  amount: number;
  description: string;
  currency?: string;
  dueDate?: string;
  notes?: string;
}

export async function generateInvoicePDFFromData(
  input: SimpleInvoiceInput
): Promise<string> {
  const {
    customerName,
    customerEmail,
    amount,
    description,
    currency = 'USD',
    dueDate,
    notes
  } = input;

  // Basic validation (backend stays authoritative)
  if (!customerName) throw new Error('Customer name is required');
  if (!customerEmail) throw new Error('Customer email is required');
  if (!amount || amount <= 0) throw new Error('Invoice amount must be greater than zero');
  if (!description) throw new Error('Invoice description is required');

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const invoiceData: InvoicePDFData = {
    date: today,
    dueDate,
    from: {
      name: process.env.BUSINESS_NAME || 'Your Company',
      email: process.env.BUSINESS_EMAIL || 'billing@company.com',
      address: process.env.BUSINESS_ADDRESS
    },
    to: {
      name: customerName,
      email: customerEmail
    },
    items: [
      {
        description,
        quantity: 1,
        unitPrice: amount,
        amount
      }
    ],
    subtotal: amount,
    total: amount,
    currency: currency.toUpperCase(),
    notes
  };

  const pdfUrl = await generateInvoicePDF(invoiceData);

  console.log('[Invoice PDF] ✅ Generated successfully:', pdfUrl);

  return pdfUrl;
}
