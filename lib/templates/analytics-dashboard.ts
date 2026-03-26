import { TemplateDefinition } from './index';

export const analyticsDashboardTemplate: TemplateDefinition = {
  id: "analytics-dashboard",
  name: "Analytics Dashboard",
  description: "Enterprise-grade data visualization with Tailwind CSS",
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
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <title>DataFlow Analytics</title>
  </head>
  <body class="bg-slate-50 text-slate-900">
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
        sans: ['Inter', 'system-ui', 'sans-serif'],
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
    font-family: 'Inter', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
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
    <aside className="w-[260px] bg-white border-r border-slate-200 flex-col p-6 fixed h-screen z-10 hidden lg:flex">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center">
          <BarChart3 className="text-blue-600" size={24} strokeWidth={3} />
        </div>
        <span className="text-xl font-extrabold tracking-tight">DataFlow</span>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Main Menu</p>
        {navItems.map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path}
            className={({ isActive }) => \`flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-[15px] transition-all \${isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}\`}
          >
            <item.icon size={20} className="opacity-70" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 pt-4 mb-2">
        <button className="flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-[15px] text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all w-full text-left" onClick={() => alert('Settings coming soon!')}>
          <Settings size={20} className="opacity-70" />
          <span>Settings</span>
        </button>
        <button className="flex items-center gap-3 px-4 py-2.5 rounded-xl font-semibold text-[15px] text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all w-full text-left" onClick={() => alert('Support ticket system would open!')}>
          <HelpCircle size={20} className="opacity-70" />
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
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex justify-between items-center mb-5">
        <div className={\`w-11 h-11 rounded-xl flex items-center justify-center \${color}\`}>
          <Icon size={20} />
        </div>
        <div className={\`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold \${isPositive ? 'text-emerald-600 bg-emerald-50' : 'text-rose-500 bg-rose-50'}\`}>
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {change}
        </div>
      </div>
      <div>
        <h3 className="text-slate-500 text-sm font-semibold mb-1">{title}</h3>
        <p className="text-[28px] font-extrabold tracking-tight">{value}</p>
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
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm h-full">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-900">User Activity</h3>
        <p className="text-sm text-slate-500">Last 7 days performance</p>
      </div>
      <div className="h-[350px]">
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
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm h-full">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      </div>
      <div className="h-[300px]">
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
    <div className="p-10 max-w-[1200px] mx-auto animate-in fade-in duration-500">
      <header className="flex justify-between items-start mb-10">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Executive Summary</h1>
          <p className="text-slate-500 text-[15px] mt-1">Real-time performance metrics</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4.5 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-900 hover:bg-slate-50 transition-all shadow-sm" onClick={() => alert('Date picker would open!')}>
             <Calendar size={16} /> 
             <span>Mar 1 - Mar 30</span>
          </button>
          <button className="flex items-center gap-2 px-4.5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20" onClick={() => alert('Exporting report as PDF...')}>
             <Download size={16} />
             <span>Export</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard 
          title="Total Users" 
          value="45.2k" 
          change="+12.5%" 
          trend="up" 
          icon={Users} 
          color="bg-blue-50 text-blue-600" 
        />
        <MetricCard 
          title="Avg. Session" 
          value="4m 32s" 
          change="+3.1%" 
          trend="up" 
          icon={Activity} 
          color="bg-emerald-50 text-emerald-600" 
        />
        <MetricCard 
          title="Bounce Rate" 
          value="24.8%" 
          change="-2.4%" 
          trend="down" 
          icon={MousePointer} 
          color="bg-purple-50 text-purple-600" 
        />
        <MetricCard 
          title="Real-time" 
          value="1,284" 
          change="+84" 
          trend="up" 
          icon={TrendingUp} 
          color="bg-amber-50 text-amber-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityChart data={activityData} />
        </div>
        <div className="lg:col-span-1">
          <DonutChart data={deviceData} title="Device Distribution" />
        </div>
        <div className="lg:col-span-1">
          <DonutChart data={sourceData} title="Traffic Channels" />
        </div>
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="border-b border-slate-50 px-6 py-4">
             <h3 className="text-lg font-bold text-slate-900">Top Performing Pages</h3>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-50 bg-slate-50/50">
                <th className="px-6 py-4">Page Path</th>
                <th className="px-6 py-4">Visitors</th>
                <th className="px-6 py-4">Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[
                { path: '/', val: '12,431', rate: '4.8%' },
                { path: '/pricing', val: '8,245', rate: '2.1%' },
                { path: '/blog/ai-trends', val: '5,120', rate: '1.4%' }
              ].map((row) => (
                <tr key={row.path} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-700 text-sm">{row.path}</td>
                  <td className="px-6 py-4 text-slate-500 text-sm">{row.val}</td>
                  <td className="px-6 py-4 font-bold text-emerald-600 text-sm">{row.rate}</td>
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

export default function App() {
  return (
    <Router>
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <Sidebar />
        <main className="flex-1 overflow-y-auto lg:ml-[260px] min-h-screen">
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<Overview />} />
            {['audiences', 'acquisition', 'behavior'].map(p => (
              <Route 
                key={p} 
                path={\`/\${p}\`} 
                element={
                  <div className="flex items-center justify-center min-h-[400px]">
                    <p className="text-slate-400 font-medium">Coming soon: Detailed \${p} analysis</p>
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
  }
};
