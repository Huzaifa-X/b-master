import { TemplateDefinition } from './index';

export const accountingDashboardTemplate: TemplateDefinition = {
  id: "accounting-dashboard",
  name: "Accounting Dashboard",
  description: "Financial tracking with Tailwind CSS",
  category: "accounting",
  files: {
    "package.json": JSON.stringify(
      {
        name: "accounting-dashboard",
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
          "react-router-dom": "^6.22.3",
          "lucide-react": "^0.344.0",
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

    "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <title>FinanceOS</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`,

    "vite.config.js": `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`,

    "tailwind.config.js": `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
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

    "src/index.css": `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    font-family: 'Outfit', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    @apply bg-slate-50 text-slate-900;
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

    // --- MAIN APP ROUTER ---
    "src/App.jsx": `import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

function App() {
  return (
    <Router>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-8">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  )
}

export default App`,

    // --- COMPONENTS ---
    "src/components/Sidebar.jsx": `import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, FileBarChart, Settings, Wallet, LogOut } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="w-[260px] bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
      <div className="h-[72px] flex items-center px-6 gap-3 border-b border-slate-200">
        <div className="bg-slate-900 rounded-lg w-9 h-9 flex items-center justify-center">
          <Wallet size={24} color="white" />
        </div>
        <div className="font-extrabold text-xl tracking-tight">FinanceOS</div>
      </div>
      
      <nav className="p-6 flex flex-col flex-1">
        <div className="flex flex-col gap-1">
          <h4 className="text-[12px] uppercase tracking-wider text-slate-400 font-bold px-4 mb-2">Menu</h4>
          <NavLink to="/dashboard" className={({ isActive }) => \`flex items-center gap-3 px-4 py-2.5 rounded-lg font-semibold text-[15px] transition-all \${isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}\`}>
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </NavLink>
          <NavLink to="/transactions" className={({ isActive }) => \`flex items-center gap-3 px-4 py-2.5 rounded-lg font-semibold text-[15px] transition-all \${isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}\`}>
            <Receipt size={20} /> <span>Transactions</span>
          </NavLink>
          <NavLink to="/reports" className={({ isActive }) => \`flex items-center gap-3 px-4 py-2.5 rounded-lg font-semibold text-[15px] transition-all \${isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}\`}>
            <FileBarChart size={20} /> <span>Reports</span>
          </NavLink>
        </div>
        
        <div className="mt-auto flex flex-col gap-1">
          <NavLink to="/settings" className={({ isActive }) => \`flex items-center gap-3 px-4 py-2.5 rounded-lg font-semibold text-[15px] transition-all \${isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}\`}>
            <Settings size={20} /> <span>Settings</span>
          </NavLink>
          <button className="flex items-center gap-3 px-4 py-2.5 rounded-lg font-semibold text-[15px] transition-all text-slate-500 hover:bg-rose-50 hover:text-rose-600 text-left w-full" onClick={() => alert('Logging out...')}>
            <LogOut size={20} /> <span>Logout</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}`,

    "src/components/Header.jsx": `import { Bell, Search, Plus } from 'lucide-react';

export default function Header() {
  return (
    <header className="h-[72px] bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0">
      <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-lg w-full max-w-[400px]">
        <Search size={18} className="text-slate-400" />
        <input type="text" placeholder="Search transactions, invoices or reports..." className="bg-transparent border-none w-full text-[15px] text-slate-900 outline-none placeholder:text-slate-400" />
      </div>
      
      <div className="flex items-center gap-5">
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-all" onClick={() => alert('Add transaction modal coming soon!')}>
          <Plus size={16} /> New Transaction
        </button>
        <div className="h-6 w-px bg-slate-200"></div>
        <button className="relative w-10 h-10 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all" onClick={() => alert('Showing recent activities')}>
          <Bell size={20} />
          <span className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] rounded-full px-1 py-0.5 font-bold border-2 border-white translate-x-1/4 -translate-y-1/4">3</span>
        </button>
        <div className="flex items-center gap-3 cursor-pointer">
          <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="Profile" className="w-10 h-10 rounded-full object-cover" />
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-slate-900">Alex Morgan</span>
            <span className="text-[12px] text-slate-500">Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
}`,

    // --- DATA ---
    "src/data/transactions.js": `export const recentTransactions = [
  { id: 'TRX-8572', date: 'Oct 24, 2023', name: 'Stripe Payout', category: 'Income', amount: '+$4,500.00', status: 'Completed' },
  { id: 'TRX-8571', date: 'Oct 23, 2023', name: 'AWS Services', category: 'Infrastructure', amount: '-$342.50', status: 'Completed' },
  { id: 'TRX-8570', date: 'Oct 21, 2023', name: 'WeWork Office', category: 'Real Estate', amount: '-$1,200.00', status: 'Pending' },
  { id: 'TRX-8569', date: 'Oct 20, 2023', name: 'Client Retainer', category: 'Income', amount: '+$2,500.00', status: 'Completed' }
];

export const cashFlowData = [
  { month: 'May', income: 60, expense: 40 },
  { month: 'Jun', income: 70, expense: 45 },
  { month: 'Jul', income: 85, expense: 50 },
  { month: 'Aug', income: 65, expense: 55 },
  { month: 'Sep', income: 90, expense: 40 },
  { month: 'Oct', income: 100, expense: 35 }
];

export const kpiData = [
  {
    id: 'revenue',
    label: 'Total Revenue',
    value: '$124,563.00',
    trend: '+12.5%',
    trendType: 'positive',
    iconType: 'dollar',
    colorScheme: 'blue'
  },
  {
    id: 'expenses',
    label: 'Total Expenses',
    value: '$42,120.50',
    trend: '+4.2%',
    trendType: 'negative',
    iconType: 'card',
    colorScheme: 'rose'
  },
  {
    id: 'profit',
    label: 'Net Profit',
    value: '$82,442.50',
    trend: '+8.4%',
    trendType: 'positive',
    iconType: 'trending',
    colorScheme: 'emerald'
  }
];`,

    // --- DASHBOARD COMPONENTS ---
    "src/components/dashboard/KpiCard.jsx": `import { ArrowUpRight, DollarSign, CreditCard, TrendingUp } from 'lucide-react';

const iconMap = {
  dollar: DollarSign,
  card: CreditCard,
  trending: TrendingUp
};

const colorMaps = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' }
};

export default function KpiCard({ label, value, trend, trendType, iconType, colorScheme }) {
  const Icon = iconMap[iconType] || DollarSign;
  const colors = colorMaps[colorScheme] || colorMaps.blue;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className={\`w-10 h-10 flex items-center justify-center rounded-lg \${colors.bg} \${colors.text}\`}>
          <Icon size={20} />
        </div>
        <span className={\`inline-flex items-center gap-1 text-[12px] font-bold px-2 py-0.5 rounded-full \${trendType === 'positive' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}\`}>
          <ArrowUpRight size={14} /> {trend}
        </span>
      </div>
      <div>
        <span className="text-slate-500 text-sm font-medium">{label}</span>
        <h2 className="text-2xl font-bold text-slate-900 mt-1">{value}</h2>
      </div>
    </div>
  );
}`,

    "src/components/dashboard/KpiGrid.jsx": `import KpiCard from './KpiCard';
import { kpiData } from '../../data/transactions';

export default function KpiGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {kpiData.map((kpi) => (
        <KpiCard
          key={kpi.id}
          label={kpi.label}
          value={kpi.value}
          trend={kpi.trend}
          trendType={kpi.trendType}
          iconType={kpi.iconType}
          colorScheme={kpi.colorScheme}
        />
      ))}
    </div>
  );
}`,

    "src/components/dashboard/CashFlowChart.jsx": `import { cashFlowData } from '../../data/transactions';

export default function CashFlowChart() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm lg:col-span-2">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-lg font-bold text-slate-900">Cash Flow</h3>
        <select className="bg-slate-50 border border-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg outline-none">
          <option>Last 6 Months</option>
          <option>This Year</option>
        </select>
      </div>
      <div className="h-[250px] flex items-end gap-4">
        <div className="flex flex-col justify-between h-full text-[10px] font-bold text-slate-400 pb-6 pr-2">
          <span>$50k</span><span>$40k</span><span>$30k</span><span>$20k</span><span>$10k</span><span>$0</span>
        </div>
        <div className="flex-1 flex justify-around items-end h-full relative">
          {/* Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
            {[1,2,3,4,5,6].map(i => <div key={i} className="w-full h-px bg-slate-100"></div>)}
          </div>
          
          {cashFlowData.map((data, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2 group relative z-10 h-full justify-end pb-6 w-full">
              <div className="flex gap-1 items-end h-[180px]">
                <div className="w-3 bg-blue-600 rounded-t-sm transition-all duration-300 hover:bg-blue-700" style={{ height: \`\${data.income}%\` }}></div>
                <div className="w-3 bg-slate-200 rounded-t-sm transition-all duration-300 hover:bg-slate-300" style={{ height: \`\${data.expense}%\` }}></div>
              </div>
              <span className="text-[10px] font-bold text-slate-500 absolute bottom-0">{data.month}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}`,

    "src/components/dashboard/TransactionRow.jsx": `import { Eye } from 'lucide-react';

export default function TransactionRow({ transaction }) {
  const { id, date, name, category, amount, status } = transaction;
  const isPositive = amount.startsWith('+');

  return (
    <tr className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
      <td className="py-4 px-4 font-medium text-slate-500">{id}</td>
      <td className="py-4 px-4 text-sm text-slate-600">{date}</td>
      <td className="py-4 px-4 font-bold text-slate-900">{name}</td>
      <td className="py-4 px-4">
        <span className="inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 uppercase tracking-tight">{category}</span>
      </td>
      <td className={\`py-4 px-4 text-right font-bold \${isPositive ? 'text-emerald-600' : 'text-slate-900'}\`}>
        {amount}
      </td>
      <td className="py-4 px-4 text-center">
        <span className={\`inline-flex px-3 py-1 rounded-full text-xs font-bold \${status.toLowerCase() === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}\`}>
          {status}
        </span>
      </td>
      <td className="py-4 px-4 text-right">
        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all"><Eye size={16} /></button>
      </td>
    </tr>
  );
}`,

    "src/components/dashboard/TransactionsTable.jsx": `import TransactionRow from './TransactionRow';
import { recentTransactions } from '../../data/transactions';

export default function TransactionsTable() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden lg:col-span-3">
      <div className="p-6 border-b border-slate-50 flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-900">Recent Transactions</h3>
        <button className="text-blue-600 font-bold text-sm hover:underline" onClick={() => alert('Redirecting to full history...')}>View All</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">Transaction ID</th>
              <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">Date</th>
              <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">Description</th>
              <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">Category</th>
              <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-right">Amount</th>
              <th className="py-3 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center">Status</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {recentTransactions.map((trx) => (
              <TransactionRow key={trx.id} transaction={trx} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}`,

    // --- PAGES ---
    "src/pages/Dashboard.jsx": `import { Download } from 'lucide-react';
import KpiGrid from '../components/dashboard/KpiGrid';
import CashFlowChart from '../components/dashboard/CashFlowChart';
import TransactionsTable from '../components/dashboard/TransactionsTable';

export default function Dashboard() {
  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-[32px] font-extrabold tracking-tight text-slate-900">Financial Overview</h1>
          <p className="text-slate-500 mt-1">Track your revenue and expenses in real-time.</p>
        </div>
        <div>
          <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm bg-white border border-slate-200 text-slate-900 shadow-sm hover:bg-slate-50 transition-all" onClick={() => alert('CSV file prepared for download!')}>
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      <KpiGrid />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <CashFlowChart />
        <TransactionsTable />
      </div>
    </div>
  );
}`,

    "src/pages/Transactions.jsx": `import { Filter, Search } from 'lucide-react';

export default function Transactions() {
  return (
    <div className="animate-in fade-in duration-500 bg-white rounded-2xl border border-slate-200 shadow-sm min-h-full">
      <div className="p-8 border-b border-slate-100 mb-8 flex justify-between items-center">
        <div>
           <h1 className="text-[32px] font-extrabold tracking-tight text-slate-900">All Transactions</h1>
           <p className="text-slate-500 mt-1">View and manage your entire transaction history.</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 border border-slate-200 bg-white px-4 py-2 rounded-lg">
             <Search size={16} className="text-slate-400" />
             <input type="text" placeholder="Search..." className="bg-transparent border-none outline-none text-sm" />
           </div>
           <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm bg-white border border-slate-200 text-slate-900 shadow-sm hover:bg-slate-50 transition-all">
             <Filter size={16} /> Filter
           </button>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center p-20 text-center">
         <p className="text-slate-500">This is a full page view simulating the Transactions route.</p>
         <p className="text-slate-400 text-xs mt-2">The table component from the Dashboard would normally be re-used here with pagination.</p>
      </div>
    </div>
  );
}`,

    "src/pages/Reports.jsx": `import { FileBarChart } from 'lucide-react';

export default function Reports() {
  return (
    <div className="animate-in fade-in duration-500 bg-white rounded-2xl border border-slate-200 shadow-sm min-h-full">
       <div className="p-8 border-b border-slate-100 mb-8">
        <div>
           <h1 className="text-[32px] font-extrabold tracking-tight text-slate-900">Financial Reports</h1>
           <p className="text-slate-500 mt-1">Generate P&L, Balance Sheets, and Cash Flow statements.</p>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center p-20 text-center">
         <FileBarChart size={48} className="text-slate-300 mb-6" />
         <h3 className="text-xl font-bold text-slate-900">No reports generated yet</h3>
         <p className="text-slate-500 mt-2 max-w-[300px]">Select a date range and report type to generate your first financial document.</p>
         <button className="mt-8 px-6 py-3 rounded-xl font-bold bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all">Generate Report</button>
      </div>
    </div>
  );
}`,

    "src/pages/Settings.jsx": `import { Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  return (
    <div className="animate-in fade-in duration-500 bg-white rounded-2xl border border-slate-200 shadow-sm min-h-full">
      <div className="p-8 border-b border-slate-100 mb-8">
        <div>
           <h1 className="text-[32px] font-extrabold tracking-tight text-slate-900">Account Settings</h1>
           <p className="text-slate-500 mt-1">Manage company details, billing, and team members.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 p-8">
         <div className="flex flex-col gap-1">
            <button className="text-left px-4 py-2.5 rounded-lg font-bold text-[15px] bg-blue-50 text-blue-600 transition-all">Company Profile</button>
            <button className="text-left px-4 py-2.5 rounded-lg font-semibold text-[15px] text-slate-500 hover:bg-slate-50 transition-all">Bank Accounts</button>
            <button className="text-left px-4 py-2.5 rounded-lg font-semibold text-[15px] text-slate-500 hover:bg-slate-50 transition-all">Team Members</button>
            <button className="text-left px-4 py-2.5 rounded-lg font-semibold text-[15px] text-slate-500 hover:bg-slate-50 transition-all">Notifications</button>
         </div>
         <div className="md:col-span-3">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Company Profile</h3>
            <div className="flex flex-col gap-4 max-w-[400px]">
              <div className="flex flex-col gap-1.5">
                 <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Company Name</label>
                 <input type="text" defaultValue="Acme Corp" className="px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all" />
              </div>
              <div className="flex flex-col gap-1.5">
                 <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider">Tax ID / EIN</label>
                 <input type="text" defaultValue="XX-XXXXXXX" className="px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all" />
              </div>
              <button className="mt-4 px-6 py-3 rounded-xl font-bold bg-slate-900 text-white self-start hover:bg-black transition-all">Save Changes</button>
            </div>
         </div>
      </div>
    </div>
  );
}`,
  }
};
