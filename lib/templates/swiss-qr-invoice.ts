import { TemplateDefinition } from './index';

export const swissQrInvoiceTemplate: TemplateDefinition = {
  id: "swiss-qr-invoice",
  name: "Swiss QR Invoice",
  description: "Swiss QR-bill compliant invoice generator with Tailwind CSS",
  category: "Finance",
  icon: "FileText",
  files: {
    "package.json": JSON.stringify(
      {
        name: "swiss-qr-invoice",
        private: true,
        version: "0.0.0",
        type: "module",
        scripts: {
          dev: "vite",
          build: "vite build",
          preview: "vite preview",
        },
        dependencies: {
          react: "^18.2.0",
          "react-dom": "^18.2.0",
          "lucide-react": "^0.344.0",
          "qrcode": "^1.5.3",
        },
        devDependencies: {
          "@vitejs/plugin-react": "^4.2.1",
          vite: "^5.0.8",
          tailwindcss: "^3.4.1",
          postcss: "^8.4.35",
          autoprefixer: "^10.4.17",
        },
      },
      null,
      2
    ),

    "index.html": `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
    <title>Facture QR Suisse</title>
  </head>
  <body class="bg-gray-50 text-slate-900 print:bg-white">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`,

    "tailwind.config.js": `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}`,

    "postcss.config.js": `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,

    "vite.config.js": `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`,

    "src/index.css": `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply antialiased print:text-black;
  }
}

@media print {
  @page {
    size: A4;
    margin: 0;
  }
  .no-print {
    display: none !important;
  }
}`,

    "src/main.jsx": `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,

    // --- DATA ---
    "src/data/mock.js": `export const INITIAL_DATA = {
  company: {
    name: "Calliopee Sàrl",
    address: "Route de Meyrin 49",
    postal: "1203",
    city: "Genève",
    country: "Suisse",
    iban: "CH44 3199 9123 0008 8901 2"
  },
  client: {
    name: "Marie Dupont",
    address: "Rue du Lac 15",
    postal: "1201",
    city: "Genève",
    country: "Suisse",
    countryCode: "CH"
  },
  invoice: {
    number: "INV-2024-001",
    date: "25.03.2024",
    dueDate: "24.04.2024",
    items: [
      { id: 1, desc: "Consultation UI/UX", qty: 4, unitPrice: 150 },
      { id: 2, desc: "Développement React frontend", qty: 10, unitPrice: 180 },
      { id: 3, desc: "Frais de maintenance mensuels", qty: 1, unitPrice: 50 }
    ],
    vatRate: 8.1
  }
};`,

    // --- COMPONENTS ---
    "src/components/InvoiceHeader.jsx": `import { FileText, Download, Printer } from 'lucide-react';

export default function InvoiceHeader({ company, invoice }) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-16 px-1 print:px-0">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200 print:shadow-none">
                <FileText size={28} />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase italic">{company.name}</h1>
        </div>
        <div className="text-sm text-slate-500 font-medium leading-relaxed uppercase tracking-wider">
          {company.address}<br />
          {company.postal} {company.city}<br />
          {company.country}
        </div>
      </div>
      
      <div className="text-right space-y-6">
        <h2 className="text-5xl font-black tracking-tighter text-slate-900 leading-none">FACTURE</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">N° Facture</span>
          <span className="font-bold text-slate-900">{invoice.number}</span>
          <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Date</span>
          <span className="font-bold text-slate-900">{invoice.date}</span>
          <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Échéance</span>
          <span className="font-bold text-slate-900">{invoice.dueDate}</span>
        </div>
      </div>
    </div>
  );
}`,

    "src/components/InvoiceTable.jsx": `export default function InvoiceTable({ items, vatRate }) {
  const subtotal = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const vatAmount = (subtotal * vatRate) / 100;
  const total = subtotal + vatAmount;

  return (
    <div className="mb-16">
      <div className="overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-sm print:shadow-none print:border-none">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 print:bg-white border-b border-slate-100">
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Description</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Qté</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Prix</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/30 print:hover:bg-transparent transition-colors">
                <td className="px-8 py-6">
                  <span className="font-bold text-slate-900">{item.desc}</span>
                </td>
                <td className="px-8 py-6 text-center">
                  <span className="font-bold text-slate-600">{item.qty}</span>
                </td>
                <td className="px-8 py-6 text-right font-medium text-slate-500">
                  {item.unitPrice.toFixed(2)}
                </td>
                <td className="px-8 py-6 text-right">
                  <span className="font-black text-slate-900">{(item.qty * item.unitPrice).toFixed(2)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10 flex justify-end px-8">
        <div className="w-full max-w-[300px] space-y-4">
          <div className="flex justify-between items-center text-sm font-bold text-slate-500">
            <span className="uppercase tracking-widest text-[10px]">Sous-total HT</span>
            <span>{subtotal.toFixed(2)} CHF</span>
          </div>
          <div className="flex justify-between items-center text-sm font-bold text-slate-500">
            <span className="uppercase tracking-widest text-[10px]">TVA {vatRate}%</span>
            <span>{vatAmount.toFixed(2)} CHF</span>
          </div>
          <div className="pt-4 border-t-2 border-slate-900 flex justify-between items-end">
            <span className="text-xl font-black uppercase tracking-tighter leading-none">Total TTC</span>
            <span className="text-4xl font-black tracking-tighter text-blue-600 leading-none">{total.toFixed(2)} <span className="text-lg">CHF</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}`,

    "src/components/QrSlip.jsx": `import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export default function QrSlip({ data, total }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const qrData = [
      'SPC',                           // QR Type
      '0200',                          // Version
      '1',                             // Coding Type (UTF-8)
      data.company.iban.replace(/ /g, ''), // IBAN
      'S',                             // Address Type (Structured)
      data.company.name,               // Creditor Name
      data.company.address,            // Creditor Address
      '',                              // Building number
      data.company.postal,             // Postal code
      data.company.city,               // City
      'CH',                            // Country
      '',                              // Ultimate creditor (empty)
      '',                              // ''
      '',                              // ''
      '',                              // ''
      '',                              // ''
      '',                              // ''
      '',                              // ''
      total.toFixed(2),                // Amount
      'CHF',                           // Currency
      'S',                             // Debtor address type
      data.client.name,                // Debtor name
      data.client.address,             // Debtor address
      '',                              // Building number
      data.client.postal,              // Postal code
      data.client.city,                // City
      data.client.countryCode,          // Country code
      'NON',                           // Reference type (NON = no reference)
      '',                              // Reference
      \`Facture \${data.invoice.number}\`, // Additional information
      'EPD',                           // End of payment data
      ''                               // Alternative procedure
    ].join('\\n');

    QRCode.toCanvas(canvasRef.current, qrData, {
      width: 166,
      margin: 0,
      errorCorrectionLevel: 'M'
    }, (error) => {
      if (error) console.error(error);
    });
  }, [data, total]);

  return (
    <div className="mt-auto border-t-[1px] border-dashed border-slate-400 bg-white flex print:h-[105mm] relative">
      {/* Receipt Section */}
      <div className="w-[62mm] min-w-[62mm] p-[5mm] border-r-[1px] border-dashed border-slate-400 space-y-4">
        <h3 className="font-black text-xs uppercase tracking-widest">Récépissé</h3>
        
        <div className="space-y-1">
          <p className="text-[6px] font-black uppercase text-slate-400 leading-none">Compte / Payable à</p>
          <p className="text-[8px] font-bold leading-tight">
            {data.company.iban}<br />
            {data.company.name}<br />
            {data.company.address}<br />
            {data.company.postal} {data.company.city}
          </p>
        </div>

        <div className="pt-6">
          <div className="flex gap-4">
             <div>
               <p className="text-[6px] font-black uppercase text-slate-400 leading-none mb-1">Monnaie</p>
               <p className="text-[10px] font-black tracking-tighter">CHF</p>
             </div>
             <div>
               <p className="text-[6px] font-black uppercase text-slate-400 leading-none mb-1">Montant</p>
               <p className="text-[10px] font-black tracking-tighter">{total.toFixed(2)}</p>
             </div>
          </div>
        </div>

        <div className="mt-8 pt-8">
            <p className="text-[6px] font-black uppercase text-slate-400">Point de dépôt</p>
        </div>
      </div>

      {/* Payment Section */}
      <div className="flex-1 flex p-[5mm]">
        <div className="w-[56mm] min-w-[56mm] flex flex-col items-center">
            <h3 className="font-black text-xs uppercase tracking-widest mb-4 self-start">Section paiement</h3>
            <div className="relative w-[46mm] h-[46mm] group">
                <canvas ref={canvasRef} className="w-full h-full" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[7mm] h-[7mm] bg-white flex items-center justify-center p-[1mm]">
                    <div className="w-full h-full bg-black flex items-center justify-center relative">
                        <div className="absolute bg-white w-[1.5mm] h-[4mm]" />
                        <div className="absolute bg-white w-[4mm] h-[1.5mm]" />
                    </div>
                </div>
            </div>
        </div>

        <div className="flex-1 pl-6 space-y-4 pt-8">
            <div className="space-y-1">
                <p className="text-[6px] font-black uppercase text-slate-400 leading-none">Compte / Payable à</p>
                <p className="text-[9px] font-bold leading-relaxed">
                    {data.company.iban}<br />
                    {data.company.name}<br />
                    {data.company.address}<br />
                    {data.company.postal} {data.company.city}
                </p>
            </div>

            <div className="space-y-1">
                <p className="text-[6px] font-black uppercase text-slate-400 leading-none">Informations additionnelles</p>
                <p className="text-[9px] font-bold">Facture {data.invoice.number}</p>
            </div>

            <div className="pt-4 flex gap-10">
                <div>
                    <p className="text-[6px] font-black uppercase text-slate-400 leading-none mb-1">Monnaie</p>
                    <p className="text-[11px] font-black tracking-tighter">CHF</p>
                </div>
                <div>
                    <p className="text-[6px] font-black uppercase text-slate-400 leading-none mb-1">Montant</p>
                    <p className="text-[11px] font-black tracking-tighter">{total.toFixed(2)}</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}`,

    // --- MAIN APP ---
    "src/App.jsx": `import { useState } from 'react';
import { INITIAL_DATA } from './data/mock';
import InvoiceHeader from './components/InvoiceHeader';
import InvoiceTable from './components/InvoiceTable';
import QrSlip from './components/QrSlip';
import { Printer, Download, Plus, Trash2 } from 'lucide-react';

export default function App() {
  const [data, setData] = useState(INITIAL_DATA);

  const subtotal = data.invoice.items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const vatAmount = (subtotal * data.invoice.vatRate) / 100;
  const total = subtotal + vatAmount;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen pb-0 lg:pb-20 print:pb-0">
      {/* Control Panel (Hidden on Print) */}
      <div className="no-print border-b border-slate-200 sticky top-0 z-50 px-6 py-4 flex items-center justify-between backdrop-blur-md bg-white/80">
        <div className="flex items-center gap-4">
            <div className="bg-slate-900 text-white p-2 rounded-lg">
                <Printer size={18} />
            </div>
            <div>
                <h3 className="font-black text-sm uppercase tracking-tighter">Éditeur de Facture</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Format Suisse Standard (QR-Bill)</p>
            </div>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-100 hover:bg-blue-700 hover:-translate-y-0.5 transition-all"
            >
                <Printer size={16} /> Imprimer / PDF
            </button>
        </div>
      </div>

      {/* Invoice Container (A4 Size for Print) */}
      <div className="max-w-[210mm] mx-auto my-12 bg-white shadow-2xl overflow-hidden flex flex-col min-h-[297mm] rounded-[2rem] print:rounded-none print:shadow-none print:my-0">
        <div className="p-16 flex flex-col flex-1">
            <InvoiceHeader company={data.company} invoice={data.invoice} />
            
            <div className="mb-12">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 ml-1">Facturé à</h4>
                <div className="text-lg font-black tracking-tight text-slate-900 uppercase italic">
                    {data.client.name}
                </div>
                <div className="text-slate-500 font-medium leading-relaxed uppercase tracking-wider text-sm mt-1">
                    {data.client.address}<br />
                    {data.client.postal} {data.client.city}<br />
                    {data.client.country}
                </div>
            </div>

            <InvoiceTable items={data.invoice.items} vatRate={data.invoice.vatRate} />

            <div className="mt-10 p-8 bg-slate-50 rounded-3xl border border-slate-100 print:bg-white print:border-none print:p-0">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Modalité de paiement</h4>
                <p className="text-sm font-medium text-slate-600 leading-relaxed italic">
                    Paiement selon bulletin QR suisse ci-dessous.<br />
                    Merci pour votre confiance.
                </p>
            </div>
        </div>

        <QrSlip data={data} total={total} />
      </div>

      {/* Floating Design Note */}
      <p className="no-print text-center text-slate-300 text-[10px] font-black uppercase tracking-[0.5em] mt-12 mb-20 italic underline decoration-blue-500/30 underline-offset-8">Swiss_Project_Compliance_v2.0 // Generated by ShopFlow</p>
    </div>
  );
}`,
  }
};

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
- The QR code must include a Swiss cross overlay (black square with white cross)
- Payment slip height should be 105mm as per Swiss standard
- Use French or German labels depending on user preference
`;

export default swissQrInvoiceTemplate;
