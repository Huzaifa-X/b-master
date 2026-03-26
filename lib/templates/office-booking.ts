import { TemplateDefinition } from './index';

export const officeBookingTemplate: TemplateDefinition = {
  id: "office-booking",
  name: "Office Space Booking",
  description: "Reserve desks, rooms, and office resources using Tailwind CSS",
  category: "booking",
  files: {
    "package.json": JSON.stringify(
      {
        name: "office-booking",
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
    <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <title>Office Space Booking</title>
  </head>
  <body class="bg-[#F8FAFC] text-[#0F172A]">
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
        sans: ['"Sora"', 'system-ui', 'sans-serif'],
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
    @apply antialiased text-[#0F172A] bg-[#F8FAFC];
    font-family: 'Sora', sans-serif;
  }
}`,

    "src/main.jsx": `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)`,

    // --- DATA ---
    "src/data/resources.js": `export const FLOOR = [
  { id: 'd1', type: 'desk', label: 'Desk A-1', floor: 1, capacity: 1, amenities: ['Monitor', 'Wifi'], status: 'available' },
  { id: 'd2', type: 'desk', label: 'Desk A-2', floor: 1, capacity: 1, amenities: ['Monitor', 'Wifi'], status: 'available' },
  { id: 'd3', type: 'desk', label: 'Desk A-3', floor: 1, capacity: 1, amenities: ['Monitor'], status: 'occupied' },
  { id: 'd4', type: 'desk', label: 'Desk B-1', floor: 1, capacity: 1, amenities: ['Monitor', 'Wifi'], status: 'available' },
  { id: 'd5', type: 'desk', label: 'Desk B-2', floor: 1, capacity: 1, amenities: ['Wifi'], status: 'available' },
  { id: 'd6', type: 'desk', label: 'Desk B-3', floor: 1, capacity: 1, amenities: ['Monitor', 'Wifi'], status: 'available' },
  { id: 'r1', type: 'room', label: 'Boardroom', floor: 1, capacity: 12, amenities: ['Monitor', 'Wifi', 'Coffee'], status: 'available' },
  { id: 'r2', type: 'room', label: 'Meeting Rm A', floor: 1, capacity: 6, amenities: ['Monitor', 'Wifi'], status: 'occupied' },
  { id: 'r3', type: 'room', label: 'Meeting Rm B', floor: 1, capacity: 4, amenities: ['Wifi'], status: 'available' },
  { id: 'r4', type: 'room', label: 'Focus Pod', floor: 1, capacity: 2, amenities: ['Wifi'], status: 'available' },
  { id: 'ph1', type: 'phone', label: 'Phone Booth 1', floor: 1, capacity: 1, amenities: ['Wifi'], status: 'available' },
  { id: 'ph2', type: 'phone', label: 'Phone Booth 2', floor: 1, capacity: 1, amenities: ['Wifi'], status: 'available' },
];

export const DATES = ['Today, Mar 21', 'Tomorrow, Mar 22', 'Wed, Mar 23', 'Thu, Mar 24', 'Fri, Mar 25'];
export const TIMES = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'];

export const FILTER_OPTIONS = [
  { value: 'all', label: 'All Spaces' },
  { value: 'desk', label: 'Desks' },
  { value: 'room', label: 'Meeting Rooms' },
  { value: 'phone', label: 'Phone Booths' },
];`,

    // --- LAYOUT COMPONENTS ---
    "src/components/layout/PageHeader.jsx": `export default function PageHeader() {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">Space Planner</h1>
      <p className="text-slate-500 font-medium text-sm">Reserve desks, meeting rooms, and high-performance hubs.</p>
    </div>
  );
}`,

    // --- UI COMPONENTS ---
    "src/components/ui/FilterBar.jsx": `import { FILTER_OPTIONS } from '../../data/resources';

export default function FilterBar({ activeFilter, onFilterChange }) {
  return (
    <div className="flex flex-wrap gap-2 mb-8">
      {FILTER_OPTIONS.map(f => (
        <button
          key={f.value}
          className={\`px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-widest transition-all \${
            activeFilter === f.value 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
              : 'bg-white text-slate-500 hover:text-slate-900 border border-slate-100'
          }\`}
          onClick={() => onFilterChange(f.value)}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}`,

    // --- SPACE COMPONENTS ---
    "src/components/space/AmenityIcon.jsx": `import { Monitor, Wifi, Coffee } from 'lucide-react';

const ICON_MAP = { Monitor, Wifi, Coffee };

export default function AmenityIcon({ name }) {
  const Icon = ICON_MAP[name];
  if (!Icon) return null;

  return (
    <span className="w-5 h-5 flex items-center justify-center bg-slate-100 rounded-md text-slate-600 border border-slate-200/50">
      <Icon size={10} strokeWidth={3} />
    </span>
  );
}`,

    "src/components/space/SpaceCard.jsx": `import { Users, Lock } from 'lucide-react';
import AmenityIcon from './AmenityIcon';

export default function SpaceCard({ space, isSelected, onSelect }) {
  const isAvailable = space.status === 'available';

  return (
    <button
      className={\`flex flex-col gap-3 p-5 rounded-[1.5rem] border-2 text-left relative transition-all duration-300 group \${
        isAvailable 
          ? isSelected 
            ? 'bg-indigo-50 border-indigo-500 shadow-xl' 
            : 'bg-white border-white hover:border-indigo-200 hover:shadow-lg shadow-sm'
          : 'bg-slate-50 border-slate-50 opacity-50 cursor-not-allowed'
      }\`}
      onClick={() => isAvailable && onSelect(space)}
      disabled={!isAvailable}
    >
      <div className="flex justify-between items-start mb-1">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-indigo-400 transition-colors">
          {space.type}
        </span>
        <div className={\`w-2 h-2 rounded-full \${isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}\`} />
      </div>
      
      <div className="flex-1">
        <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{space.label}</h4>
        <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-slate-500">
            <Users size={12} className="text-slate-400" /> {space.capacity} pax
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mt-auto">
        {space.amenities.map(a => (
          <AmenityIcon key={a} name={a} />
        ))}
      </div>

      {!isAvailable && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px] rounded-[1.5rem]">
            <Lock size={16} className="text-slate-400" />
        </div>
      )}
    </button>
  );
}`,

    "src/components/space/FloorGrid.jsx": `import SpaceCard from './SpaceCard';

export default function FloorGrid({ spaces, selectedSpace, onSelectSpace }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {spaces.map(space => (
        <SpaceCard
          key={space.id}
          space={space}
          isSelected={selectedSpace?.id === space.id}
          onSelect={onSelectSpace}
        />
      ))}
    </div>
  );
}`,

    "src/components/space/BookingPanel.jsx": `import { X, Calendar, Clock, User, CheckCircle2 } from 'lucide-react';
import { DATES, TIMES } from '../../data/resources';

export default function BookingPanel({
  space,
  date,
  startTime,
  endTime,
  name,
  onDateChange,
  onStartTimeChange,
  onEndTimeChange,
  onNameChange,
  onSubmit,
  onClose
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl w-full max-w-lg relative animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-xl font-black text-slate-900 leading-none mb-1 flex items-center gap-2">
                Configure Reservation
            </h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Resource: {space.label}</p>
          </div>
          <button className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-full text-slate-400 hover:text-rose-500 transition-colors" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">
                <Calendar size={12} className="text-indigo-500" /> Date
              </label>
              <select value={date} onChange={(e) => onDateChange(e.target.value)} className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all appearance-none">
                {DATES.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">
                <User size={12} className="text-indigo-500" /> Booker
              </label>
              <input
                required
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Full Name"
                className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 text-left">
              <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">
                <Clock size={12} className="text-indigo-500" /> From
              </label>
              <select value={startTime} onChange={(e) => onStartTimeChange(e.target.value)} className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all appearance-none">
                {TIMES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-2 text-left">
              <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">
                <Clock size={12} className="text-indigo-500" /> Until
              </label>
              <select value={endTime} onChange={(e) => onEndTimeChange(e.target.value)} className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all appearance-none">
                {TIMES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 hover:-translate-y-0.5 active:scale-95 transition-all">
            <CheckCircle2 size={18} /> Confirm Access
          </button>
        </form>
      </div>
    </div>
  );
}`,

    // --- BOOKING COMPONENTS ---
    "src/components/booking/BookingCard.jsx": `import { X, User, Calendar, Clock, MapPin } from 'lucide-react';

export default function BookingCard({ booking, onCancel }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group animate-in slide-in-from-right-10">
      <div className="flex justify-between items-start mb-4">
        <div>
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest leading-none mb-1">{booking.resource.type}</p>
            <h4 className="font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors leading-none">{booking.resource.label}</h4>
        </div>
        <button className="p-1.5 bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" onClick={() => onCancel(booking.id)}>
          <X size={14} strokeWidth={2.5} />
        </button>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
            <User size={12} className="text-slate-300" /> {booking.name}
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
            <Calendar size={12} className="text-slate-300" /> {booking.date}
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
            <Clock size={12} className="text-slate-300" /> {booking.startTime} – {booking.endTime}
        </div>
      </div>
    </div>
  );
}`,

    "src/components/booking/BookingsSidebar.jsx": `import { Briefcase } from 'lucide-react';
import BookingCard from './BookingCard';

export default function BookingsSidebar({ bookings, onCancelBooking }) {
  return (
    <div className="lg:w-[320px] h-fit">
      <div className="flex items-center justify-between mb-6 px-1">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2 leading-none">
            <Briefcase size={14} className="text-indigo-600" /> My Access
        </h3>
        <span className="bg-indigo-100 text-indigo-600 px-2.5 py-1 rounded-full text-[10px] font-black leading-none">{bookings.length}</span>
      </div>
      
      <div className="space-y-4">
        {bookings.length === 0 ? (
          <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-[2rem] bg-white/50">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">No active <br />reservations</p>
          </div>
        ) : (
          bookings.map(b => (
            <BookingCard
              key={b.id}
              booking={b}
              onCancel={onCancelBooking}
            />
          ))
        )}
      </div>
    </div>
  );
}`,

    // --- MAIN APP ---
    "src/App.jsx": `import { useState } from 'react';
import { FLOOR, DATES, TIMES } from './data/resources';
import PageHeader from './components/layout/PageHeader';
import FilterBar from './components/ui/FilterBar';
import FloorGrid from './components/space/FloorGrid';
import BookingPanel from './components/space/BookingPanel';
import BookingsSidebar from './components/booking/BookingsSidebar';

function App() {
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [date, setDate] = useState(DATES[0]);
  const [startTime, setStartTime] = useState(TIMES[2]);
  const [endTime, setEndTime] = useState(TIMES[4]);
  const [name, setName] = useState('');
  const [booked, setBooked] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [resources, setResources] = useState(FLOOR);

  const filtered = filter === 'all' ? resources : resources.filter(r => r.type === filter);

  const handleSelectSpace = (space) => {
    setSelected(space);
    setShowForm(true);
  };

  const handleBook = () => {
    if (!selected || !name) return;

    const booking = {
      id: Date.now(),
      resource: selected,
      date,
      startTime,
      endTime,
      name
    };

    setBooked(prev => [booking, ...prev]);
    setResources(prev => prev.map(r =>
      r.id === selected.id ? { ...r, status: 'occupied' } : r
    ));
    setShowForm(false);
    setSelected(null);
    setName('');
  };

  const cancelBooking = (id) => {
    const b = booked.find(b => b.id === id);
    if (b) {
      setResources(prev => prev.map(r =>
        r.id === b.resource.id ? { ...r, status: 'available' } : r
      ));
      setBooked(prev => prev.filter(x => x.id !== id));
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setSelected(null);
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <PageHeader />

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="flex-1 w-full order-2 lg:order-1">
          <FilterBar activeFilter={filter} onFilterChange={setFilter} />
          <FloorGrid
            spaces={filtered}
            selectedSpace={selected}
            onSelectSpace={handleSelectSpace}
          />

          {showForm && selected && (
            <BookingPanel
              space={selected}
              date={date}
              startTime={startTime}
              endTime={endTime}
              name={name}
              onDateChange={setDate}
              onStartTimeChange={setStartTime}
              onEndTimeChange={setEndTime}
              onNameChange={setName}
              onSubmit={handleBook}
              onClose={handleCloseForm}
            />
          )}
        </div>

        <aside className="w-full lg:w-auto order-1 lg:order-2">
            <BookingsSidebar bookings={booked} onCancelBooking={cancelBooking} />
        </aside>
      </div>
      
      <footer className="mt-20 pt-8 border-t border-slate-200 text-center">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Corporate Resource Hub — Grid Alpha</p>
      </footer>
    </div>
  );
}

export default App;`,
  }
};
