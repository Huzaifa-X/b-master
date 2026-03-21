/**
 * Swiss QR Invoice Template
 *
 * Generates Swiss QR-bill compliant invoices following the Swiss Payment Standard (SPS).
 * The QR code contains structured payment data according to ISO 20022.
 *
 * Usage: Include this template reference in canvas mode for invoice generation.
 */

export const swissQRInvoiceTemplate = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Facture QR Suisse</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #000;
      background: #fff;
    }

    .invoice-container {
      max-width: 210mm;
      margin: 0 auto;
      padding: 20mm;
      min-height: 297mm;
      position: relative;
    }

    /* Header */
    .invoice-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }

    .company-info h1 {
      font-size: 24pt;
      font-weight: 700;
      color: #1a365d;
      margin-bottom: 8px;
    }

    .company-info p {
      font-size: 9pt;
      color: #4a5568;
      line-height: 1.5;
    }

    .invoice-meta {
      text-align: right;
    }

    .invoice-meta h2 {
      font-size: 14pt;
      font-weight: 600;
      color: #1a365d;
      margin-bottom: 12px;
    }

    .invoice-meta table {
      font-size: 9pt;
      text-align: left;
    }

    .invoice-meta td {
      padding: 2px 0;
    }

    .invoice-meta td:first-child {
      color: #718096;
      padding-right: 16px;
    }

    /* Client Info */
    .client-section {
      margin-bottom: 30px;
    }

    .client-section h3 {
      font-size: 8pt;
      font-weight: 600;
      color: #718096;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .client-info {
      font-size: 10pt;
      line-height: 1.6;
    }

    /* Invoice Table */
    .invoice-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }

    .invoice-table th {
      background: #f7fafc;
      border-bottom: 2px solid #e2e8f0;
      padding: 12px 8px;
      text-align: left;
      font-size: 8pt;
      font-weight: 600;
      color: #4a5568;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .invoice-table th:last-child,
    .invoice-table td:last-child {
      text-align: right;
    }

    .invoice-table td {
      padding: 12px 8px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 10pt;
    }

    /* Totals */
    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 40px;
    }

    .totals-table {
      width: 250px;
    }

    .totals-table tr td {
      padding: 6px 0;
      font-size: 10pt;
    }

    .totals-table tr td:last-child {
      text-align: right;
      font-weight: 500;
    }

    .totals-table .total-row td {
      font-size: 12pt;
      font-weight: 700;
      color: #1a365d;
      border-top: 2px solid #1a365d;
      padding-top: 12px;
    }

    /* Payment Info */
    .payment-info {
      background: #f7fafc;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 40px;
    }

    .payment-info h3 {
      font-size: 10pt;
      font-weight: 600;
      color: #1a365d;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .payment-info p {
      font-size: 9pt;
      color: #4a5568;
      margin-bottom: 8px;
    }

    /* Swiss QR Payment Slip */
    .qr-slip {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      border-top: 1px dashed #000;
      display: flex;
      height: 105mm;
      background: #fff;
    }

    .qr-receipt {
      width: 62mm;
      padding: 5mm;
      border-right: 1px dashed #000;
    }

    .qr-payment {
      flex: 1;
      padding: 5mm;
      display: flex;
    }

    .qr-section-title {
      font-size: 11pt;
      font-weight: 700;
      margin-bottom: 3mm;
    }

    .qr-label {
      font-size: 6pt;
      font-weight: 700;
      margin-top: 2mm;
      margin-bottom: 1mm;
    }

    .qr-value {
      font-size: 8pt;
      line-height: 1.3;
    }

    .qr-amount-section {
      margin-top: auto;
    }

    .qr-amount-box {
      display: flex;
      gap: 5mm;
    }

    .qr-amount-label {
      font-size: 6pt;
      font-weight: 700;
    }

    .qr-amount-value {
      font-size: 10pt;
      font-weight: 700;
    }

    .qr-code-section {
      width: 56mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-top: 5mm;
    }

    .qr-code-container {
      width: 46mm;
      height: 46mm;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .qr-code-container canvas {
      max-width: 100%;
      max-height: 100%;
    }

    .qr-info-section {
      flex: 1;
      padding-left: 5mm;
    }

    .qr-additional {
      margin-top: 3mm;
    }

    .swiss-cross {
      position: absolute;
      width: 7mm;
      height: 7mm;
      background: #fff;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .swiss-cross svg {
      width: 100%;
      height: 100%;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .invoice-container {
        padding: 15mm;
      }

      .qr-slip {
        break-inside: avoid;
      }
    }
  </style>
  <!-- QR Code Library -->
  <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
</head>
<body>
  <div class="invoice-container">
    <!-- Invoice Header -->
    <div class="invoice-header">
      <div class="company-info">
        <h1>{{COMPANY_NAME}}</h1>
        <p>
          {{COMPANY_ADDRESS}}<br>
          {{COMPANY_POSTAL}} {{COMPANY_CITY}}<br>
          {{COMPANY_COUNTRY}}
        </p>
      </div>
      <div class="invoice-meta">
        <h2>FACTURE</h2>
        <table>
          <tr>
            <td>N° Facture</td>
            <td><strong>{{INVOICE_NUMBER}}</strong></td>
          </tr>
          <tr>
            <td>Date</td>
            <td>{{INVOICE_DATE}}</td>
          </tr>
          <tr>
            <td>Échéance</td>
            <td>{{DUE_DATE}}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Client Section -->
    <div class="client-section">
      <h3>Facturé à</h3>
      <div class="client-info">
        <strong>{{CLIENT_NAME}}</strong><br>
        {{CLIENT_ADDRESS}}<br>
        {{CLIENT_POSTAL}} {{CLIENT_CITY}}<br>
        {{CLIENT_COUNTRY}}
      </div>
    </div>

    <!-- Invoice Items -->
    <table class="invoice-table">
      <thead>
        <tr>
          <th style="width: 50%">Description</th>
          <th style="width: 15%">Quantité</th>
          <th style="width: 15%">Prix unitaire</th>
          <th style="width: 20%">Montant</th>
        </tr>
      </thead>
      <tbody>
        {{INVOICE_ITEMS}}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals-section">
      <table class="totals-table">
        <tr>
          <td>Sous-total HT</td>
          <td>{{SUBTOTAL}} CHF</td>
        </tr>
        <tr>
          <td>TVA {{VAT_RATE}}%</td>
          <td>{{VAT_AMOUNT}} CHF</td>
        </tr>
        <tr class="total-row">
          <td>Total TTC</td>
          <td>{{TOTAL}} CHF</td>
        </tr>
      </table>
    </div>

    <!-- Payment Info -->
    <div class="payment-info">
      <h3>Modalité de paiement</h3>
      <p>Paiement selon bulletin QR suisse ci-dessous.</p>
      <p style="margin-top: 16px; font-style: italic;">Merci pour votre confiance.<br>{{COMPANY_NAME}}</p>
    </div>

    <!-- Swiss QR Payment Slip -->
    <div class="qr-slip">
      <!-- Receipt Section (Récépissé) -->
      <div class="qr-receipt">
        <div class="qr-section-title">Récépissé</div>

        <div class="qr-label">Compte / Payable à</div>
        <div class="qr-value">
          {{IBAN}}<br>
          {{COMPANY_NAME}}<br>
          {{COMPANY_ADDRESS}}<br>
          {{COMPANY_POSTAL}} {{COMPANY_CITY}}
        </div>

        <div class="qr-amount-section">
          <div class="qr-amount-box">
            <div>
              <div class="qr-amount-label">Monnaie</div>
              <div class="qr-amount-value">CHF</div>
            </div>
            <div>
              <div class="qr-amount-label">Montant</div>
              <div class="qr-amount-value">{{TOTAL}}</div>
            </div>
          </div>
        </div>

        <div class="qr-label" style="margin-top: 5mm;">Point de dépôt</div>
      </div>

      <!-- Payment Section (Section paiement) -->
      <div class="qr-payment">
        <div class="qr-code-section">
          <div class="qr-section-title">Section paiement</div>
          <div class="qr-code-container" style="position: relative;">
            <canvas id="qrcode"></canvas>
            <div class="swiss-cross">
              <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <rect width="100" height="100" fill="#000"/>
                <rect x="20" y="40" width="60" height="20" fill="#fff"/>
                <rect x="40" y="20" width="20" height="60" fill="#fff"/>
              </svg>
            </div>
          </div>
        </div>

        <div class="qr-info-section">
          <div class="qr-label">Compte / Payable à</div>
          <div class="qr-value">
            {{IBAN}}<br>
            {{COMPANY_NAME}}<br>
            {{COMPANY_ADDRESS}}<br>
            {{COMPANY_POSTAL}} {{COMPANY_CITY}}
          </div>

          <div class="qr-label" style="margin-top: 3mm;">Informations additionnelles</div>
          <div class="qr-value">Facture {{INVOICE_NUMBER}}</div>

          <div class="qr-amount-section">
            <div class="qr-amount-box">
              <div>
                <div class="qr-amount-label">Monnaie</div>
                <div class="qr-amount-value">CHF</div>
              </div>
              <div>
                <div class="qr-amount-label">Montant</div>
                <div class="qr-amount-value">{{TOTAL}}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    // Swiss QR Code Data Format (Swiss Payment Standard)
    function generateSwissQRCode() {
      const qrData = [
        'SPC',                           // QR Type
        '0200',                          // Version
        '1',                             // Coding Type (UTF-8)
        '{{IBAN}}',                      // IBAN
        'S',                             // Address Type (Structured)
        '{{COMPANY_NAME}}',              // Creditor Name
        '{{COMPANY_ADDRESS}}',           // Creditor Address
        '',                              // Building number
        '{{COMPANY_POSTAL}}',            // Postal code
        '{{COMPANY_CITY}}',              // City
        'CH',                            // Country
        '',                              // Ultimate creditor (empty)
        '',                              // ''
        '',                              // ''
        '',                              // ''
        '',                              // ''
        '',                              // ''
        '{{TOTAL}}',                     // Amount
        'CHF',                           // Currency
        'S',                             // Debtor address type
        '{{CLIENT_NAME}}',               // Debtor name
        '{{CLIENT_ADDRESS}}',            // Debtor address
        '',                              // Building number
        '{{CLIENT_POSTAL}}',             // Postal code
        '{{CLIENT_CITY}}',               // City
        '{{CLIENT_COUNTRY_CODE}}',       // Country code
        'NON',                           // Reference type (NON = no reference)
        '',                              // Reference
        'Facture {{INVOICE_NUMBER}}',    // Additional information
        'EPD',                           // End of payment data
        ''                               // Alternative procedure
      ].join('\\n');

      QRCode.toCanvas(document.getElementById('qrcode'), qrData, {
        width: 166,
        margin: 0,
        errorCorrectionLevel: 'M'
      }, function (error) {
        if (error) console.error(error);
      });
    }

    // Generate QR code when page loads
    document.addEventListener('DOMContentLoaded', generateSwissQRCode);
  </script>
</body>
</html>
`;

/**
 * Swiss QR Invoice instructions for AI
 * This is injected into the Canvas mode system prompt
 */
export const swissQRInvoiceInstructions = `

## 🇨🇭 Swiss QR Invoice (QR-Facture) Generation

When the user asks for a Swiss invoice, QR invoice, QR-facture, or bulletin de versement with QR code, you MUST generate a Swiss QR-bill compliant invoice.

### Required Information:
1. **Company/Creditor Info:**
   - Company name
   - Address, postal code, city
   - IBAN (Swiss format: CHxx xxxx xxxx xxxx xxxx x)

2. **Client/Debtor Info:**
   - Client name
   - Address, postal code, city, country

3. **Invoice Details:**
   - Invoice number
   - Date and due date
   - Line items with quantities and prices
   - VAT rate (typically 8.1% in Switzerland)
   - Total amount

### Swiss QR Code Format:
The QR code must follow the Swiss Payment Standard (SPS) with this data structure:
- SPC (header)
- Version 0200
- IBAN
- Creditor info (structured)
- Amount in CHF
- Debtor info
- Reference info
- EPD (end marker)

### Template Structure:
- Professional invoice header with company logo area
- Client billing address
- Invoice items table
- Subtotal, TVA, Total TTC
- Payment slip at bottom with:
  - **Récépissé** (receipt) on left (62mm wide)
  - **Section paiement** (payment section) with QR code on right
  - Swiss cross overlay on QR code
  - IBAN, creditor/debtor info, amount

### Important Notes:
- Use CHF as currency
- Include the QR code library: <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
- The QR code must include a Swiss cross overlay (black square with white cross)
- Payment slip height should be 105mm as per Swiss standard
- Use French or German labels depending on user preference

### Example Request:
"Create a Swiss QR invoice for CHF 150 to Marie Dupont, Rue du Lac 15, 1201 Genève, from Calliopee Sàrl, IBAN CH44 3199 9123 0008 8901 2"
`;

export default swissQRInvoiceTemplate;
