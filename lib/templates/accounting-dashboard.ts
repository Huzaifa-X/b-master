export const accountingDashboardTemplate = {
  id: "accounting-dashboard",
  name: "Accounting Dashboard",
  description: "Financial tracking with React Router pages",
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
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            fontFamily: {
              sans: ['Outfit', 'system-ui', 'sans-serif'],
            },
          }
        }
      }
    </script>
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
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-layout">
        <Sidebar />
        <div className="main-wrapper">
          <Header />
          <main className="content-area">
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
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-logo"><Wallet size={24} color="white" /></div>
        <div className="brand-text">FinanceOS</div>
      </div>
      
      <nav className="nav-menu">
        <div className="nav-group">
          <h4 className="nav-title">Menu</h4>
          <NavLink to="/dashboard" className="nav-item">
            <LayoutDashboard size={20} /> <span>Dashboard</span>
          </NavLink>
          <NavLink to="/transactions" className="nav-item">
            <Receipt size={20} /> <span>Transactions</span>
          </NavLink>
          <NavLink to="/reports" className="nav-item">
            <FileBarChart size={20} /> <span>Reports</span>
          </NavLink>
        </div>
        
        <div className="nav-group mt-auto">
          <NavLink to="/settings" className="nav-item">
            <Settings size={20} /> <span>Settings</span>
          </NavLink>
          <button className="nav-item logout-btn" onClick={() => alert('Logging out...')}>
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
    <header className="top-header">
      <div className="search-bar">
        <Search size={18} className="search-icon" />
        <input type="text" placeholder="Search transactions, invoices or reports..." />
      </div>
      
      <div className="header-actions">
        <button className="btn btn-primary shadow-sm" onClick={() => alert('Add transaction modal coming soon!')}>
          <Plus size={16} /> New Transaction
        </button>
        <div className="action-divider"></div>
        <button className="icon-btn relative" onClick={() => alert('Showing recent activities')}>
          <Bell size={20} />
          <span className="badge">3</span>
        </button>
        <div className="user-profile">
          <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="Profile" />
          <div className="user-info">
            <span className="user-name">Alex Morgan</span>
            <span className="user-role">Admin</span>
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

export default function KpiCard({ label, value, trend, trendType, iconType, colorScheme }) {
  const Icon = iconMap[iconType] || DollarSign;

  return (
    <div className="kpi-card card">
      <div className="kpi-header">
        <div className={\`kpi-icon-wrapper bg-\${colorScheme}-subtle text-\${colorScheme}\`}>
          <Icon size={20} />
        </div>
        <span className={\`badge-trend \${trendType}\`}>
          <ArrowUpRight size={14} /> {trend}
        </span>
      </div>
      <div className="kpi-body">
        <span className="kpi-label">{label}</span>
        <h2 className="kpi-value">{value}</h2>
      </div>
    </div>
  );
}`,

    "src/components/dashboard/KpiGrid.jsx": `import KpiCard from './KpiCard';
import { kpiData } from '../../data/transactions';

export default function KpiGrid() {
  return (
    <div className="kpi-grid">
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
    <div className="chart-section card lg-col-span-2">
      <div className="card-header">
        <h3 className="card-title">Cash Flow</h3>
        <select className="select-sm">
          <option>Last 6 Months</option>
          <option>This Year</option>
        </select>
      </div>
      <div className="chart-container mock-bar-chart">
        <div className="y-axis">
          <span>$50k</span><span>$40k</span><span>$30k</span><span>$20k</span><span>$10k</span><span>$0</span>
        </div>
        <div className="bars-area">
          {cashFlowData.map((data, idx) => (
            <div key={idx} className="bar-group">
              <div className="bar income" style={{ height: \`\${data.income}%\` }}></div>
              <div className="bar expense" style={{ height: \`\${data.expense}%\` }}></div>
              <span className="bar-label">{data.month}</span>
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
    <tr>
      <td className="font-medium text-muted">{id}</td>
      <td>{date}</td>
      <td className="font-semibold">{name}</td>
      <td><span className="category-pill">{category}</span></td>
      <td className={\`text-right font-semibold \${isPositive ? 'text-emerald' : 'text-main'}\`}>
        {amount}
      </td>
      <td className="text-center">
        <span className={\`status-badge \${status.toLowerCase()}\`}>{status}</span>
      </td>
      <td className="text-right">
        <button className="icon-btn-sm"><Eye size={16} /></button>
      </td>
    </tr>
  );
}`,

    "src/components/dashboard/TransactionsTable.jsx": `import TransactionRow from './TransactionRow';
import { recentTransactions } from '../../data/transactions';

export default function TransactionsTable() {
  return (
    <div className="recent-section card lg-col-span-3">
      <div className="card-header">
        <h3 className="card-title">Recent Transactions</h3>
        <button className="btn-link" onClick={() => alert('Redirecting to full history...')}>View All</button>
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Transaction ID</th>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th className="text-right">Amount</th>
              <th className="text-center">Status</th>
              <th></th>
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
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Financial Overview</h1>
          <p className="page-subtitle">Track your revenue and expenses in real-time.</p>
        </div>
        <div className="header-buttons">
          <button className="btn btn-outline" onClick={() => alert('CSV file prepared for download!')}><Download size={16} /> Export CSV</button>
        </div>
      </div>

      <KpiGrid />

      <div className="dashboard-grid">
        <CashFlowChart />
        <TransactionsTable />
      </div>
    </div>
  );
}`,

    "src/pages/Transactions.jsx": `import { Filter, Search } from 'lucide-react';

export default function Transactions() {
  return (
    <div className="animate-fade-in card full-height-card">
      <div className="card-header border-bottom pb-4 mb-4">
        <div>
           <h1 className="page-title">All Transactions</h1>
           <p className="page-subtitle">View and manage your entire transaction history.</p>
        </div>
        <div className="header-actions">
           <div className="search-bar border">
             <Search size={16} className="search-icon" />
             <input type="text" placeholder="Search..." />
           </div>
           <button className="btn btn-outline"><Filter size={16} /> Filter</button>
        </div>
      </div>
      <div className="empty-state">
         <p className="text-muted">This is a full page view simulating the Transactions route.</p>
         <p className="text-muted text-sm mt-2">The table component from the Dashboard would normally be re-used here with pagination.</p>
      </div>
    </div>
  );
}`,

    "src/pages/Reports.jsx": `import { FileBarChart } from 'lucide-react';

export default function Reports() {
  return (
    <div className="animate-fade-in card full-height-card">
       <div className="card-header border-bottom pb-4 mb-4">
        <div>
           <h1 className="page-title">Financial Reports</h1>
           <p className="page-subtitle">Generate P&L, Balance Sheets, and Cash Flow statements.</p>
        </div>
      </div>
      <div className="empty-state">
         <FileBarChart size={48} className="text-muted mb-4 opacity-50" />
         <h3>No reports generated yet</h3>
         <p className="text-muted mt-2">Select a date range and report type to generate your first financial document.</p>
         <button className="btn btn-primary mt-6">Generate Report</button>
      </div>
    </div>
  );
}`,

    "src/pages/Settings.jsx": `import { Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  return (
    <div className="animate-fade-in card full-height-card">
      <div className="card-header border-bottom pb-4 mb-4">
        <div>
           <h1 className="page-title">Account Settings</h1>
           <p className="page-subtitle">Manage company details, billing, and team members.</p>
        </div>
      </div>
      <div className="settings-grid">
         <div className="settings-nav">
            <button className="settings-tab active">Company Profile</button>
            <button className="settings-tab">Bank Accounts</button>
            <button className="settings-tab">Team Members</button>
            <button className="settings-tab">Notifications</button>
         </div>
         <div className="settings-content">
            <h3 className="mb-4">Company Profile</h3>
            <div className="form-group">
               <label>Company Name</label>
               <input type="text" defaultValue="Acme Corp" className="input" />
            </div>
            <div className="form-group mt-4">
               <label>Tax ID / EIN</label>
               <input type="text" defaultValue="XX-XXXXXXX" className="input" />
            </div>
            <button className="btn btn-primary mt-6">Save Changes</button>
         </div>
      </div>
    </div>
  );
}`,

    // --- STYLES ---
    "src/App.css": `
:root {
  --blue: #2563EB;
  --blue-subtle: #EFF6FF;
  --emerald: #10B981;
  --emerald-subtle: #ECFDF5;
  --rose: #F43F5E;
  --rose-subtle: #FFF1F2;
  --amber: #F59E0B;
  --slate-900: #0F172A;
  --slate-800: #1E293B;
  --slate-700: #334155;
  --slate-500: #64748B;
  --slate-400: #94A3B8;
  --slate-200: #E2E8F0;
  --slate-100: #F1F5F9;
  --slate-50: #F8FAFC;
  
  --bg-color: var(--slate-50);
  --surface: #FFFFFF;
  --text-main: var(--slate-900);
  --text-muted: var(--slate-500);
  --border: var(--slate-200);
  
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body { 
  font-family: 'Outfit', sans-serif; 
  background-color: var(--bg-color); 
  color: var(--text-main); 
  -webkit-font-smoothing: antialiased;
}

/* Utilities */
.text-blue { color: var(--blue); }
.text-emerald { color: var(--emerald); }
.text-rose { color: var(--rose); }
.bg-blue-subtle { background-color: var(--blue-subtle); }
.bg-emerald-subtle { background-color: var(--emerald-subtle); }
.bg-rose-subtle { background-color: var(--rose-subtle); }
.text-muted { color: var(--text-muted); }
.text-main { color: var(--text-main); }
.font-semibold { font-weight: 600; }
.font-medium { font-weight: 500; }
.text-right { text-align: right; }
.text-center { text-align: center; }
.mb-4 { margin-bottom: 1rem; }
.mt-2 { margin-top: 0.5rem; }
.mt-4 { margin-top: 1rem; }
.mt-6 { margin-top: 1.5rem; }
.pb-4 { padding-bottom: 1rem; }
.border-bottom { border-bottom: 1px solid var(--border); }
.opacity-50 { opacity: 0.5; }

/* Layout */
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: 260px;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

/* Sidebar */
.brand {
  height: 72px;
  display: flex;
  align-items: center;
  padding: 0 1.5rem;
  gap: 0.75rem;
  border-bottom: 1px solid var(--border);
}

.brand-logo {
  background: var(--slate-900);
  border-radius: 8px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-text {
  font-weight: 800;
  font-size: 1.25rem;
  letter-spacing: -0.025em;
}

.nav-menu {
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.nav-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.mt-auto { margin-top: auto; }

.nav-title {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--slate-400);
  font-weight: 700;
  padding: 0 1rem;
  margin-bottom: 0.5rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 1rem;
  border-radius: 8px;
  color: var(--slate-500);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9375rem;
  transition: all 0.2s;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  width: 100%;
}

.nav-item:hover {
  background: var(--slate-50);
  color: var(--slate-900);
}

.nav-item.active {
  background: var(--blue-subtle);
  color: var(--blue);
}

.logout-btn:hover {
  color: var(--rose);
  background: var(--rose-subtle);
}

/* Header */
.top-header {
  height: 72px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  flex-shrink: 0;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--slate-50);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  width: 100%;
  max-width: 400px;
}
.search-bar.border {
  background: var(--surface);
  border: 1px solid var(--border);
}

.search-icon { color: var(--slate-400); }

.search-bar input {
  border: none;
  background: transparent;
  width: 100%;
  font-family: inherit;
  font-size: 0.9375rem;
  color: var(--text-main);
  outline: none;
}
.search-bar input::placeholder { color: var(--slate-400); }

.header-actions {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.action-divider {
  height: 24px;
  width: 1px;
  background: var(--border);
}

.badge {
  position: absolute;
  top: 0;
  right: 0;
  background: var(--rose);
  color: white;
  font-size: 0.625rem;
  border-radius: 10px;
  padding: 2px 5px;
  font-weight: 700;
  border: 2px solid var(--surface);
  transform: translate(25%, -25%);
}

.icon-btn, .icon-btn-sm {
  background: transparent;
  border: none;
  color: var(--slate-500);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s;
}
.icon-btn { width: 40px; height: 40px; }
.icon-btn-sm { width: 32px; height: 32px; }

.icon-btn:hover, .icon-btn-sm:hover {
  background: var(--slate-100);
  color: var(--slate-900);
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
}

.user-profile img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.user-info { display: flex; flex-direction: column; }
.user-name { font-weight: 600; font-size: 0.875rem; color: var(--text-main); }
.user-role { font-size: 0.75rem; color: var(--slate-500); }

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  border: 1px solid transparent;
}

.btn-primary { background: var(--blue); color: white; }
.btn-primary:hover { background: #1D4ED8; }
.btn-outline { background: var(--surface); border-color: var(--border); color: var(--text-main); }
.btn-outline:hover { background: var(--slate-50); }
.btn-link { background: transparent; color: var(--blue); font-weight: 600; font-size: 0.875rem; border: none; cursor: pointer; }
.btn-link:hover { text-decoration: underline; }

/* Page Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 2rem;
}

.page-title { font-size: 1.875rem; font-weight: 800; letter-spacing: -0.025em; line-height: 1.2; }
.page-subtitle { color: var(--text-muted); margin-top: 0.25rem; font-size: 0.9375rem; }

/* Cards */
.card {
  background: var(--surface);
  border-radius: 16px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  padding: 1.5rem;
}

.full-height-card { min-height: calc(100vh - 4rem - 72px); }

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.card-title { font-size: 1.125rem; font-weight: 700; letter-spacing: -0.025em; }

/* KPIs */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.kpi-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.kpi-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge-trend {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 700;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
}
.badge-trend.positive { background: var(--emerald-subtle); color: var(--emerald); }
.badge-trend.negative { background: var(--rose-subtle); color: var(--rose); }

.kpi-label { font-size: 0.875rem; color: var(--text-muted); font-weight: 500; display: block; margin-bottom: 0.25rem; }
.kpi-value { font-size: 2rem; font-weight: 800; letter-spacing: -0.025em; }

/* Dashboard Grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 1.5rem;
}

@media (min-width: 1024px) {
  .dashboard-grid { grid-template-columns: repeat(5, 1fr); }
  .lg-col-span-2 { grid-column: span 2; }
  .lg-col-span-3 { grid-column: span 3; }
}

/* Mock Bar Chart */
.chart-container { height: 280px; position: relative; }
.select-sm { padding: 0.25rem 0.5rem; border-radius: 6px; border: 1px solid var(--border); font-family: inherit; font-size: 0.875rem; font-weight: 500; }

.mock-bar-chart {
  display: flex;
}
.y-axis {
  display: flex;
  flex-direction: column-reverse;
  justify-content: space-between;
  padding-bottom: 2rem;
  padding-right: 1rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 500;
}
.bars-area {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding-bottom: 2rem;
  position: relative;
}
.bars-area::before {
  content: '';
  position: absolute;
  bottom: 2rem;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--border);
}
.bar-group {
  display: flex;
  gap: 4px;
  height: 100%;
  align-items: flex-end;
  width: 12%;
  position: relative;
}
.bar {
  flex: 1;
  border-radius: 4px 4px 0 0;
  transition: height 1s ease;
}
.bar.income { background: var(--emerald); }
.bar.expense { background: var(--rose); }
.bar-label {
  position: absolute;
  bottom: -2rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 500;
}

/* Tables */
.table-responsive { overflow-x: auto; margin: -1.5rem; padding: 1.5rem; padding-top: 0; }
.data-table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 600px; }
.data-table th {
  text-align: left;
  padding: 0.75rem 1rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--slate-400);
  font-weight: 700;
  border-bottom: 1px solid var(--border);
}
.data-table td {
  padding: 1rem;
  border-bottom: 1px solid var(--border);
  font-size: 0.875rem;
  color: var(--text-main);
  vertical-align: middle;
}
.data-table tr:last-child td { border-bottom: none; }

.category-pill {
  background: var(--slate-100);
  color: var(--slate-700);
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
}
.status-badge.completed { background: var(--emerald-subtle); color: var(--emerald); }
.status-badge.pending { background: var(--slate-100); color: var(--slate-600); }

/* Settings Form */
.settings-grid { display: flex; gap: 2rem; }
.settings-nav { width: 200px; display: flex; flex-direction: column; gap: 0.5rem; }
.settings-tab {
  padding: 0.75rem 1rem;
  text-align: left;
  background: transparent;
  border: none;
  font-family: inherit;
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--text-muted);
  border-radius: 8px;
  cursor: pointer;
}
.settings-tab:hover { background: var(--slate-50); color: var(--text-main); }
.settings-tab.active { background: var(--blue-subtle); color: var(--blue); }
.settings-content { flex: 1; max-width: 500px; }
.form-group { display: flex; flex-direction: column; gap: 0.5rem; }
.form-group label { font-size: 0.875rem; font-weight: 600; color: var(--slate-700); }
.input {
  padding: 0.75rem 1rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.875rem;
  outline: none;
  transition: border 0.2s;
}
.input:focus { border-color: var(--blue); }

/* Empty States */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  text-align: center;
}

/* Animations */
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.animate-fade-in { animation: fadeIn 0.3s ease forwards; }

/* Responsive adjustments */
@media (max-width: 768px) {
  .app-layout { flex-direction: column; }
  .sidebar { width: 100%; height: auto; border-right: none; border-bottom: 1px solid var(--border); }
  .nav-menu { flex-direction: row; overflow-x: auto; padding: 1rem; flex: unset; }
  .nav-item { width: auto; padding: 0.5rem 0.75rem; }
  .nav-item span { display: none; }
  .nav-group.mt-auto { margin-top: 0; display: flex; flex-direction: row; margin-left: auto; }
  .header-actions .user-name, .header-actions .user-role { display: none; }
  .kpi-grid { grid-template-columns: 1fr; }
  .settings-grid { flex-direction: column; }
  .settings-nav { width: 100%; flex-direction: row; overflow-x: auto; }
  .settings-tab { white-space: nowrap; }
}
`,

    "src/index.css": `:root {
  font-family: 'Outfit', system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: light;
  background-color: #F8FAFC;
  text-rendering: optimizeLegibility;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}

#root {
  width: 100%;
}`
  }
};
