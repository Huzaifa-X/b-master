import { TemplateDefinition } from './index';

export const tradingTemplate: TemplateDefinition = {
  id: "trading",
  name: "Trading",
  description: "Professional trading dashboard with real-time charts and portfolio tracking using Tailwind CSS",
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
          "tailwind-merge": "^2.2.1",
          "framer-motion": "^11.0.8"
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
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <title>TradeHub - Trading Dashboard</title>
  </head>
  <body class="bg-[#050608] text-slate-200">
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
      colors: {
        background: '#050608',
        surface: '#0d1117',
        border: 'rgba(255, 255, 255, 0.08)',
        accent: '#22d3ee',
        success: '#10b981',
        danger: '#ef4444',
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
    @apply antialiased bg-background text-slate-200 selection:bg-accent selection:text-black;
    font-family: 'Inter', sans-serif;
  }
}

.trading-container {
  @apply max-w-[1600px] mx-auto;
}

.glass-panel {
  @apply bg-surface border border-border shadow-2xl;
}

.chart-grid-line {
    @apply stroke-white/[0.03];
}

.ticker-mono {
    font-family: 'JetBrains Mono', monospace;
}

@keyframes scanline {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}

.scanline::after {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(to bottom, transparent, rgba(34, 211, 238, 0.05), transparent);
  animation: scanline 8s linear infinite;
  pointer-events: none;
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
    "src/data/assets.js": `export const portfolioAssets = [
  { symbol: 'BTC', name: 'Bitcoin', price: 67432.50, change: 2.45, amount: 1.234, color: '#f7931a' },
  { symbol: 'ETH', name: 'Ethereum', price: 3521.80, change: -1.23, amount: 8.5, color: '#627eea' },
  { symbol: 'SOL', name: 'Solana', price: 178.45, change: 5.67, amount: 45.2, color: '#14f195' },
  { symbol: 'AAPL', name: 'Apple Inc.', price: 185.92, change: 0.89, amount: 25, color: '#a2aaad' },
  { symbol: 'TSLA', name: 'Tesla', price: 245.30, change: -2.15, amount: 10, color: '#e31937' },
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
    "src/components/layout/Header.jsx": `import { Activity, Bell, Settings, Search, User, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Header({ activeTab, setActiveTab }) {
  return (
    <header className="sticky top-0 z-[100] bg-background/80 backdrop-blur-2xl border-b border-border">
      <div className="trading-container px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-12">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-black shadow-lg shadow-accent/20">
                    <Activity size={24} strokeWidth={3} />
                </div>
                <div>
                    <span className="text-xl font-black tracking-tight text-white uppercase italic">TradeHub</span>
                    <div className="flex items-center gap-1 text-[8px] font-bold text-accent">
                        <Globe size={10} /> NETWORK_CONNECTED
                    </div>
                </div>
            </div>

            <nav className="hidden lg:flex items-center gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                {['Portfolio', 'Markets', 'Trade', 'Analytics', 'History'].map((item) => (
                    <button
                        key={item}
                        className={\`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all \${
                            activeTab === item.toLowerCase() 
                                ? 'bg-accent text-black shadow-lg' 
                                : 'text-slate-500 hover:text-white hover:bg-white/5'
                        }\`}
                        onClick={() => setActiveTab(item.toLowerCase())}
                    >
                        {item}
                    </button>
                ))}
            </nav>
        </div>

        <div className="flex items-center gap-4">
            <div className="hidden md:flex relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-accent transition-colors" size={16} />
                <input 
                    type="text" 
                    placeholder="Search Markets (/) "
                    className="h-11 bg-white/5 border border-white/5 rounded-xl pl-11 pr-4 text-xs font-bold text-white outline-none focus:border-accent/40 w-64 transition-all"
                />
            </div>
            
            <button className="relative w-11 h-11 flex items-center justify-center bg-white/5 border border-white/5 rounded-xl text-slate-500 hover:text-white transition-all">
                <Bell size={20} />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-danger rounded-full ring-4 ring-background animate-pulse" />
            </button>
            
            <div className="h-11 w-px bg-white/10 mx-2" />
            
            <button className="flex items-center gap-3 pl-2 pr-4 h-11 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all">
                <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center text-slate-400">
                    <User size={16} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">TRADER_01</span>
            </button>
        </div>
      </div>
    </header>
  );
}`,

    "src/components/ui/StatCard.jsx": `import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StatCard({ title, value, change, icon: Icon }) {
  const isPositive = change >= 0;
  return (
    <motion.div 
        whileHover={{ y: -4 }}
        className="glass-panel rounded-3xl p-6 relative overflow-hidden group transition-all hover:bg-white/[0.04]"
    >
      <div className="flex justify-between items-start relative z-10">
        <div className={\`w-12 h-12 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 \${isPositive ? 'text-success' : 'text-danger'}\`}>
          <Icon size={24} />
        </div>
        <div className={\`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black \${
            isPositive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
        }\`}>
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(change).toFixed(2)}%
        </div>
      </div>
      
      <div className="mt-6 relative z-10">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{title}</p>
        <p className="text-2xl font-black text-white italic ticker-mono tracking-tighter">{value}</p>
      </div>

      <div className="absolute -bottom-6 -right-6 w-32 h-32 opacity-[0.03] text-white pointer-events-none group-hover:opacity-[0.06] transition-opacity">
          <Icon size="100%" />
      </div>
    </motion.div>
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
import { ArrowUpRight, Maximize2, RefreshCw } from 'lucide-react';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface/90 border border-white/10 backdrop-blur-xl rounded-2xl p-4 shadow-2xl">
        <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Valuation</p>
        <p className="text-xl font-black text-accent italic ticker-mono tracking-tighter">\${payload[0].value.toLocaleString()}</p>
        <p className="text-[8px] font-black text-white/20 uppercase mt-2">Cycle Block: #{payload[0].payload.time}</p>
      </div>
    );
  }
  return null;
};

export default function TradingChart({ data }) {
  return (
    <div className="glass-panel rounded-[2.5rem] p-8 lg:p-10 scanline overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center text-accent">
                <AreaChart size={28} />
            </div>
            <div>
                <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Portfolio_Telemetry</h2>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Real-time Market Synced</p>
                </div>
            </div>
        </div>
        
        <div className="flex items-center gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/5">
            {['1D', '1W', '1M', '3M', '1Y'].map((p) => (
                <button 
                  key={p} 
                  className={\`px-4 py-2 rounded-xl text-[10px] font-black transition-all \${
                      p === '1M' ? 'bg-white/10 text-white shadow-xl' : 'text-slate-600 hover:text-slate-300'
                  }\`}
                >
                    {p}
                </button>
            ))}
        </div>
      </div>

      <div className="h-[350px] w-full mt-4 -ml-6">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#475569', fontSize: 10, fontWeight: 800 }}
              dy={15}
            />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(34, 211, 238, 0.4)', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#22d3ee"
              strokeWidth={4}
              fillOpacity={1}
              fill="url(#colorValue)"
              animationDuration={2000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-8 mt-12 pt-10 border-t border-white/5">
        <div>
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Performance</p>
          <div className="flex items-center gap-2 text-success italic">
            <ArrowUpRight size={18} />
            <span className="text-xl font-black italic ticker-mono tracking-tighter">+8.42%</span>
          </div>
        </div>
        <div className="border-l border-white/5 pl-8">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Peak_Valuation</p>
          <p className="text-xl font-black text-white italic ticker-mono tracking-tighter">$72,431.12</p>
        </div>
        <div className="border-l border-white/5 pl-8">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">Cycle_Floor</p>
          <p className="text-xl font-black text-white italic ticker-mono tracking-tighter">$61,842.50</p>
        </div>
      </div>
    </div>
  );
}`,

    "src/components/trading/Watchlist.jsx": `import { Star, TrendingUp, TrendingDown, ArrowUpRight } from 'lucide-react';

export default function Watchlist({ items }) {
  return (
    <div className="glass-panel rounded-[2.5rem] p-8">
      <div className="flex items-center justify-between mb-8">
          <h3 className="text-xs font-black text-white uppercase italic tracking-[0.2em] flex items-center gap-3">
              <Star size={14} className="text-accent" fill="currentColor" /> Market_Watch
          </h3>
          <button className="text-[10px] font-black text-accent uppercase tracking-widest hover:underline">Full_Board</button>
      </div>
      
      <div className="space-y-4">
        {items.map((item) => {
          const isPositive = item.change >= 0;
          return (
            <div key={item.symbol} className="group flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-accent/20 transition-all cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-black/40 border border-white/5 rounded-xl flex items-center justify-center text-xs font-black text-white ticker-mono">
                    {item.symbol[0]}
                </div>
                <div>
                  <p className="text-xs font-black text-white italic tracking-tight">{item.symbol}</p>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">{item.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-white ticker-mono tracking-tighter">{\`$\${item.price.toLocaleString()}\`}</p>
                <div className={\`flex items-center justify-end gap-1 text-[9px] font-black italic mt-1 \${
                    isPositive ? 'text-success' : 'text-danger'
                }\`}>
                  {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {item.change}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <button className="w-full mt-6 py-4 bg-white/5 border border-dashed border-white/10 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] hover:bg-white/10 hover:text-white transition-all">
          + Add_Asset_to_Index
      </button>
    </div>
  );
}`,

    "src/components/trading/Holdings.jsx": `import { ArrowRight, Wallet2, ChevronRight, LayoutGrid } from 'lucide-react';

export default function Holdings({ assets, onViewAll }) {
  return (
    <div className="glass-panel rounded-[2.5rem] p-8 lg:p-10">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white">
                <Wallet2 size={24} />
            </div>
            <div>
                <h2 className="text-lg font-black text-white uppercase italic tracking-tighter">Physical_Assets</h2>
                <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Distributed_Ledger</div>
            </div>
        </div>
        <button 
           onClick={onViewAll}
           className="px-6 py-2.5 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black text-white hover:bg-accent hover:text-black transition-all uppercase tracking-widest shadow-xl flex items-center gap-2"
        >
            Manage_All <LayoutGrid size={12} />
        </button>
      </div>

      <div className="space-y-2">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 text-[9px] font-black text-slate-600 uppercase tracking-widest border-b border-white/5">
            <div className="col-span-4">Asset_Entity</div>
            <div className="col-span-3 text-right">Balance</div>
            <div className="col-span-3 text-right">Market_Valuation</div>
            <div className="col-span-2 text-right">Matrix</div>
        </div>

        {assets.map((asset) => {
          const value = asset.price * asset.amount;
          return (
            <div key={asset.symbol} className="grid grid-cols-12 gap-4 items-center px-6 py-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] hover:border-white/10 transition-all group">
              <div className="col-span-4 flex items-center gap-4">
                <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.1)] group-hover:scale-125 transition-transform" style={{ backgroundColor: asset.color }} />
                <div>
                  <p className="text-xs font-black text-white italic tracking-tight uppercase">{asset.symbol}</p>
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">{asset.name}</p>
                </div>
              </div>
              
              <div className="col-span-3 text-right">
                <p className="text-xs font-black text-white ticker-mono tracking-tighter">{asset.amount} <span className="text-slate-600">{asset.symbol}</span></p>
              </div>

              <div className="col-span-3 text-right">
                <p className="text-xs font-black text-accent italic ticker-mono tracking-tighter">\${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                <p className={\`text-[8px] font-bold mt-0.5 \${asset.change >= 0 ? 'text-success' : 'text-danger'}\`}>
                    {asset.change >= 0 ? '+' : ''}{asset.change}% 24H
                </p>
              </div>

              <div className="col-span-2 flex justify-end">
                <button className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-500 hover:text-accent hover:bg-accent/10 transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100">
                    <ChevronRight size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}`,

    "src/components/trading/OrderPanel.jsx": `import { useState } from 'react';
import { Target, Zap, ArrowRightLeft, ShieldCheck, ChevronDown } from 'lucide-react';

export default function OrderPanel() {
  const [type, setType] = useState('buy');
  const [amount, setAmount] = useState('');

  return (
    <div className="glass-panel rounded-[2.5rem] p-8">
      <div className="flex p-1.5 bg-black/40 rounded-2xl border border-white/5 mb-8">
        <button
          className={\`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all \${
              type === 'buy' ? 'bg-success text-black shadow-lg shadow-success/20' : 'text-slate-600 hover:text-slate-400'
          }\`}
          onClick={() => setType('buy')}
        >
          Execute_Buy
        </button>
        <button
          className={\`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all \${
              type === 'sell' ? 'bg-danger text-white shadow-lg shadow-danger/20' : 'text-slate-600 hover:text-slate-400'
          }\`}
          onClick={() => setType('sell')}
        >
          Execute_Sell
        </button>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Asset_Module</label>
          <div className="relative group">
              <select className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 py-2 text-xs font-black text-white italic tracking-tight appearance-none outline-none focus:border-accent/40 transition-all">
                <option>BTC_BITCOIN</option>
                <option>ETH_ETHEREUM</option>
                <option>SOL_SOLANA</option>
              </select>
              <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-accent transition-colors" size={16} />
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Transmission_Value (USD)</label>
          <div className="relative group">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-accent transition-colors font-black ticker-mono">$</div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 text-xl font-black text-white ticker-mono outline-none focus:border-accent/40 transition-all placeholder:text-white/5"
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-white/[0.02] rounded-2xl border border-white/5">
          <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Reserve_Balance</div>
          <div className="text-xs font-black text-white ticker-mono">$12,842.50</div>
        </div>

        <div className="pt-2">
            <button 
            className={\`group w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 \${
                type === 'buy' 
                    ? 'bg-success text-black shadow-success/20 hover:bg-emerald-400' 
                    : 'bg-danger text-white shadow-danger/20 hover:bg-rose-500'
            }\`}
            onClick={() => alert(type === 'buy' ? 'Order processed via neural bridge.' : 'Position liquidated successfully.')}
            >
            {type === 'buy' ? <Zap size={16} fill="currentColor" /> : <Target size={16} />}
            Process_{type}_Vector
            <ArrowRightLeft size={14} className="opacity-40 group-hover:opacity-100 transition-opacity" />
            </button>
            <div className="mt-6 flex items-center justify-center gap-2 text-[8px] font-black text-slate-700 uppercase tracking-widest">
                <ShieldCheck size={10} className="text-success" /> End-to-End Encryption v4.2 Active
            </div>
        </div>
      </div>
    </div>
  );
}`,

    // --- MAIN APP ---
    "src/App.jsx": `import { useState, useMemo } from 'react';
import { Wallet, TrendingUp, BarChart3, PieChart, Info } from 'lucide-react';
import { portfolioAssets, watchlist, generateHistory } from './data/assets';
import Header from './components/layout/Header';
import StatCard from './components/ui/StatCard';
import TradingChart from './components/trading/TradingChart';
import Holdings from './components/trading/Holdings';
import Watchlist from './components/trading/Watchlist';
import OrderPanel from './components/trading/OrderPanel';
import { motion } from 'framer-motion';

export default function App() {
  const [activeTab, setActiveTab] = useState('portfolio');
  const historyData = useMemo(() => generateHistory(30), []);

  const totalValue = portfolioAssets.reduce((sum, a) => sum + a.price * a.amount, 0);

  return (
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="trading-container px-6 pt-10">
        
        {/* Market Notification Ticker */}
        <div className="mb-10 flex items-center gap-5 px-6 py-3 bg-accent/5 border border-accent/10 rounded-2xl overflow-hidden group">
            <div className="flex items-center gap-2 text-[10px] font-black text-accent uppercase tracking-widest leading-none shrink-0 group-hover:scale-105 transition-transform">
                <Info size={14} /> Flash_Market_Update:
            </div>
            <div className="text-[10px] font-bold text-slate-500 whitespace-nowrap overflow-hidden italic">
                Bitcoin surges 4.2% following protocol upgrade • SEC reviews Ethereum spot-ETFs for next cycle • Solana network reports record throughput capacity...
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard
            title="Portfolio_Total"
            value={\`\$\${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}\`}
            change={3.25}
            icon={Wallet}
          />
          <StatCard
            title="Daily_Vector"
            value="+$2,842.12"
            change={2.15}
            icon={TrendingUp}
          />
          <StatCard
            title="Success_Rate"
            value="68.5%"
            change={5.2}
            icon={BarChart3}
          />
          <StatCard
            title="Risk_Profile"
            value="DEEP_WATER"
            change={-1.2}
            icon={PieChart}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-8">
            <TradingChart data={historyData} />
            <Holdings 
              assets={portfolioAssets} 
              onViewAll={() => setActiveTab('markets')}
            />
          </div>

          <div className="lg:col-span-4 space-y-8">
            <OrderPanel />
            <Watchlist items={watchlist} />
          </div>
        </div>
      </main>

      {/* Background Neural Gradients */}
      <div className="fixed top-1/4 -left-64 w-[600px] h-[600px] bg-accent/5 blur-[150px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-0 -right-64 w-[800px] h-[800px] bg-indigo-500/[0.02] blur-[180px] rounded-full pointer-events-none z-0" />
      
      {/* Footer Meta */}
      <footer className="mt-32 trading-container px-6 border-t border-white/5 pt-12 text-center relative z-10">
          <p className="text-[8px] font-black uppercase tracking-[0.8em] text-slate-700 italic">TRADE_HUB_v8.4 // NEURAL_FINANCE_OS // QUANTUM_SECURED</p>
      </footer>
    </div>
  );
}`,
  }
};
