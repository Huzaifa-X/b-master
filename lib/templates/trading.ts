import { TemplateDefinition } from './index';

export const tradingTemplate: TemplateDefinition = {
  id: "trading",
  name: "Trading",
  description: "Professional trading dashboard with real-time charts and portfolio tracking",
  category: "Finance",
  icon: "TrendingUp",
  files: {
    "package.json": JSON.stringify(
      {
        name: "trading-dashboard",
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
        },
        devDependencies: {
          "@vitejs/plugin-react": "^4.2.1",
          vite: "^5.0.8",
        },
      },
      null,
      2
    ),

    "index.html": `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <title>TradeHub - Trading Dashboard</title>
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

    "src/App.jsx": `import { useState } from 'react'
import {
  TrendingUp, ArrowUpRight, ArrowDownRight,
  PieChart, Activity, BarChart3, Bell, Settings, Search,
  Star, RefreshCw, Wallet, ArrowRight, Clock
} from 'lucide-react'
import './App.css'

// Sample Data
const portfolioAssets = [
  { symbol: 'BTC', name: 'Bitcoin', price: 67432.50, change: 2.45, amount: 1.234, color: '#F7931A' },
  { symbol: 'ETH', name: 'Ethereum', price: 3521.80, change: -1.23, amount: 8.5, color: '#627EEA' },
  { symbol: 'SOL', name: 'Solana', price: 178.45, change: 5.67, amount: 45.2, color: '#00FFA3' },
  { symbol: 'AAPL', name: 'Apple Inc.', price: 185.92, change: 0.89, amount: 25, color: '#555555' },
  { symbol: 'TSLA', name: 'Tesla', price: 245.30, change: -2.15, amount: 10, color: '#CC0000' },
]

const watchlist = [
  { symbol: 'NVDA', name: 'NVIDIA', price: 875.28, change: 3.42 },
  { symbol: 'AMZN', name: 'Amazon', price: 178.75, change: 1.56 },
  { symbol: 'GOOGL', name: 'Alphabet', price: 141.80, change: -0.45 },
  { symbol: 'META', name: 'Meta', price: 502.30, change: 2.18 },
]

const recentTrades = [
  { type: 'buy', symbol: 'BTC', amount: '0.05', price: '67,250.00', time: '2 min ago' },
  { type: 'sell', symbol: 'ETH', amount: '2.0', price: '3,545.00', time: '15 min ago' },
  { type: 'buy', symbol: 'SOL', amount: '10', price: '175.20', time: '1 hr ago' },
]

// Mini Chart Component (Simulated)
function MiniChart({ positive }) {
  const points = positive
    ? "0,30 15,25 30,28 45,20 60,22 75,15 90,18 105,10 120,12"
    : "0,10 15,15 30,12 45,20 60,18 75,25 90,22 105,30 120,28"

  return (
    <svg width="120" height="40" className="mini-chart">
      <polyline
        fill="none"
        stroke={positive ? '#22C55E' : '#EF4444'}
        strokeWidth="2"
        points={points}
      />
    </svg>
  )
}

// Stat Card
function StatCard({ title, value, change, icon: Icon }) {
  const isPositive = change >= 0
  return (
    <div className="stat-card">
      <div className="stat-header">
        <div className="stat-icon">
          <Icon className="icon-md" />
        </div>
        <div className={\`stat-change \${isPositive ? 'positive' : 'negative'}\`}>
          {isPositive ? <ArrowUpRight className="icon-xs" /> : <ArrowDownRight className="icon-xs" />}
          {Math.abs(change)}%
        </div>
      </div>
      <p className="stat-title">{title}</p>
      <p className="stat-value">{value}</p>
    </div>
  )
}

// Asset Row
function AssetRow({ asset }) {
  const isPositive = asset.change >= 0
  const value = asset.price * asset.amount

  return (
    <div className="asset-row">
      <div className="asset-info">
        <div className="asset-icon" style={{ backgroundColor: asset.color + '20', color: asset.color }}>
          {asset.symbol.slice(0, 2)}
        </div>
        <div>
          <p className="asset-symbol">{asset.symbol}</p>
          <p className="asset-name">{asset.name}</p>
        </div>
      </div>
      <div className="asset-chart">
        <MiniChart positive={isPositive} />
      </div>
      <div className="asset-value">
        <p className="asset-amount">\${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <p className={\`asset-change \${isPositive ? 'positive' : 'negative'}\`}>
          {isPositive ? '+' : ''}{asset.change}%
        </p>
      </div>
    </div>
  )
}

// Watchlist Item
function WatchlistItem({ item, starred }) {
  const isPositive = item.change >= 0
  return (
    <div className="watchlist-item">
      <div className="watchlist-left">
        <button className={\`star-btn \${starred ? 'starred' : ''}\`}>
          <Star className="icon-sm" />
        </button>
        <div>
          <p className="watchlist-symbol">{item.symbol}</p>
          <p className="watchlist-name">{item.name}</p>
        </div>
      </div>
      <div className="watchlist-right">
        <p className="watchlist-price">\${item.price.toLocaleString()}</p>
        <p className={\`watchlist-change \${isPositive ? 'positive' : 'negative'}\`}>
          {isPositive ? '+' : ''}{item.change}%
        </p>
      </div>
    </div>
  )
}

// Trade Item
function TradeItem({ trade }) {
  const isBuy = trade.type === 'buy'
  return (
    <div className="trade-item">
      <div className="trade-left">
        <div className={\`trade-icon \${isBuy ? 'buy' : 'sell'}\`}>
          {isBuy ? <ArrowUpRight className="icon-sm" /> : <ArrowDownRight className="icon-sm" />}
        </div>
        <div>
          <p className="trade-action">{isBuy ? 'Buy' : 'Sell'} {trade.symbol}</p>
          <p className="trade-details">{trade.amount} @ \${trade.price}</p>
        </div>
      </div>
      <div className="trade-time">
        <Clock className="icon-xs" />
        {trade.time}
      </div>
    </div>
  )
}

// Main App
export default function App() {
  const [activeTab, setActiveTab] = useState('portfolio')
  const totalValue = portfolioAssets.reduce((sum, a) => sum + a.price * a.amount, 0)

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-container">
          <div className="header-content">
            <div className="header-left">
              <div className="brand">
                <div className="brand-icon">
                  <Activity className="icon-md" />
                </div>
                <span className="brand-name">TradeHub</span>
              </div>
              <nav className="nav-tabs">
                {['Portfolio', 'Markets', 'Trade', 'News'].map((item) => (
                  <button
                    key={item}
                    className={\`nav-tab \${activeTab === item.toLowerCase() ? 'active' : ''}\`}
                    onClick={() => setActiveTab(item.toLowerCase())}
                  >
                    {item}
                  </button>
                ))}
              </nav>
            </div>
            <div className="header-actions">
              <button className="icon-btn desktop-only">
                <Search className="icon-md" />
              </button>
              <button className="icon-btn notification">
                <Bell className="icon-md" />
                <span className="notification-dot" />
              </button>
              <button className="icon-btn">
                <Settings className="icon-md" />
              </button>
              <div className="avatar">JD</div>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        {/* Stats Grid */}
        <div className="stats-grid">
          <StatCard
            title="Portfolio Value"
            value={\`\$\${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}\`}
            change={3.25}
            icon={Wallet}
          />
          <StatCard
            title="Today's P/L"
            value="+$2,847.50"
            change={2.15}
            icon={TrendingUp}
          />
          <StatCard
            title="Total Trades"
            value="1,284"
            change={12}
            icon={BarChart3}
          />
          <StatCard
            title="Win Rate"
            value="68.5%"
            change={5.2}
            icon={PieChart}
          />
        </div>

        <div className="dashboard-grid">
          {/* Main Chart / Holdings */}
          <div className="main-section">
            {/* Chart */}
            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Portfolio Performance</h2>
                  <p className="card-subtitle">Last 30 days</p>
                </div>
                <div className="period-tabs">
                  {['1D', '1W', '1M', '3M', '1Y', 'ALL'].map((period) => (
                    <button
                      key={period}
                      className={\`period-tab \${period === '1M' ? 'active' : ''}\`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
              {/* Chart */}
              <div className="chart-area">
                <svg className="chart-svg" viewBox="0 0 800 250" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,200 Q100,180 200,150 T400,120 T600,100 T800,80 L800,250 L0,250 Z"
                    fill="url(#chartGradient)"
                  />
                  <path
                    d="M0,200 Q100,180 200,150 T400,120 T600,100 T800,80"
                    fill="none"
                    stroke="#22D3EE"
                    strokeWidth="3"
                  />
                </svg>
                <div className="chart-overlay">
                  <p className="chart-value">\${totalValue.toLocaleString()}</p>
                  <p className="chart-change positive">
                    <ArrowUpRight className="icon-sm" />
                    +\$4,521.30 (3.25%)
                  </p>
                </div>
              </div>
            </div>

            {/* Holdings */}
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Your Holdings</h2>
                <button className="link-btn">
                  View All <ArrowRight className="icon-sm" />
                </button>
              </div>
              <div className="assets-list">
                {portfolioAssets.map((asset) => (
                  <AssetRow key={asset.symbol} asset={asset} />
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="sidebar">
            {/* Quick Trade */}
            <div className="card quick-trade">
              <h3 className="sidebar-title">
                <Activity className="icon-md text-cyan" />
                Quick Trade
              </h3>
              <div className="trade-buttons">
                <button className="trade-btn buy">Buy</button>
                <button className="trade-btn sell">Sell</button>
              </div>
              <div className="search-input">
                <input type="text" placeholder="Search asset..." />
                <Search className="icon-md" />
              </div>
            </div>

            {/* Watchlist */}
            <div className="card">
              <div className="card-header">
                <h3 className="sidebar-title">Watchlist</h3>
                <button className="icon-btn-sm">
                  <RefreshCw className="icon-sm" />
                </button>
              </div>
              <div className="watchlist">
                {watchlist.map((item, index) => (
                  <WatchlistItem key={item.symbol} item={item} starred={index === 0} />
                ))}
              </div>
            </div>

            {/* Recent Trades */}
            <div className="card">
              <h3 className="sidebar-title">Recent Trades</h3>
              <div className="trades-list">
                {recentTrades.map((trade, index) => (
                  <TradeItem key={index} trade={trade} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}`,

    "src/App.css": `
:root {
  --bg: #0F172A;
  --bg-light: #1E293B;
  --bg-card: rgba(30, 41, 59, 0.5);
  --border: rgba(51, 65, 85, 0.5);
  --text: #FFFFFF;
  --text-muted: #94A3B8;
  --text-dim: #64748B;

  --cyan: #22D3EE;
  --cyan-dark: #06B6D4;
  --green: #22C55E;
  --green-bg: rgba(34, 197, 94, 0.2);
  --red: #EF4444;
  --red-bg: rgba(239, 68, 68, 0.2);
  --amber: #F59E0B;
  --purple: #A855F7;
  --pink: #EC4899;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
}

/* Icons */
.icon-xs { width: 12px; height: 12px; }
.icon-sm { width: 16px; height: 16px; }
.icon-md { width: 20px; height: 20px; }

.text-cyan { color: var(--cyan); }

.app {
  min-height: 100vh;
  background: var(--bg);
}

/* Header */
.header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
}

.header-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 1rem;
}

@media (min-width: 640px) {
  .header-container { padding: 0 1.5rem; }
}

@media (min-width: 1024px) {
  .header-container { padding: 0 2rem; }
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-icon {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--cyan) 0%, #3B82F6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.brand-name {
  font-size: 1.25rem;
  font-weight: 700;
}

.nav-tabs {
  display: none;
  align-items: center;
  gap: 4px;
  margin-left: 2rem;
}

@media (min-width: 768px) {
  .nav-tabs { display: flex; }
}

.nav-tab {
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.nav-tab:hover {
  color: var(--text);
  background: rgba(30, 41, 59, 0.5);
}

.nav-tab.active {
  color: var(--cyan);
  background: var(--bg-light);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-btn {
  padding: 8px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover {
  color: var(--text);
  background: var(--bg-light);
}

.icon-btn-sm {
  padding: 6px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn-sm:hover {
  color: var(--text);
  background: rgba(51, 65, 85, 0.5);
}

.desktop-only {
  display: none;
}

@media (min-width: 640px) {
  .desktop-only { display: flex; }
}

.notification {
  position: relative;
}

.notification-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 8px;
  height: 8px;
  background: var(--cyan);
  border-radius: 50%;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--purple) 0%, var(--pink) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 700;
}

/* Main Content */
.main-content {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

@media (min-width: 640px) {
  .main-content { padding: 2rem 1.5rem; }
}

@media (min-width: 1024px) {
  .main-content { padding: 2rem; }
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  margin-bottom: 2rem;
}

@media (min-width: 640px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1024px) {
  .stats-grid { grid-template-columns: repeat(4, 1fr); }
}

.stat-card {
  background: var(--bg-card);
  backdrop-filter: blur(8px);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.25rem;
}

.stat-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.stat-icon {
  padding: 8px;
  background: rgba(51, 65, 85, 0.5);
  border-radius: 12px;
  color: var(--cyan);
}

.stat-change {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 500;
}

.stat-change.positive {
  background: var(--green-bg);
  color: var(--green);
}

.stat-change.negative {
  background: var(--red-bg);
  color: var(--red);
}

.stat-title {
  color: var(--text-muted);
  font-size: 0.875rem;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
}

/* Dashboard Grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 1024px) {
  .dashboard-grid { grid-template-columns: 2fr 1fr; }
}

.main-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Cards */
.card {
  background: var(--bg-card);
  backdrop-filter: blur(8px);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.5rem;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.card-title {
  font-size: 1.125rem;
  font-weight: 600;
}

.card-subtitle {
  font-size: 0.875rem;
  color: var(--text-muted);
}

.sidebar-title {
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.link-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  color: var(--cyan);
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
}

.link-btn:hover {
  text-decoration: underline;
}

/* Period Tabs */
.period-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.period-tab {
  padding: 6px 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.period-tab:hover {
  color: var(--text);
  background: rgba(51, 65, 85, 0.5);
}

.period-tab.active {
  background: rgba(34, 211, 238, 0.2);
  color: var(--cyan);
}

/* Chart */
.chart-area {
  position: relative;
  height: 256px;
  background: rgba(15, 23, 42, 0.5);
  border-radius: 12px;
  overflow: hidden;
}

.chart-svg {
  width: 100%;
  height: 100%;
}

.chart-overlay {
  position: absolute;
  top: 1rem;
  left: 1rem;
}

.chart-value {
  font-size: 1.875rem;
  font-weight: 700;
}

.chart-change {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.875rem;
  font-weight: 500;
}

.chart-change.positive {
  color: var(--green);
}

/* Assets List */
.assets-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.asset-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: rgba(30, 41, 59, 0.3);
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.asset-row:hover {
  background: rgba(30, 41, 59, 0.5);
}

.asset-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.asset-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 700;
}

.asset-symbol {
  font-weight: 600;
}

.asset-name {
  font-size: 0.875rem;
  color: var(--text-muted);
}

.asset-chart {
  display: none;
}

@media (min-width: 640px) {
  .asset-chart { display: block; }
}

.mini-chart {
  opacity: 0.6;
}

.asset-value {
  text-align: right;
}

.asset-amount {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
}

.asset-change {
  font-size: 0.875rem;
  font-weight: 500;
}

.asset-change.positive { color: var(--green); }
.asset-change.negative { color: var(--red); }

/* Quick Trade */
.quick-trade {
  background: linear-gradient(135deg, rgba(34, 211, 238, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%);
  border-color: rgba(34, 211, 238, 0.3);
}

.quick-trade .sidebar-title {
  margin-bottom: 1rem;
}

.trade-buttons {
  display: flex;
  gap: 8px;
  margin-bottom: 1rem;
}

.trade-btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 12px;
  font-family: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.trade-btn.buy {
  background: var(--green);
  color: white;
}

.trade-btn.buy:hover {
  background: #16A34A;
}

.trade-btn.sell {
  background: var(--bg-light);
  color: white;
}

.trade-btn.sell:hover {
  background: #334155;
}

.search-input {
  position: relative;
}

.search-input input {
  width: 100%;
  padding: 12px 16px;
  padding-right: 40px;
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid var(--border);
  border-radius: 12px;
  font-family: inherit;
  font-size: 0.875rem;
  color: var(--text);
  outline: none;
  transition: border-color 0.2s;
}

.search-input input::placeholder {
  color: var(--text-dim);
}

.search-input input:focus {
  border-color: var(--cyan);
}

.search-input svg {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-dim);
}

/* Watchlist */
.watchlist {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.watchlist-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.watchlist-item:hover {
  background: rgba(30, 41, 59, 0.3);
}

.watchlist-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.star-btn {
  padding: 0;
  background: transparent;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  transition: color 0.2s;
}

.star-btn:hover {
  color: var(--amber);
}

.star-btn.starred {
  color: var(--amber);
}

.star-btn.starred svg {
  fill: var(--amber);
}

.watchlist-symbol {
  font-size: 0.875rem;
  font-weight: 600;
}

.watchlist-name {
  font-size: 0.75rem;
  color: var(--text-dim);
}

.watchlist-right {
  text-align: right;
}

.watchlist-price {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
}

.watchlist-change {
  font-size: 0.75rem;
  font-weight: 500;
}

.watchlist-change.positive { color: var(--green); }
.watchlist-change.negative { color: var(--red); }

/* Trades List */
.trades-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 1rem;
}

.trade-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-bottom: 1px solid var(--border);
}

.trade-item:last-child {
  border-bottom: none;
}

.trade-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.trade-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.trade-icon.buy {
  background: var(--green-bg);
  color: var(--green);
}

.trade-icon.sell {
  background: var(--red-bg);
  color: var(--red);
}

.trade-action {
  font-size: 0.875rem;
  font-weight: 500;
}

.trade-details {
  font-size: 0.75rem;
  color: var(--text-dim);
}

.trade-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--text-dim);
}

/* Positive/Negative */
.positive { color: var(--green); }
.negative { color: var(--red); }
`,

    "src/index.css": `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #0f172a;
}

#root {
  min-height: 100vh;
}`
  }
};
