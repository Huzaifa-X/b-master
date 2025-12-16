interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  from: {
    name: string;
    email?: string;
    address?: string;
  };
  to: {
    name: string;
    email?: string;
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
  currency?: string;
  notes?: string;
}

export function generateInvoiceHTML(data: InvoiceData): string {
  const currency = data.currency || 'USD';
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      padding: 40px;
      color: #1f2937;
      background: white;
    }
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
    }
    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 2px solid #e5e7eb;
    }
    .invoice-title {
      font-size: 32px;
      font-weight: 700;
      color: #111827;
    }
    .invoice-number {
      font-size: 14px;
      color: #6b7280;
      margin-top: 8px;
    }
    .invoice-date {
      text-align: right;
      font-size: 14px;
      color: #6b7280;
    }
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 40px;
    }
    .party {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
    }
    .party-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      color: #6b7280;
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }
    .party-name {
      font-size: 16px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 4px;
    }
    .party-detail {
      font-size: 14px;
      color: #6b7280;
      line-height: 1.6;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    thead {
      background: #111827;
      color: white;
    }
    th {
      padding: 12px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    th.text-right {
      text-align: right;
    }
    tbody tr {
      border-bottom: 1px solid #e5e7eb;
    }
    td {
      padding: 16px 12px;
      font-size: 14px;
    }
    td.text-right {
      text-align: right;
    }
    .totals {
      margin-left: auto;
      width: 300px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      font-size: 14px;
    }
    .total-row.subtotal {
      border-top: 1px solid #e5e7eb;
    }
    .total-row.tax {
      color: #6b7280;
    }
    .total-row.final {
      border-top: 2px solid #111827;
      margin-top: 8px;
      padding-top: 16px;
      font-size: 18px;
      font-weight: 700;
    }
    .notes {
      margin-top: 40px;
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
      border-left: 4px solid #3b82f6;
    }
    .notes-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      color: #6b7280;
      margin-bottom: 8px;
    }
    .notes-content {
      font-size: 14px;
      color: #4b5563;
      line-height: 1.6;
    }
    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="invoice-header">
      <div>
        <div class="invoice-title">INVOICE</div>
        <div class="invoice-number">#${data.invoiceNumber}</div>
      </div>
      <div class="invoice-date">
        <div><strong>Date:</strong> ${data.date}</div>
        ${data.dueDate ? `<div style="margin-top: 4px;"><strong>Due:</strong> ${data.dueDate}</div>` : ''}
      </div>
    </div>

    <!-- From/To -->
    <div class="parties">
      <div class="party">
        <div class="party-label">From</div>
        <div class="party-name">${data.from.name}</div>
        ${data.from.email ? `<div class="party-detail">${data.from.email}</div>` : ''}
        ${data.from.address ? `<div class="party-detail">${data.from.address}</div>` : ''}
      </div>
      <div class="party">
        <div class="party-label">Bill To</div>
        <div class="party-name">${data.to.name}</div>
        ${data.to.email ? `<div class="party-detail">${data.to.email}</div>` : ''}
        ${data.to.address ? `<div class="party-detail">${data.to.address}</div>` : ''}
      </div>
    </div>

    <!-- Items Table -->
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="text-right">Qty</th>
          <th class="text-right">Unit Price</th>
          <th class="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${data.items.map(item => `
          <tr>
            <td>${item.description}</td>
            <td class="text-right">${item.quantity}</td>
            <td class="text-right">${formatCurrency(item.unitPrice)}</td>
            <td class="text-right">${formatCurrency(item.amount)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals">
      <div class="total-row subtotal">
        <span>Subtotal</span>
        <span>${formatCurrency(data.subtotal)}</span>
      </div>
      ${data.tax ? `
        <div class="total-row tax">
          <span>Tax ${data.taxRate ? `(${data.taxRate}%)` : ''}</span>
          <span>${formatCurrency(data.tax)}</span>
        </div>
      ` : ''}
      <div class="total-row final">
        <span>Total</span>
        <span>${formatCurrency(data.total)}</span>
      </div>
    </div>

    <!-- Notes -->
    ${data.notes ? `
      <div class="notes">
        <div class="notes-label">Notes</div>
        <div class="notes-content">${data.notes}</div>
      </div>
    ` : ''}

    <!-- Footer -->
    <div class="footer">
      Generated on ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}
    </div>
  </div>
</body>
</html>
  `;
}
