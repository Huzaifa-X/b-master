import { TemplateDefinition } from './index';

export const reservationSystemTemplate: TemplateDefinition = {
  id: "reservation-system",
  name: "Reservation System",
  description: "General-purpose reservations for any service or venue using Tailwind CSS",
  category: "booking",
  files: {
    "package.json": JSON.stringify(
      {
        name: "reservation-system",
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
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <title>Reservation System</title>
  </head>
  <body class="bg-stone-50 text-stone-900">
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
        sans: ['"Outfit"', 'system-ui', 'sans-serif'],
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
    @apply antialiased text-stone-900 bg-[#FAF9F6];
    font-family: 'Outfit', sans-serif;
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
    "src/data/services.js": `export const SERVICES = [
  { id: 's1', name: 'Table for 2', icon: '🍽️', capacity: 2, desc: 'Intimate dining for two', price: 0 },
  { id: 's2', name: 'Table for 4', icon: '🥂', capacity: 4, desc: 'Perfect for a family dinner', price: 0 },
  { id: 's3', name: 'Private Dining Room', icon: '✨', capacity: 12, desc: 'Exclusive private room for events', price: 150 },
  { id: 's4', name: 'Bar Seating', icon: '🍺', capacity: 1, desc: 'Cozy bar counter seats', price: 0 },
];

export const generateDates = () => {
  const dates = [];
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    dates.push(d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
  }
  return dates;
};

export const TIMES = [
  '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM',
  '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM'
];

export const SPECIALS = ['None', 'Birthday', 'Anniversary', 'Business Dinner', 'Date Night', 'Baby Shower'];

export const generateConfirmId = () => 'RES-' + Math.floor(Math.random() * 900000 + 100000);`,

    // --- LAYOUT COMPONENTS ---
    "src/components/layout/Hero.jsx": `import { UtensilsCrossed, Sparkles } from 'lucide-react';

export default function Hero() {
  return (
    <div className="relative overflow-hidden bg-stone-900 text-white rounded-[2.5rem] p-10 md:p-14 mb-10 shadow-2xl shadow-stone-900/20 group">
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 blur-[100px] rounded-full transition-transform group-hover:scale-125 duration-1000" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-stone-500/10 blur-[100px] rounded-full" />
      
      <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
        <div className="w-20 h-20 bg-amber-500 rounded-[2rem] flex items-center justify-center text-stone-900 rotate-6 group-hover:rotate-12 transition-transform shadow-xl shadow-amber-500/20">
          <UtensilsCrossed size={36} strokeWidth={2.5} />
        </div>
        <div className="text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 mb-4">
            <Sparkles size={12} />
            Fine Dining Registry
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none mb-3 italic">Bella Vista</h1>
          <p className="text-stone-400 font-medium text-lg leading-tight">Secure your presence at the valley's premier <br className="hidden md:block" />gastronomic destination.</p>
        </div>
      </div>
    </div>
  );
}`,

    // --- UI COMPONENTS ---
    "src/components/ui/BackLink.jsx": `import { ArrowLeft } from 'lucide-react';

export default function BackLink({ onClick }) {
  return (
    <button className="flex items-center gap-2 text-xs font-black text-stone-400 uppercase tracking-widest hover:text-amber-500 transition-colors mb-8" onClick={onClick}>
      <ArrowLeft size={16} /> Return to Options
    </button>
  );
}`,

    "src/components/ui/GuestSelector.jsx": `import { UserPlus, UserMinus } from 'lucide-react';

export default function GuestSelector({ guests, maxCapacity, onChange }) {
  return (
    <div className="bg-stone-100/50 p-6 rounded-3xl border border-stone-200/50 flex flex-col sm:flex-row items-center justify-between gap-6">
      <div className="flex items-center gap-3">
          <span className="text-sm font-black text-stone-500 uppercase tracking-widest">Party Size</span>
          <span className="text-[10px] bg-stone-200 px-2 py-0.5 rounded-full font-bold text-stone-600">Max {maxCapacity}</span>
      </div>
      
      <div className="flex items-center bg-white border border-stone-200 rounded-2xl p-1.5 shadow-sm">
        <button 
            className="w-12 h-12 flex items-center justify-center text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-xl transition-all" 
            onClick={() => onChange(Math.max(1, guests - 1))}
        >
            <UserMinus size={20} />
        </button>
        <span className="w-16 text-center text-3xl font-black text-stone-900 tracking-tighter">{guests}</span>
        <button 
            className="w-12 h-12 flex items-center justify-center text-stone-400 hover:text-stone-900 hover:bg-stone-50 rounded-xl transition-all" 
            onClick={() => onChange(Math.min(maxCapacity, guests + 1))}
        >
            <UserPlus size={20} />
        </button>
      </div>
    </div>
  );
}`,

    // --- RESERVATION COMPONENTS ---
    "src/components/reservation/ServiceCard.jsx": `import { CheckCircle2, Crown } from 'lucide-react';

export default function ServiceCard({ service, isSelected, onSelect }) {
  return (
    <button
      className={\`flex flex-col p-6 border-2 rounded-[2.5rem] text-left transition-all duration-300 relative group min-h-[160px] \${
        isSelected 
            ? 'bg-stone-900 border-stone-900 text-white shadow-2xl shadow-stone-900/30' 
            : 'bg-white border-stone-100 hover:border-amber-500/30 hover:shadow-xl shadow-sm'
      }\`}
      onClick={onSelect}
    >
      <div className={\`text-4xl mb-4 p-3 rounded-2xl w-fit transition-all duration-300 \${
        isSelected ? 'bg-white/10 scale-110' : 'bg-stone-50 group-hover:bg-amber-50'
      }\`}>
        {service.icon}
      </div>
      
      <div className="flex-1">
        <h4 className={\`text-lg font-black tracking-tight leading-none mb-2 \${isSelected ? 'text-white' : 'text-stone-900 group-hover:text-amber-600 transition-colors'}\`}>
            {service.name}
        </h4>
        <p className={\`text-xs font-semibold leading-relaxed \${isSelected ? 'text-stone-400' : 'text-stone-500 text-pretty'}\`}>
            {service.desc}
        </p>
      </div>

      {service.price > 0 && (
        <div className={\`mt-4 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest \${isSelected ? 'text-amber-400' : 'text-amber-600'}\`}>
          <Crown size={12} /> \${service.price} Premium
        </div>
      )}

      {isSelected && (
          <CheckCircle2 size={24} className="absolute top-6 right-6 text-amber-500 animate-in zoom-in duration-300" />
      )}
    </button>
  );
}`,

    "src/components/reservation/ServiceGrid.jsx": `import { SERVICES } from '../../data/services';
import ServiceCard from './ServiceCard';

export default function ServiceGrid({ selectedServiceId, onSelectService }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      {SERVICES.map(s => (
        <ServiceCard
          key={s.id}
          service={s}
          isSelected={selectedServiceId === s.id}
          onSelect={() => onSelectService(s)}
        />
      ))}
    </div>
  );
}`,

    "src/components/reservation/DateTimePicker.jsx": `import { CalendarDays, Clock, ChevronDown } from 'lucide-react';
import { TIMES, generateDates } from '../../data/services';

const DATES = generateDates();

export default function DateTimePicker({
  date,
  time,
  onDateChange,
  onTimeChange
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-[10px] font-black text-stone-400 uppercase tracking-widest pl-1">
            <CalendarDays size={14} className="text-amber-500" /> Requested Date
        </label>
        <div className="relative group">
            <select value={date} onChange={(e) => onDateChange(e.target.value)} className="w-full h-14 bg-white border border-stone-200 rounded-2xl px-6 text-sm font-black text-stone-900 outline-none focus:border-amber-500 decoration-none appearance-none cursor-pointer transition-all shadow-sm group-hover:border-stone-300">
                <option value="">Choose arrival date…</option>
                {DATES.map(d => <option key={d}>{d}</option>)}
            </select>
            <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none group-focus-within:rotate-180 transition-transform" />
        </div>
      </div>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-[10px] font-black text-stone-400 uppercase tracking-widest pl-1">
            <Clock size={14} className="text-amber-500" /> Arrival Time
        </label>
        <div className="relative group">
            <select value={time} onChange={(e) => onTimeChange(e.target.value)} className="w-full h-14 bg-white border border-stone-200 rounded-2xl px-6 text-sm font-black text-stone-900 outline-none focus:border-amber-500 appearance-none cursor-pointer transition-all shadow-sm group-hover:border-stone-300">
                <option value="">Preferred time…</option>
                {TIMES.map(t => <option key={t}>{t}</option>)}
            </select>
            <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none group-focus-within:rotate-180 transition-transform" />
        </div>
      </div>
    </div>
  );
}`,

    "src/components/reservation/ReservationForm.jsx": `import { Sparkles, Phone, Mail, User, Star } from 'lucide-react';
import { SPECIALS } from '../../data/services';

export default function ReservationForm({ formData, onChange, onSubmit }) {
  const handleChange = (field) => (e) => {
    onChange({ ...formData, [field]: e.target.value });
  };

  return (
    <form className="space-y-8 animate-in slide-in-from-bottom-5 duration-700" onSubmit={onSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-black text-stone-400 uppercase tracking-widest pl-1">
            <User size={14} className="text-amber-500" /> Guest Name *
          </label>
          <input
            required
            value={formData.name}
            onChange={handleChange('name')}
            placeholder="E.g. Alexander Pierce"
            className="w-full h-14 bg-white border border-stone-200 rounded-2xl px-6 text-sm font-bold text-stone-900 placeholder:text-stone-300 outline-none focus:border-amber-500 transition-all shadow-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-black text-stone-400 uppercase tracking-widest pl-1">
            <Mail size={14} className="text-amber-500" /> Notification Email *
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={handleChange('email')}
            placeholder="guest@example.com"
            className="w-full h-14 bg-white border border-stone-200 rounded-2xl px-6 text-sm font-bold text-stone-900 placeholder:text-stone-300 outline-none focus:border-amber-500 transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-black text-stone-400 uppercase tracking-widest pl-1">
            <Phone size={14} className="text-amber-500" /> Phone Contact
          </label>
          <input
            value={formData.phone}
            onChange={handleChange('phone')}
            placeholder="+1 (555) 000-0000"
            className="w-full h-14 bg-white border border-stone-200 rounded-2xl px-6 text-sm font-bold text-stone-900 placeholder:text-stone-300 outline-none focus:border-amber-500 transition-all shadow-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-black text-stone-400 uppercase tracking-widest pl-1">
            <Star size={14} className="text-amber-500" /> Special Occasion
          </label>
          <select value={formData.special} onChange={handleChange('special')} className="w-full h-14 bg-white border border-stone-200 rounded-2xl px-6 text-sm font-bold text-stone-900 outline-none focus:border-amber-500 transition-all shadow-sm appearance-none cursor-pointer">
            {SPECIALS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-[10px] font-black text-stone-400 uppercase tracking-widest pl-1">
            Additional Requests
        </label>
        <textarea
          rows={3}
          value={formData.notes}
          onChange={handleChange('notes')}
          placeholder="Dietary requirements, seating preference, or special notes for the host…"
          className="w-full p-6 bg-white border border-stone-200 rounded-3xl text-sm font-medium text-stone-900 placeholder:text-stone-300 outline-none focus:border-amber-500 transition-all shadow-sm resize-none"
        />
      </div>

      <button type="submit" className="w-full py-6 bg-stone-900 text-white rounded-[2rem] font-black text-lg tracking-tight uppercase shadow-2xl shadow-stone-900/40 flex items-center justify-center gap-3 group/btn hover:bg-black hover:scale-[1.01] active:scale-95 transition-all">
        Confirm Reservation <Sparkles size={20} className="text-amber-500 group-hover/btn:rotate-12 transition-transform" />
      </button>
    </form>
  );
}`,

    "src/components/reservation/ReservationSummary.jsx": `import { CalendarDays, Clock, Users } from 'lucide-react';

export default function ReservationSummary({ service, date, time, guests }) {
  return (
    <div className="bg-amber-50/50 border border-amber-500/10 rounded-3xl p-6 mb-10 flex flex-wrap items-center gap-x-8 gap-y-4 shadow-inner">
      <div className="flex items-center gap-3">
        <span className="text-3xl bg-white w-12 h-12 rounded-xl flex items-center justify-center shadow-sm border border-stone-100">{service?.icon}</span>
        <span className="font-black text-stone-900 uppercase tracking-tight">{service?.name}</span>
      </div>
      <div className="h-8 w-px bg-amber-500/10 hidden md:block" />
      <div className="space-y-1">
        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-0.5">Reservation Time</p>
        <div className="flex items-center gap-4 text-xs font-black text-stone-900 uppercase">
            <span className="flex items-center gap-1.5"><CalendarDays size={14} className="text-amber-600" /> {date}</span>
            <span className="flex items-center gap-1.5"><Clock size={14} className="text-amber-600" /> {time}</span>
        </div>
      </div>
      <div className="h-8 w-px bg-amber-500/10 hidden md:block" />
      <div className="space-y-1">
        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-0.5">Attendee Count</p>
        <div className="flex items-center gap-1.5 text-xs font-black text-stone-900 uppercase">
            <Users size={14} className="text-amber-600" /> {guests} Guest{guests > 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}`,

    "src/components/reservation/ReservationTicket.jsx": `import { CalendarDays, Clock, Users, QrCode } from 'lucide-react';

export default function ReservationTicket({ service, date, time, guests, special, confirmId }) {
  return (
    <div className="w-full max-w-sm mx-auto overflow-hidden shadow-2xl rounded-[3rem] animate-in slide-in-from-bottom duration-1000">
      <div className="bg-stone-900 p-10 text-white relative">
        <div className="absolute top-0 right-0 p-8 flex flex-col items-end opacity-20 group">
           <UtensilsCrossed size={120} className="rotate-12" />
        </div>
        
        <div className="relative z-10 text-left">
            <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center text-4xl mb-6 border border-white/5">
                {service?.icon}
            </div>
            <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-2">Authenticated Pass</p>
            <h4 className="text-3xl font-black italic tracking-tighter leading-none mb-4">{service?.name}</h4>
            <code className="text-[10px] font-black text-stone-500 tracking-[0.4em] uppercase">{confirmId}</code>
        </div>
      </div>
      
      <div className="bg-white p-10 border-t-4 border-dashed border-stone-100 relative">
        <div className="absolute -left-5 -top-5 w-10 h-10 bg-[#FAF9F6] rounded-full" />
        <div className="absolute -right-5 -top-5 w-10 h-10 bg-[#FAF9F6] rounded-full" />
        
        <div className="flex justify-between items-end">
          <div className="space-y-4 text-left">
            <div>
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Time</p>
                <div className="font-black text-stone-900 text-sm">{date}<br />{time}</div>
            </div>
            <div>
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Party</p>
                <div className="font-black text-stone-900 text-sm">{guests} Guest{guests > 1 ? 's' : ''}</div>
            </div>
            {special !== 'None' && (
              <div className="flex items-center gap-2 py-2 px-3 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-amber-100">
                🎉 {special}
              </div>
            )}
          </div>
          <div className="w-24 h-24 bg-stone-50 border border-stone-100 rounded-3xl flex items-center justify-center p-3">
              <QrCode size={100} strokeWidth={1.5} className="text-stone-900" />
          </div>
        </div>
      </div>
    </div>
  );
}`,

    "src/components/reservation/SuccessView.jsx": `import { CheckCircle2, Share2, Download, ArrowRight } from 'lucide-react';
import ReservationTicket from './ReservationTicket';

import { UtensilsCrossed } from 'lucide-react';

export default function SuccessView({
  service,
  date,
  time,
  guests,
  email,
  special,
  confirmId,
  onReset
}) {
  return (
    <div className="text-center py-6">
      <div className="flex justify-center mb-10">
        <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/20 blur-3xl scale-150 animate-pulse rounded-full" />
            <div className="relative w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-500/20 shadow-xl shadow-emerald-500/10">
                <CheckCircle2 size={56} strokeWidth={2.5} />
            </div>
        </div>
      </div>
      
      <h2 className="text-4xl md:text-5xl font-black text-stone-900 tracking-tighter leading-none mb-4">Confirmed.</h2>
      <p className="text-stone-500 font-medium text-lg leading-tight mb-12">An encrypted reservation voucher <br className="hidden md:block" />has been sent to <span className="text-stone-900 underline underline-offset-4 decoration-amber-500 decoration-2 font-bold italic">{email}</span></p>
      
      <div className="mb-14 px-4">
        <ReservationTicket
          service={service}
          date={date}
          time={time}
          guests={guests}
          special={special}
          confirmId={confirmId}
        />
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
        <button className="flex items-center gap-2 px-8 py-4 bg-stone-900 text-white rounded-[2rem] font-bold text-sm tracking-widest hover:bg-black transition-all shadow-xl shadow-stone-900/20">
            <Download size={18} /> Download Pass
        </button>
        <button className="flex items-center gap-2 px-8 py-4 bg-white border border-stone-200 text-stone-600 rounded-[2rem] font-bold text-sm tracking-widest hover:border-stone-900 hover:text-stone-900 transition-all">
            <Share2 size={18} /> Share Booking
        </button>
      </div>

      <button className="inline-flex items-center gap-2 text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] hover:text-amber-600 transition-all group" onClick={onReset}>
        Initiate New Schedule <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
}`,

    "src/components/reservation/ReservationCard.jsx": `import { X, Calendar, User, Clock, QrCode } from 'lucide-react';

export default function ReservationCard({ reservation, onCancel }) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm relative group overflow-hidden animate-in slide-in-from-right duration-500">
      <div className="absolute top-0 right-0 w-2 h-full bg-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
            <div className="text-2xl bg-stone-50 w-10 h-10 rounded-xl flex items-center justify-center border border-stone-100 group-hover:bg-amber-50 transition-colors">
                {reservation.service?.icon}
            </div>
            <div>
                <h4 className="text-sm font-black text-stone-900 uppercase tracking-tight leading-none group-hover:text-amber-600 transition-colors">{reservation.service?.name}</h4>
                <code className="text-[9px] font-bold text-stone-400 tracking-wider uppercase">{reservation.confirmId}</code>
            </div>
        </div>
        <button className="p-2 text-stone-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all" onClick={() => onCancel(reservation.id)}>
          <X size={16} strokeWidth={2.5} />
        </button>
      </div>
      
      <div className="space-y-2 mt-4">
        <div className="flex items-center gap-3 text-[10px] font-black text-stone-500 uppercase tracking-widest">
            <Calendar size={14} className="text-amber-500 opacity-70" /> {reservation.date}
        </div>
        <div className="flex items-center gap-3 text-[10px] font-black text-stone-500 uppercase tracking-widest leading-none">
            <Clock size={14} className="text-amber-500 opacity-70" /> {reservation.time}
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-stone-50 mt-4">
            <div className="flex items-center gap-2 text-[10px] font-black text-stone-400 uppercase tracking-widest">
                <User size={14} className="text-amber-500 opacity-70" /> {reservation.guests} Guests
            </div>
            <QrCode size={18} className="text-stone-300 group-hover:text-stone-900 transition-colors" />
        </div>
      </div>
    </div>
  );
}`,

    "src/components/reservation/ReservationsSidebar.jsx": `import { History, CalendarClock } from 'lucide-react';
import ReservationCard from './ReservationCard';

export default function ReservationsSidebar({ reservations, onCancelReservation }) {
  return (
    <div className="lg:sticky lg:top-10 space-y-8">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-[10px] font-black text-stone-900 uppercase tracking-[0.3em] flex items-center gap-3 leading-none">
            <CalendarClock size={18} className="text-amber-500 rotate-12" /> Active Slips
        </h3>
        <span className="bg-stone-900 text-white px-2.5 py-1 rounded-full text-[10px] font-black leading-none">{reservations.length}</span>
      </div>
      
      <div className="flex flex-col gap-6">
        {reservations.length === 0 ? (
          <div className="p-12 text-center bg-white/50 border-2 border-dashed border-stone-200 rounded-[3rem] animate-pulse">
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] leading-relaxed">System awaiting <br />registry data</p>
          </div>
        ) : (
          reservations.map(r => (
            <ReservationCard
              key={r.id}
              reservation={r}
              onCancel={onCancelReservation}
            />
          ))
        )}
      </div>

      <div className="p-8 bg-amber-50/50 rounded-[2.5rem] border border-amber-500/10 hidden lg:block">
          <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-3 flex items-center gap-2">
            <History size={14} /> Global Protocol
          </h4>
          <p className="text-[10px] font-bold text-stone-500 leading-relaxed uppercase tracking-tighter opacity-80">All reservations are held for 15 minutes past the scheduled arrival time before release.</p>
      </div>
    </div>
  );
}`,

    // --- VIEWS ---
    "src/views/SelectView.jsx": `import { Users, LayoutGrid, CheckCircle2 } from 'lucide-react';
import ServiceGrid from '../components/reservation/ServiceGrid';
import DateTimePicker from '../components/reservation/DateTimePicker';
import GuestSelector from '../components/ui/GuestSelector';

export default function SelectView({
  selectedService,
  date,
  time,
  guests,
  onSelectService,
  onDateChange,
  onTimeChange,
  onGuestsChange,
  onContinue
}) {
  const canContinue = selectedService && date && time;

  return (
    <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl shadow-stone-200/50 border border-stone-100 animate-in fade-in slide-in-from-bottom duration-700">
      <div className="flex items-center justify-between mb-10 pb-6 border-b border-stone-100">
        <div>
          <h2 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-3 leading-none mb-1 uppercase italic">
            Placement
          </h2>
          <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em]">Module One: Configuration</p>
        </div>
        <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-900 border border-stone-100 shadow-sm">
          <LayoutGrid size={24} />
        </div>
      </div>

      <ServiceGrid
        selectedServiceId={selectedService?.id}
        onSelectService={onSelectService}
      />

      {selectedService ? (
        <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
          <DateTimePicker
            date={date}
            time={time}
            onDateChange={onDateChange}
            onTimeChange={onTimeChange}
          />
          <GuestSelector
            guests={guests}
            maxCapacity={selectedService.capacity}
            onChange={onGuestsChange}
          />
        </div>
      ) : (
          <div className="py-20 text-center bg-stone-50/50 rounded-[3rem] border-2 border-dashed border-stone-100 my-8">
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em]">Awaiting Selection</p>
          </div>
      )}

      <button
        className="w-full mt-12 py-6 bg-stone-900 text-white rounded-[2rem] font-black text-lg tracking-tight uppercase shadow-2xl shadow-stone-900/40 flex items-center justify-center gap-3 hover:bg-black hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-20 disabled:grayscale disabled:hover:scale-100 group"
        disabled={!canContinue}
        onClick={onContinue}
      >
        Forward to Details <CheckCircle2 size={24} className="text-amber-500 group-hover:scale-110 transition-transform" />
      </button>
    </div>
  );
}`,

    "src/views/DetailsView.jsx": `import { ClipboardCheck, ShieldCheck } from 'lucide-react';
import BackLink from '../components/ui/BackLink';
import ReservationSummary from '../components/reservation/ReservationSummary';
import ReservationForm from '../components/reservation/ReservationForm';

export default function DetailsView({
  service,
  date,
  time,
  guests,
  formData,
  onBack,
  onFormChange,
  onSubmit
}) {
  return (
    <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl shadow-stone-200/50 border border-stone-100 animate-in fade-in slide-in-from-right duration-700">
      <BackLink onClick={onBack} />
      
      <div className="flex items-center justify-between mb-10 pb-6 border-b border-stone-100">
        <div>
          <h2 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-3 leading-none mb-1 uppercase italic">
            Identity
          </h2>
          <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em]">Module Two: Verification</p>
        </div>
        <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-900 border border-stone-100 shadow-sm">
          <ClipboardCheck size={24} />
        </div>
      </div>

      <ReservationSummary
        service={service}
        date={date}
        time={time}
        guests={guests}
      />
      
      <div className="space-y-10">
          <ReservationForm
            formData={formData}
            onChange={onFormChange}
            onSubmit={onSubmit}
          />
          
          <div className="flex items-center justify-center gap-2 px-6 py-3 bg-stone-50 rounded-2xl border border-stone-100">
              <ShieldCheck size={16} className="text-emerald-500" />
              <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">TLS 256-BIT ENCRYPTED CONNECTION SECURED</p>
          </div>
      </div>
    </div>
  );
}`,

    // --- MAIN APP ---
    "src/App.jsx": `import { useState, useMemo } from 'react';
import { generateConfirmId } from './data/services';
import Hero from './components/layout/Hero';
import SelectView from './views/SelectView';
import DetailsView from './views/DetailsView';
import SuccessView from './components/reservation/SuccessView';
import ReservationsSidebar from './components/reservation/ReservationsSidebar';

function App() {
  const [step, setStep] = useState('select');
  const [service, setService] = useState(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [guests, setGuests] = useState(2);
  const [form, setForm] = useState({ name: '', email: '', phone: '', special: 'None', notes: '' });
  const [reservations, setReservations] = useState([]);
  const confirmId = useMemo(() => generateConfirmId(), [reservations.length]);

  const handleBook = (e) => {
    e.preventDefault();
    const reservation = {
      id: Date.now(),
      service,
      date,
      time,
      guests,
      name: form.name,
      email: form.email,
      special: form.special,
      confirmId
    };
    setReservations(prev => [reservation, ...prev]);
    setStep('success');
  };

  const handleReset = () => {
    setStep('select');
    setService(null);
    setDate('');
    setTime('');
    setGuests(2);
    setForm({ name: '', email: '', phone: '', special: 'None', notes: '' });
  };

  const cancelReservation = (id) => {
    setReservations(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="max-w-6xl mx-auto py-10 md:py-20 px-6">
      <header className="mb-14 text-center md:text-left">
          <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.6em] mb-4">Bella Vista Reservation Protocol v2.4</p>
          <Hero />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        <main className="lg:col-span-8 order-2 lg:order-1">
          {step === 'select' && (
            <SelectView
              selectedService={service}
              date={date}
              time={time}
              guests={guests}
              onSelectService={setService}
              onDateChange={setDate}
              onTimeChange={setTime}
              onGuestsChange={setGuests}
              onContinue={() => setStep('details')}
            />
          )}

          {step === 'details' && (
            <DetailsView
              service={service}
              date={date}
              time={time}
              guests={guests}
              formData={form}
              onBack={() => setStep('select')}
              onFormChange={setForm}
              onSubmit={handleBook}
            />
          )}

          {step === 'success' && (
            <SuccessView
              service={service}
              date={date}
              time={time}
              guests={guests}
              email={form.email}
              special={form.special}
              confirmId={confirmId}
              onReset={handleReset}
            />
          )}
        </main>

        <aside className="lg:col-span-4 order-1 lg:order-2">
          <ReservationsSidebar
            reservations={reservations}
            onCancelReservation={cancelReservation}
          />
        </aside>
      </div>
      
      <footer className="mt-40 text-center pb-12 opacity-30 group">
          <div className="h-px bg-stone-200 w-24 mx-auto mb-10 transition-all group-hover:w-full" />
          <p className="text-[10px] font-black text-stone-900 uppercase tracking-[0.4em]">Proprietary Registry — B-Master Engine</p>
      </footer>
    </div>
  );
}

export default App;`,
  }
};
