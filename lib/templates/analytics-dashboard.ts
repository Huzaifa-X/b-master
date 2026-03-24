export const analyticsDashboardTemplate = {
  id: "analytics-dashboard",
  name: "Analytics Dashboard",
  description: "Enterprise-grade data visualization with React Router and Recharts",
  category: "Analytics",
  icon: "BarChart3",
  files: {
    "package.json": JSON.stringify(
      {
        name: "analytics-dashboard",
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
          "recharts": "^2.12.2",
          "clsx": "^2.1.0",
          "tailwind-merge": "^2.2.1"
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
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <title>DataFlow Analytics</title>
  </head>
  <body class="bg-gray-50">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`,

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
    "src/data/mockData.js": `export const activityData = [
  { name: 'Mon', visits: 4000, active: 2400 },
  { name: 'Tue', visits: 3000, active: 1398 },
  { name: 'Wed', visits: 2000, active: 9800 },
  { name: 'Thu', visits: 2780, active: 3908 },
  { name: 'Fri', visits: 1890, active: 4800 },
  { name: 'Sat', visits: 2390, active: 3800 },
  { name: 'Sun', visits: 3490, active: 4300 },
];

export const deviceData = [
  { name: 'Desktop', value: 400 },
  { name: 'Mobile', value: 300 },
  { name: 'Tablet', value: 100 },
];

export const sourceData = [
  { name: 'Direct', value: 45 },
  { name: 'Social', value: 25 },
  { name: 'Search', value: 30 },
];

export const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];`,

    // --- COMPONENTS ---
    "src/components/layout/Sidebar.jsx": `import { NavLink } from 'react-router-dom';
import { 
  BarChart3, Users, MousePointer, 
  Activity, Settings, HelpCircle,
  LayoutDashboard
} from 'lucide-react';

const navItems = [
  { path: '/overview', label: 'Overview', icon: LayoutDashboard },
  { path: '/audiences', label: 'Audiences', icon: Users },
  { path: '/acquisition', label: 'Acquisition', icon: MousePointer },
  { path: '/behavior', label: 'Behavior', icon: Activity },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">
          <BarChart3 className="text-blue-600" size={24} strokeWidth={3} />
        </div>
        <span className="brand-text">DataFlow</span>
      </div>

      <nav className="sidebar-nav">
        <p className="nav-section-label">Main Menu</p>
        {navItems.map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path}
            className={({ isActive }) => \`nav-item \${isActive ? 'active' : ''}\`}
          >
            <item.icon size={20} className="nav-icon" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="nav-item" onClick={() => alert('Settings coming soon!')}>
          <Settings size={20} className="nav-icon" />
          <span>Settings</span>
        </button>
        <button className="nav-item" onClick={() => alert('Support ticket system would open!')}>
          <HelpCircle size={20} className="nav-icon" />
          <span>Support</span>
        </button>
      </div>
    </aside>
  );
}`,

    "src/components/ui/MetricCard.jsx": `import { TrendingUp, TrendingDown } from 'lucide-react';

export default function MetricCard({ title, value, change, trend, icon: Icon, color }) {
  const isPositive = trend === 'up';
  return (
    <div className="card metric-card">
      <div className="metric-header">
        <div className={\`metric-icon-bg \${color}\`}>
          <Icon size={20} />
        </div>
        <div className={\`trend-badge \${isPositive ? 'positive' : 'negative'}\`}>
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {change}
        </div>
      </div>
      <div className="metric-content">
        <h3 className="metric-title">{title}</h3>
        <p className="metric-value">{value}</p>
      </div>
    </div>
  );
}`,

    "src/components/charts/ActivityChart.jsx": `import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

export default function ActivityChart({ data }) {
  return (
    <div className="card chart-card">
      <div className="card-header">
        <h3 className="card-title">User Activity</h3>
        <p className="card-subtitle">Last 7 days performance</p>
      </div>
      <div className="chart-container" style={{ height: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 12 }}
            />
            <Tooltip 
              cursor={{ fill: 'rgba(0,0,0,0.02)' }}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
            />
            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
            <Bar dataKey="visits" name="New Visitors" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={24} />
            <Bar dataKey="active" name="Active Users" fill="#10B981" radius={[4, 4, 0, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}`,

    "src/components/charts/DonutChart.jsx": `import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { COLORS } from '../../data/mockData';

export default function DonutChart({ data, title }) {
  return (
    <div className="card chart-card h-full">
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
      </div>
      <div className="chart-container" style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={60}
              outerRadius={90}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={\`cell-\${index}\`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
            />
            <Legend iconType="circle" layout="vertical" align="right" verticalAlign="middle" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}`,

    // --- PAGES ---
    "src/pages/Overview.jsx": `import { 
  Users, Activity, MousePointer, 
  TrendingUp, Download, Calendar
} from 'lucide-react';
import MetricCard from '../components/ui/MetricCard';
import ActivityChart from '../components/charts/ActivityChart';
import DonutChart from '../components/charts/DonutChart';
import { activityData, deviceData, sourceData } from '../data/mockData';

export default function Overview() {
  return (
    <div className="page-container">
      <header className="page-header">
        <div className="header-left">
          <h1 className="page-title">Executive Summary</h1>
          <p className="page-subtitle">Real-time performance metrics</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => alert('Date picker would open!')}>
             <Calendar size={16} /> 
             <span>Mar 1 - Mar 30</span>
          </button>
          <button className="btn btn-primary" onClick={() => alert('Exporting report as PDF...')}>
             <Download size={16} />
             <span>Export</span>
          </button>
        </div>
      </header>

      <div className="stats-grid">
        <MetricCard 
          title="Total Users" 
          value="45.2k" 
          change="+12.5%" 
          trend="up" 
          icon={Users} 
          color="bg-blue-100 text-blue-600" 
        />
        <MetricCard 
          title="Avg. Session" 
          value="4m 32s" 
          change="+3.1%" 
          trend="up" 
          icon={Activity} 
          color="bg-emerald-100 text-emerald-600" 
        />
        <MetricCard 
          title="Bounce Rate" 
          value="24.8%" 
          change="-2.4%" 
          trend="down" 
          icon={MousePointer} 
          color="bg-purple-100 text-purple-600" 
        />
        <MetricCard 
          title="Real-time" 
          value="1,284" 
          change="+84" 
          trend="up" 
          icon={TrendingUp} 
          color="bg-amber-100 text-amber-600" 
        />
      </div>

      <div className="charts-grid">
        <div className="col-span-2">
          <ActivityChart data={activityData} />
        </div>
        <div className="col-span-1">
          <DonutChart data={deviceData} title="Device Distribution" />
        </div>
        <div className="col-span-1">
          <DonutChart data={sourceData} title="Traffic Channels" />
        </div>
        <div className="col-span-2 card">
          <div className="card-header border-b border-gray-100 px-6 py-4">
             <h3 className="card-title">Top Performing Pages</h3>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-400 text-xs font-bold uppercase border-b border-gray-100">
                <th className="px-6 py-4">Page Path</th>
                <th className="px-6 py-4">Visitors</th>
                <th className="px-6 py-4">Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                { path: '/', val: '12,431', rate: '4.8%' },
                { path: '/pricing', val: '8,245', rate: '2.1%' },
                { path: '/blog/ai-trends', val: '5,120', rate: '1.4%' }
              ].map((row) => (
                <tr key={row.path} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-700">{row.path}</td>
                  <td className="px-6 py-4 text-gray-600">{row.val}</td>
                  <td className="px-6 py-4 font-semibold text-emerald-600">{row.rate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}`,

    // --- MAIN APP ---
    "src/App.jsx": `import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Overview from './pages/Overview';
import './App.css';

export default function App() {
  return (
    <Router>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<Overview />} />
            {['audiences', 'acquisition', 'behavior'].map(p => (
              <Route 
                key={p} 
                path={\`/\${p}\`} 
                element={
                  <div className="flex items-center justify-center min-h-[400px]">
                    <p className="text-gray-400 font-medium">Coming soon: Detailed \${p} analysis</p>
                  </div>
                } 
              />
            ))}
          </Routes>
        </main>
      </div>
    </Router>
  );
}`,

    "src/App.css": `
:root {
  --sidebar-w: 260px;
  --bg: #F8FAFC;
  --text: #0F172A;
  --text-muted: #64748B;
  --border: #E2E8F0;
  --primary: #3B82F6;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); -webkit-font-smoothing: antialiased; }

.app-layout { display: flex; min-height: 100vh; }

/* Sidebar */
.sidebar {
  width: var(--sidebar-w);
  background: white;
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  position: fixed;
  height: 100vh;
}

.sidebar-brand { display: flex; align-items: center; gap: 12px; margin-bottom: 2.5rem; }
.brand-logo { width: 40px; height: 40px; background: #F0F7FF; border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 1px solid #E0EFFF; }
.brand-text { font-size: 1.25rem; font-weight: 800; letter-spacing: -0.5px; }

.nav-section-label { font-size: 0.75rem; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem; }
.sidebar-nav { display: flex; flex-direction: column; gap: 4px; flex: 1; }

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  text-decoration: none;
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.9375rem;
  border-radius: 10px;
  transition: all 0.2s;
  border: none;
  background: transparent;
  cursor: pointer;
  width: 100%;
}

.nav-item:hover { color: var(--text); background: #F1F5F9; }
.nav-item.active { color: var(--primary); background: #EFF6FF; }
.nav-icon { opacity: 0.7; }
.nav-item.active .nav-icon { opacity: 1; }

.sidebar-footer { border-top: 1px solid var(--border); padding-top: 1rem; margin-bottom: 0.5rem; }

/* Main Content */
.main-content { margin-left: var(--sidebar-w); flex: 1; min-height: 100vh; }
.page-container { padding: 2.5rem; max-width: 1200px; margin: 0 auto; }

.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2.5rem; }
.page-title { font-size: 1.875rem; font-weight: 800; letter-spacing: -0.025em; }
.page-subtitle { color: var(--text-muted); font-size: 0.9375rem; }

.header-actions { display: flex; gap: 12px; }
.btn { display: flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 10px; font-weight: 700; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; font-family: inherit; }
.btn-primary { background: var(--primary); color: white; border: none; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.2); }
.btn-primary:hover { background: #2563EB; transform: translateY(-1px); }
.btn-secondary { background: white; color: var(--text); border: 1px solid var(--border); }
.btn-secondary:hover { background: #F8FAFC; border-color: #CBD5E1; }

/* Stats Grid */
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
.card { background: white; border-radius: 16px; border: 1px solid var(--border); overflow: hidden; }

.metric-card { padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
.metric-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
.metric-icon-bg { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.trend-badge { display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 8px; font-size: 0.75rem; font-weight: 700; }
.trend-badge.positive { color: #10B981; background: #ECFDF5; }
.trend-badge.negative { color: #EF4444; background: #FEF2F2; }

.metric-title { color: var(--text-muted); font-size: 0.875rem; font-weight: 600; margin-bottom: 4px; }
.metric-value { font-size: 1.75rem; font-weight: 800; letter-spacing: -0.025em; }

/* Charts */
.charts-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
.col-span-2 { grid-column: span 2; }
.chart-card { padding: 1.5rem; }
.card-header { margin-bottom: 1.5rem; }
.card-title { font-size: 1.125rem; font-weight: 700; }
.card-subtitle { font-size: 0.875rem; color: var(--text-muted); }

@media (max-width: 1024px) {
  .sidebar { display: none; }
  .main-content { margin-left: 0; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .charts-grid { grid-template-columns: 1fr; }
  .col-span-2, .col-span-1 { grid-column: span 1; }
}
`
  }
};

