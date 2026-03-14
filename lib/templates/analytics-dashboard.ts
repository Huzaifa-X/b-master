export const analyticsDashboardTemplate = {
  id: "analytics-dashboard",
  name: "Analytics Dashboard",
  description: "Data visualization with React Router pages",
  category: "analytics",
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
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <title>DataSphere Analytics</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            fontFamily: {
              sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
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
import TopNav from './components/TopNav';
import Overview from './pages/Overview';
import Audiences from './pages/Audiences';
import Acquisition from './pages/Acquisition';
import Behavior from './pages/Behavior';
import './App.css';

function App() {
  return (
    <Router>
      <div className="dashboard-layout">
        <TopNav />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<Overview />} />
            <Route path="/audiences" element={<Audiences />} />
            <Route path="/acquisition" element={<Acquisition />} />
            <Route path="/behavior" element={<Behavior />} />
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App`,

    // --- COMPONENTS ---
    "src/components/TopNav.jsx": `import { NavLink } from 'react-router-dom';
import { BarChart3, Calendar } from 'lucide-react';

export default function TopNav() {
  return (
    <nav className="top-nav">
      <div className="nav-col-left">
        <div className="logo">
          <div className="logo-icon"><BarChart3 size={20} color="white" /></div>
          <h2>DataSphere</h2>
        </div>
      </div>
      
      <div className="nav-col-center">
        <div className="nav-links">
          <NavLink to="/overview" className={({ isActive }) => \`nav-link \${isActive ? 'active' : ''}\`}>
            Overview
          </NavLink>
          <NavLink to="/audiences" className={({ isActive }) => \`nav-link \${isActive ? 'active' : ''}\`}>
            Audiences
          </NavLink>
          <NavLink to="/acquisition" className={({ isActive }) => \`nav-link \${isActive ? 'active' : ''}\`}>
            Acquisition
          </NavLink>
          <NavLink to="/behavior" className={({ isActive }) => \`nav-link \${isActive ? 'active' : ''}\`}>
            Behavior
          </NavLink>
        </div>
      </div>
      
      <div className="nav-col-right">
        <button className="icon-btn"><Calendar size={18} /></button>
        <div className="user-profile">
          <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="Profile" />
        </div>
      </div>
    </nav>
  );
}`,

    // --- PAGES ---
    "src/pages/Overview.jsx": `import { useState } from 'react';
import { 
  Users, Activity, MousePointerClick, TrendingUp, TrendingDown,
  Filter, Download, MoreHorizontal
} from 'lucide-react';

const metrics = [
  { id: 1, title: 'Total Users', value: '45,231', change: '+20.1%', isPositive: true, icon: Users, color: 'blue' },
  { id: 2, title: 'Active Sessions', value: '12,455', change: '+15.4%', isPositive: true, icon: Activity, color: 'emerald' },
  { id: 3, title: 'Bounce Rate', value: '32.1%', change: '-4.3%', isPositive: false, icon: MousePointerClick, color: 'amber' },
  { id: 4, title: 'Conversion', value: '4.83%', change: '+2.4%', isPositive: true, icon: TrendingUp, color: 'purple' }
];

const trafficSources = [
  { source: "Organic Search", visitors: 24500, percentage: 48, color: "var(--blue-500)" },
  { source: "Direct", visitors: 12250, percentage: 24, color: "var(--emerald-500)" },
  { source: "Social Media", visitors: 9180, percentage: 18, color: "var(--purple-500)" },
  { source: "Referral", visitors: 5100, percentage: 10, color: "var(--amber-500)" }
];

export default function Overview() {
  const [timeRange, setTimeRange] = useState('Last 30 Days');

  return (
    <div className="animate-fade-in">
      <header className="page-header">
        <div>
          <h1>Dashboard Overview</h1>
          <p className="text-muted">Track your user analytics and performance metrics.</p>
        </div>
        
        <div className="header-actions">
          <div className="dropdown">
            <span className="dropdown-label">Time Range:</span>
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
              <option>Today</option>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>Last 90 Days</option>
            </select>
          </div>
          
          <button className="btn btn-outline"><Filter size={16} /> Filters</button>
          <button className="btn btn-primary"><Download size={16} /> Export</button>
        </div>
      </header>

      {/* Top Metric Cards */}
      <div className="metrics-grid">
        {metrics.map((metric) => (
          <div key={metric.id} className="metric-card">
            <div className="metric-header">
              <span className="metric-title">{metric.title}</span>
              <div className={\`icon-wrapper \${metric.color}\`}>
                <metric.icon size={20} />
              </div>
            </div>
            <div className="metric-body">
              <h2>{metric.value}</h2>
              <div className={\`metric-trend \${metric.isPositive ? 'positive' : 'negative'}\`}>
                {metric.isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                <span>{metric.change}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="charts-grid">
        {/* Main Traffic Chart */}
        <div className="chart-card large">
          <div className="card-header">
            <h3>Traffic Overview</h3>
            <button className="icon-btn"><MoreHorizontal size={18} /></button>
          </div>
          
          <div className="chart-area line-chart">
            <div className="y-axis">
              <span>50k</span><span>40k</span><span>30k</span><span>20k</span><span>10k</span><span>0</span>
            </div>
            <div className="chart-content">
              <svg viewBox="0 0 500 200" className="svg-line-chart" preserveAspectRatio="none">
                <path d="M 0 150 C 50 120, 80 160, 150 100 C 200 60, 250 130, 300 80 C 350 40, 400 90, 450 30 L 500 60 L 500 200 L 0 200 Z" fill="rgba(59, 130, 246, 0.1)" stroke="none" />
                <path d="M 0 150 C 50 120, 80 160, 150 100 C 200 60, 250 130, 300 80 C 350 40, 400 90, 450 30 L 500 60" fill="none" stroke="var(--blue-500)" strokeWidth="3" />
                <circle cx="150" cy="100" r="4" fill="white" stroke="var(--blue-500)" strokeWidth="2"/>
                <circle cx="300" cy="80" r="4" fill="white" stroke="var(--blue-500)" strokeWidth="2"/>
                <circle cx="450" cy="30" r="4" fill="white" stroke="var(--blue-500)" strokeWidth="2"/>
              </svg>
            </div>
            <div className="x-axis">
              <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
            </div>
          </div>
        </div>

        {/* Traffic Sources */}
        <div className="chart-card">
          <div className="card-header">
            <h3>Traffic Sources</h3>
            <button className="icon-btn"><MoreHorizontal size={18} /></button>
          </div>
          <div className="sources-list">
            {trafficSources.map((source, index) => (
              <div key={index} className="source-item">
                <div className="source-info">
                  <span className="source-name">{source.source}</span>
                  <span className="source-value">{source.visitors.toLocaleString()}</span>
                </div>
                <div className="progress-bg">
                  <div className="progress-fill" style={{ width: \`\${source.percentage}%\`, backgroundColor: source.color }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* User Device */}
        <div className="chart-card">
          <div className="card-header">
            <h3>Device Usage</h3>
            <button className="icon-btn"><MoreHorizontal size={18} /></button>
          </div>
          <div className="donut-chart-container">
             <svg viewBox="0 0 36 36" className="donut">
               <circle className="donut-ring" cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="#E2E8F0" strokeWidth="6"></circle>
               <circle className="donut-segment desktop" cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="var(--blue-500)" strokeWidth="6" strokeDasharray="65 35" strokeDashoffset="25"></circle>
               <circle className="donut-segment mobile" cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="var(--emerald-500)" strokeWidth="6" strokeDasharray="25 75" strokeDashoffset="-40"></circle>
               <circle className="donut-segment tablet" cx="18" cy="18" r="15.91549430918954" fill="transparent" stroke="var(--purple-500)" strokeWidth="6" strokeDasharray="10 90" strokeDashoffset="-65"></circle>
             </svg>
             <div className="donut-legend">
               <div className="legend-item"><span className="dot" style={{background: 'var(--blue-500)'}}></span> Desktop (65%)</div>
               <div className="legend-item"><span className="dot" style={{background: 'var(--emerald-500)'}}></span> Mobile (25%)</div>
               <div className="legend-item"><span className="dot" style={{background: 'var(--purple-500)'}}></span> Tablet (10%)</div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}`,

    "src/pages/Audiences.jsx": `import { Users } from 'lucide-react';

export default function Audiences() {
  return (
    <div className="animate-fade-in dashboard-empty-card">
      <div className="page-header">
        <div>
          <h1>Audience Demographics</h1>
          <p className="text-muted">Analyze your users by age, location, and interests.</p>
        </div>
      </div>
      <div className="empty-state">
        <Users size={48} className="text-muted mb-4 opacity-50" />
        <h3 className="empty-title">Audience Data Pending</h3>
        <p className="text-muted">Once your property collects enough demographic data, insights will appear here.</p>
      </div>
    </div>
  );
}`,

    "src/pages/Acquisition.jsx": `import { MousePointerClick } from 'lucide-react';

export default function Acquisition() {
  return (
    <div className="animate-fade-in dashboard-empty-card">
      <div className="page-header">
        <div>
          <h1>User Acquisition</h1>
          <p className="text-muted">See where your users are coming from and which campaigns perform best.</p>
        </div>
      </div>
      <div className="empty-state">
        <MousePointerClick size={48} className="text-muted mb-4 opacity-50" />
        <h3 className="empty-title">Set up UTM Tracking</h3>
        <p className="text-muted">Create trackable links to see deep insights into your marketing channels.</p>
      </div>
    </div>
  );
}`,

    "src/pages/Behavior.jsx": `import { Activity } from 'lucide-react';

export default function Behavior() {
  return (
    <div className="animate-fade-in dashboard-empty-card">
      <div className="page-header">
        <div>
          <h1>Site Behavior & Flow</h1>
          <p className="text-muted">Understand how users navigate through your application.</p>
        </div>
      </div>
      <div className="empty-state">
        <Activity size={48} className="text-muted mb-4 opacity-50" />
        <h3 className="empty-title">Behavior Flow Analysis</h3>
        <p className="text-muted">Map out user journeys to optimize your funnel and reduce drop-off.</p>
      </div>
    </div>
  );
}`,

    // --- STYLES ---
    "src/App.css": `
:root {
  --blue-500: #3B82F6;
  --blue-600: #2563EB;
  --emerald-500: #10B981;
  --amber-500: #F59E0B;
  --purple-500: #8B5CF6;
  --rose-500: #F43F5E;
  
  --bg-color: #F8FAFC;
  --surface: #FFFFFF;
  --text-main: #0F172A;
  --text-muted: #64748B;
  --border: #E2E8F0;
  
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05);
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: var(--bg-color); color: var(--text-main); -webkit-font-smoothing: antialiased; }

/* Animations */
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.animate-fade-in { animation: fadeIn 0.3s ease forwards; }

.dashboard-empty-card {
  min-height: calc(100vh - 64px - 4rem);
}

/* Layout */
.dashboard-layout { min-height: 100vh; display: flex; flex-direction: column; }

/* Top Nav */
.top-nav {
  height: 64px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  position: sticky;
  top: 0;
  z-index: 50;
}
.logo { display: flex; align-items: center; gap: 0.75rem; }
.logo h2 { font-size: 1.25rem; font-weight: 800; letter-spacing: -0.025em; }
.logo-icon { background: var(--blue-600); border-radius: 8px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }

.nav-links { display: flex; gap: 1.5rem; }
.nav-link {
  text-decoration: none;
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.875rem;
  padding: 0.5rem 0;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}
.nav-link:hover { color: var(--text-main); }
.nav-link.active { color: var(--blue-600); border-bottom-color: var(--blue-600); }

.nav-col-right { display: flex; align-items: center; gap: 1.5rem; }
.user-profile img { width: 36px; height: 36px; border-radius: 50%; border: 2px solid var(--border); }
.icon-btn {
  background: transparent;
  border: 1px solid var(--border);
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-muted); cursor: pointer; transition: all 0.2s;
}
.icon-btn:hover { background: var(--bg-color); color: var(--text-main); }

/* Main Content */
.main-content { padding: 2rem; max-width: 1400px; margin: 0 auto; width: 100%; }

/* Page Header */
.page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2rem; }
.page-header h1 { font-size: 1.875rem; font-weight: 800; letter-spacing: -0.025em; margin-bottom: 0.25rem; }
.text-muted { color: var(--text-muted); font-size: 0.875rem; }

.header-actions { display: flex; align-items: center; gap: 1rem; }
.dropdown { display: flex; align-items: center; gap: 0.5rem; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 0.5rem 1rem; }
.dropdown-label { font-size: 0.875rem; color: var(--text-muted); }
.dropdown select { border: none; background: transparent; font-weight: 600; font-size: 0.875rem; color: var(--text-main); outline: none; cursor: pointer; font-family: inherit; }

.btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1rem; border-radius: 8px; font-weight: 600; font-size: 0.875rem; cursor: pointer; transition: all 0.2s; font-family: inherit; }
.btn-outline { background: var(--surface); border: 1px solid var(--border); color: var(--text-main); }
.btn-outline:hover { background: var(--bg-color); }
.btn-primary { background: var(--blue-600); border: 1px solid var(--blue-600); color: white; }
.btn-primary:hover { background: #1D4ED8; }

/* Metrics Grid */
.metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 1.5rem; }
.metric-card { background: var(--surface); border-radius: 16px; padding: 1.5rem; border: 1px solid var(--border); box-shadow: var(--shadow-sm); transition: transform 0.2s, box-shadow 0.2s; }
.metric-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.metric-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.metric-title { color: var(--text-muted); font-weight: 600; font-size: 0.875rem; }
.icon-wrapper { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.icon-wrapper.blue { background: #EFF6FF; color: var(--blue-500); }
.icon-wrapper.emerald { background: #ECFDF5; color: var(--emerald-500); }
.icon-wrapper.amber { background: #FFFBEB; color: var(--amber-500); }
.icon-wrapper.purple { background: #F5F3FF; color: var(--purple-500); }
.metric-body h2 { font-size: 2rem; font-weight: 800; margin-bottom: 0.5rem; letter-spacing: -0.025em; }
.metric-trend { display: flex; align-items: center; gap: 0.25rem; font-size: 0.875rem; font-weight: 600; }
.metric-trend.positive { color: var(--emerald-500); }
.metric-trend.negative { color: var(--rose-500); }

/* Charts Grid */
.charts-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
.chart-card { background: var(--surface); border-radius: 16px; padding: 1.5rem; border: 1px solid var(--border); box-shadow: var(--shadow-sm); }
.chart-card.large { grid-column: span 3; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.card-header h3 { font-size: 1.125rem; font-weight: 700; letter-spacing: -0.025em; }
.card-header .icon-btn { border: none; }

/* Line Chart Mockup */
.line-chart { display: flex; flex-direction: column; height: 280px; }
.chart-content { flex: 1; position: relative; margin: 0 1rem; }
.svg-line-chart { width: 100%; height: 100%; overflow: visible; }
.y-axis { display: flex; flex-direction: column-reverse; justify-content: space-between; position: absolute; left: -30px; height: 100%; font-size: 0.75rem; color: var(--text-muted); }
.x-axis { display: flex; justify-content: space-between; margin-top: 1rem; margin-left: 20px; padding: 0 10px; font-size: 0.75rem; color: var(--text-muted); font-weight: 500; }

/* Sources List */
.sources-list { display: flex; flex-direction: column; gap: 1.5rem; }
.source-item { display: flex; flex-direction: column; gap: 0.5rem; }
.source-info { display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem; font-weight: 600; }
.source-value { color: var(--text-muted); }
.progress-bg { height: 8px; background: #F1F5F9; border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; border-radius: 4px; }

/* Donut Chart */
.donut-chart-container { display: flex; flex-direction: column; align-items: center; gap: 2rem; padding-top: 1rem; }
.donut { width: 180px; height: 180px; }
.donut-legend { width: 100%; display: flex; flex-direction: column; gap: 0.75rem; }
.legend-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; font-weight: 500; color: var(--text-muted); }
.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }

/* Empty State / Placeholders */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  background: var(--surface);
  border-radius: 16px;
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
}
.empty-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}
.opacity-50 { opacity: 0.5; }

/* Responsive */
@media (max-width: 1024px) {
  .metrics-grid { grid-template-columns: repeat(2, 1fr); }
  .chart-card.large { grid-column: span 1; }
  .charts-grid { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .nav-col-center { display: none; }
  .metrics-grid { grid-template-columns: 1fr; }
  .page-header { flex-direction: column; align-items: flex-start; gap: 1.5rem; }
}
`,

    "src/index.css": `:root {
  font-family: 'Plus Jakarta Sans', system-ui, Avenir, Helvetica, Arial, sans-serif;
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
