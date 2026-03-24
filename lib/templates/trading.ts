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
    "src/data/assets.js": `export const portfolioAssets = [
  { symbol: 'BTC', name: 'Bitcoin', price: 67432.50, change: 2.45, amount: 1.234, color: '#F7931A' },
  { symbol: 'ETH', name: 'Ethereum', price: 3521.80, change: -1.23, amount: 8.5, color: '#627EEA' },
  { symbol: 'SOL', name: 'Solana', price: 178.45, change: 5.67, amount: 45.2, color: '#00FFA3' },
  { symbol: 'AAPL', name: 'Apple Inc.', price: 185.92, change: 0.89, amount: 25, color: '#555555' },
  { symbol: 'TSLA', name: 'Tesla', price: 245.30, change: -2.15, amount: 10, color: '#CC0000' },
];

export const watchlist = [
  { symbol: 'NVDA', name: 'NVIDIA', price: 875.28, change: 3.42 },
  { symbol: 'AMZN', name: 'Amazon', price: 178.75, change: 1.56 },
  { symbol: 'GOOGL', name: 'Alphabet', price: 141.80, change: -0.45 },
  { symbol: 'META', name: 'Meta', price: 502.30, change: 2.18 },
];

export const recentTrades = [
  { type: 'buy', symbol: 'BTC', amount: '0.05', price: '67,250.00', time: '2 min ago' },
  { type: 'sell', symbol: 'ETH', amount: '2.0', price: '3,545.00', time: '15 min ago' },
  { type: 'buy', symbol: 'SOL', amount: '10', price: '175.20', time: '1 hr ago' },
];

export const generateHistory = (points = 30) => {
  return Array.from({ length: points }, (_, i) => ({
    time: i,
    value: 50000 + Math.random() * 10000 + (Math.sin(i / 5) * 5000)
  }));
};`,

    // --- COMPONENTS ---
    "src/components/layout/Header.jsx": `import { Activity, Bell, Settings, Search } from 'lucide-react';

export default function Header({ activeTab, setActiveTab }) {
  return (
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
            <button className="icon-btn desktop-only" onClick={() => alert('Search market data...')}>
              <Search className="icon-md" />
            </button>
            <div className="icon-btn notification" onClick={() => alert('Showing recent alerts')}>
              <Bell className="icon-md" />
              <span className="notification-dot" />
            </div>
            <button className="icon-btn" onClick={() => alert('App settings...')}>
              <Settings className="icon-md" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}`,

    "src/components/ui/StatCard.jsx": `import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function StatCard({ title, value, change, icon: Icon }) {
  const isPositive = change >= 0;
  return (
    <div className="stat-card">
      <div className="stat-header">
        <div className="stat-icon">
          <Icon className="icon-md" />
        </div>
        <div className={\`stat-change \${isPositive ? 'positive' : 'negative'}\`}>
          {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {Math.abs(change)}%
        </div>
      </div>
      <p className="stat-title">{title}</p>
      <p className="stat-value">{value}</p>
    </div>
  );
}`,

    "src/components/trading/TradingChart.jsx": `import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { ArrowUpRight } from 'lucide-react';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="tooltip-value">\${\${payload[0].value.toLocaleString()}}</p>
        <p className="tooltip-time">Mar {payload[0].payload.time}, 2024</p>
      </div>
    );
  }
  return null;
};

export default function TradingChart({ data }) {
  return (
    <div className="card chart-card">
      <div className="card-header">
        <div>
          <h2 className="card-title">Portfolio Performance</h2>
          <p className="card-subtitle">Last 30 days active performance</p>
        </div>
        <div className="period-tabs">
          {['1D', '1W', '1M', '3M', '1Y', 'ALL'].map((p) => (
            <button key={p} className={\`period-tab \${p === '1M' ? 'active' : ''}\`}>{p}</button>
          ))}
        </div>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#22D3EE" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748B', fontSize: 12 }}
            />
            <YAxis
              hide
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#22D3EE"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorValue)"
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-summary">
        <div className="summary-item">
          <p className="summary-label">Performance</p>
          <p className="summary-value positive">
            <ArrowUpRight size={16} />
            +8.42%
          </p>
        </div>
        <div className="summary-item">
          <p className="summary-label">High</p>
          <p className="summary-value">$72,431.12</p>
        </div>
        <div className="summary-item">
          <p className="summary-label">Low</p>
          <p className="summary-value">$61,842.50</p>
        </div>
      </div>
    </div>
  );
}`,

    "src/components/trading/Watchlist.jsx": `import { Star, TrendingUp, TrendingDown } from 'lucide-react';

export default function Watchlist({ items }) {
  return (
    <div className="card watchlist-card">
      <h3 className="sidebar-title">Market Watch</h3>
      <div className="watchlist-items">
        {items.map((item) => {
          const isPositive = item.change >= 0;
          return (
            <div key={item.symbol} className="watchlist-item">
              <div className="item-main">
                <button className="star-btn"><Star size={14} /></button>
                <div>
                  <p className="item-symbol">{item.symbol}</p>
                  <p className="item-name">{item.name}</p>
                </div>
              </div>
              <div className="item-stats">
                <p className="item-price">\${\${item.price.toLocaleString()}}</p>
                <div className={\`item-change \${isPositive ? 'positive' : 'negative'}\`}>
                  {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {item.change}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}`,

    "src/components/trading/Holdings.jsx": `import { ArrowRight } from 'lucide-react';

export default function Holdings({ assets, onViewAll }) {
  return (
    <div className="card holdings-card">
      <div className="card-header">
        <h2 className="card-title">Assets</h2>
        <button className="link-btn" onClick={onViewAll}>View All <ArrowRight size={14} /></button>
      </div>
      <div className="holdings-list">
        {assets.map((asset) => {
          const value = asset.price * asset.amount;
          return (
            <div key={asset.symbol} className="holding-row">
              <div className="asset-meta">
                <div className="asset-color-dot" style={{ backgroundColor: asset.color }} />
                <div>
                  <p className="asset-symbol">{asset.symbol}</p>
                  <p className="asset-name">{asset.name}</p>
                </div>
              </div>
              <div className="asset-amount-info">
                <p className="asset-amount">{asset.amount} {asset.symbol}</p>
                <p className="asset-value">\${\${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}}</p>
              </div>
              <div className="asset-action">
                <button className="trade-small-btn" onClick={() => alert('Trade panel triggered!')}>Trade</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}`,

    "src/components/trading/OrderPanel.jsx": `import { useState } from 'react';

export default function OrderPanel() {
  const [type, setType] = useState('buy');
  const [amount, setAmount] = useState('');

  return (
    <div className="card order-card">
      <div className="order-tabs">
        <button
          className={\`order-tab buy \${type === 'buy' ? 'active' : ''}\`}
          onClick={() => setType('buy')}
        >
          Buy
        </button>
        <button
          className={\`order-tab sell \${type === 'sell' ? 'active' : ''}\`}
          onClick={() => setType('sell')}
        >
          Sell
        </button>
      </div>

      <div className="order-form">
        <div className="input-group">
          <label>Asset</label>
          <select className="order-select">
            <option>Bitcoin (BTC)</option>
            <option>Ethereum (ETH)</option>
            <option>Solana (SOL)</option>
          </select>
        </div>

        <div className="input-group">
          <label>Amount (USD)</label>
          <div className="amount-input-wrapper">
            <span>$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="balance-info">
          <span>Available Balance</span>
          <span>$12,842.50</span>
        </div>

        <button 
          className={\`execute-btn \${type}\`}
          onClick={() => alert(type === 'buy' ? 'Purchase executed successfully!' : 'Sale executed successfully!')}
        >
          Execute {type === 'buy' ? 'Purchase' : 'Sale'}
        </button>
      </div>
    </div>
  );
}`,

    // --- MAIN APP ---
    "src/App.jsx": `import { useState, useMemo } from 'react';
import { Wallet, TrendingUp, BarChart3, PieChart } from 'lucide-react';
import { portfolioAssets, watchlist, generateHistory } from './data/assets';
import Header from './components/layout/Header';
import StatCard from './components/ui/StatCard';
import TradingChart from './components/trading/TradingChart';
import Holdings from './components/trading/Holdings';
import Watchlist from './components/trading/Watchlist';
import OrderPanel from './components/trading/OrderPanel';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('portfolio');
  const historyData = useMemo(() => generateHistory(30), []);

  const totalValue = portfolioAssets.reduce((sum, a) => sum + a.price * a.amount, 0);

  return (
    <div className="app">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="main-content">
        <div className="stats-grid">
          <StatCard
            title="Portfolio Value"
            value={\`\$\${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}\`}
            change={3.25}
            icon={Wallet}
          />
          <StatCard
            title="Today's P/L"
            value="+$2,842.12"
            change={2.15}
            icon={TrendingUp}
          />
          <StatCard
            title="Win Rate"
            value="68.5%"
            change={5.2}
            icon={BarChart3}
          />
          <StatCard
            title="Risk Score"
            value="Moderate"
            change={-1.2}
            icon={PieChart}
          />
        </div>

        <div className="dashboard-grid">
          <div className="main-section">
            <TradingChart data={historyData} />
            <Holdings 
              assets={portfolioAssets} 
              onViewAll={() => setActiveTab('markets')}
            />
          </div>

          <div className="sidebar">
            <OrderPanel />
            <Watchlist items={watchlist} />
          </div>
        </div>
      </main>
    </div>
  );
}`,

    "src/App.css": `
:root {
  --bg: #0B0E14;
  --bg-card: #141A23;
  --bg-lighter: #1B232E;
  --border: rgba(255, 255, 255, 0.06);
  --text: #F0F2F5;
  --text-muted: #94A3B8;
  --cyan: #22D3EE;
  --green: #22C55E;
  --red: #EF4444;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); -webkit-font-smoothing: antialiased; }

.app { min-height: 100vh; }

/* Header */
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(11, 14, 20, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
}

.header-container { max-width: 1400px; margin: 0 auto; padding: 0 2rem; }
.header-content { display: flex; align-items: center; justify-content: space-between; height: 72px; }

.header-left { display: flex; align-items: center; gap: 3rem; }
.brand { display: flex; align-items: center; gap: 12px; }
.brand-icon { width: 40px; height: 40px; background: var(--cyan); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: var(--bg); }
.brand-name { font-size: 1.25rem; font-weight: 800; letter-spacing: -0.5px; }

.nav-tabs { display: flex; gap: 8px; }
.nav-tab { padding: 10px 16px; background: transparent; border: none; font-family: inherit; color: var(--text-muted); font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; border-radius: 8px; }
.nav-tab:hover { color: var(--text); background: var(--bg-lighter); }
.nav-tab.active { color: var(--cyan); background: rgba(34, 211, 238, 0.1); }

.header-actions { display: flex; align-items: center; gap: 12px; }
.icon-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: var(--bg-lighter); color: var(--text-muted); border: 1px solid var(--border); border-radius: 12px; cursor: pointer; transition: all 0.2s; }
.icon-btn:hover { color: var(--text); border-color: var(--text-muted); }

/* Main Content */
.main-content { max-width: 1400px; margin: 0 auto; padding: 2rem; }

.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
.stat-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 20px; padding: 1.5rem; }
.stat-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
.stat-icon { width: 44px; height: 44px; background: var(--bg-lighter); color: var(--cyan); display: flex; align-items: center; justify-content: center; border-radius: 12px; }
.stat-change { padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; gap: 4px; }
.stat-change.positive { background: rgba(34, 197, 94, 0.15); color: var(--green); }
.stat-change.negative { background: rgba(239, 68, 68, 0.15); color: var(--red); }
.stat-title { color: var(--text-muted); font-size: 0.85rem; font-weight: 500; margin-bottom: 4px; }
.stat-value { font-size: 1.75rem; font-weight: 700; letter-spacing: -0.5px; }

.dashboard-grid { display: grid; grid-template-columns: 2.2fr 1fr; gap: 2rem; }

.main-section, .sidebar { display: flex; flex-direction: column; gap: 2rem; }

.card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 24px; padding: 2rem; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.card-title { font-size: 1.25rem; font-weight: 700; }
.card-subtitle { font-size: 0.9rem; color: var(--text-muted); }

.period-tabs { display: flex; background: var(--bg-lighter); padding: 4px; border-radius: 12px; }
.period-tab { border: none; padding: 6px 12px; background: transparent; color: var(--text-muted); font-size: 0.75rem; font-weight: 700; cursor: pointer; border-radius: 8px; }
.period-tab.active { background: var(--bg-card); color: var(--cyan); }

/* Chart Tooltip */
.custom-tooltip { background: var(--bg-lighter); border: 1px solid var(--border); border-radius: 12px; padding: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5); }
.tooltip-value { font-weight: 700; color: var(--text); }
.tooltip-time { font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; }

.chart-summary { display: flex; gap: 3rem; margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--border); }
.summary-label { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px; }
.summary-value { font-size: 1.1rem; font-weight: 700; display: flex; align-items: center; gap: 4px; }
.summary-value.positive { color: var(--green); }

/* Holdings */
.holding-row { display: flex; align-items: center; justify-content: space-between; padding: 1.5rem 0; border-bottom: 1px solid var(--border); }
.holding-row:last-child { border-bottom: none; }
.asset-meta { display: flex; align-items: center; gap: 16px; flex: 1; }
.asset-color-dot { width: 12px; height: 12px; border-radius: 50%; }
.asset-symbol { font-weight: 700; font-size: 1rem; }
.asset-name { font-size: 0.8rem; color: var(--text-muted); }
.asset-amount-info { flex: 1; text-align: right; margin-right: 3rem; }
.asset-amount { font-weight: 600; font-size: 1rem; }
.asset-value { font-size: 0.85rem; color: var(--text-muted); }
.trade-small-btn { padding: 8px 16px; background: var(--bg-lighter); border: 1px solid var(--border); color: var(--text); border-radius: 10px; font-weight: 600; font-size: 0.85rem; cursor: pointer; }

/* Order Panel */
.order-tabs { display: flex; background: var(--bg-lighter); border-radius: 16px; padding: 6px; margin-bottom: 2rem; }
.order-tab { flex: 1; border: none; padding: 12px; font-weight: 700; cursor: pointer; border-radius: 12px; background: transparent; color: var(--text-muted); }
.order-tab.buy.active { background: var(--green); color: #000; }
.order-tab.sell.active { background: var(--red); color: #fff; }

.order-form { display: flex; flex-direction: column; gap: 1.5rem; }
.input-group { display: flex; flex-direction: column; gap: 8px; }
.input-group label { font-size: 0.85rem; color: var(--text-muted); font-weight: 600; }
.order-select, .amount-input-wrapper input { background: var(--bg-lighter); border: 1px solid var(--border); border-radius: 12px; padding: 14px; color: var(--text); font-family: inherit; font-size: 1rem; outline: none; }
.amount-input-wrapper { display: flex; align-items: center; background: var(--bg-lighter); border: 1px solid var(--border); border-radius: 12px; padding: 0 14px; }
.amount-input-wrapper span { color: var(--text-muted); font-weight: 700; margin-right: 8px; }
.amount-input-wrapper input { border: none; padding: 14px 0; flex: 1; }

.balance-info { display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-muted); }
.execute-btn { padding: 16px; border: none; border-radius: 16px; font-weight: 700; font-size: 1rem; cursor: pointer; transition: opacity 0.2s; }
.execute-btn.buy { background: var(--green); color: #000; }
.execute-btn.sell { background: var(--red); color: #fff; }

.watchlist-items { display: flex; flex-direction: column; gap: 1rem; }
.watchlist-item { display: flex; align-items: center; justify-content: space-between; padding: 12px; background: var(--bg-lighter); border-radius: 16px; }
.item-main { display: flex; align-items: center; gap: 12px; }
.star-btn { background: transparent; border: none; color: var(--text-muted); cursor: pointer; }
.item-symbol { font-weight: 700; font-size: 0.95rem; }
.item-name { font-size: 0.75rem; color: var(--text-muted); }
.item-stats { text-align: right; }
.item-price { font-weight: 700; font-size: 0.95rem; }
.item-change { font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; gap: 4px; justify-content: flex-end; }
.item-change.positive { color: var(--green); }
.item-change.negative { color: var(--red); }

.sidebar-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 1.5rem; }

@media (max-width: 1200px) {
  .dashboard-grid { grid-template-columns: 1fr; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
  .stats-grid { grid-template-columns: 1fr; }
  .header-left { gap: 1rem; }
  .nav-tabs { display: none; }
}
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
