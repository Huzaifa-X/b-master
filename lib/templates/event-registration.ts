import { TemplateDefinition } from './index';

export const eventRegistrationTemplate: TemplateDefinition = {
  id: "event-registration",
  name: "Event Registration",
  description: "Event sign-up with attendee list & confirmation ticket using Tailwind CSS",
  category: "booking",
  files: {
    "package.json": JSON.stringify(
      {
        name: "event-registration",
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
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <title>Event Registration</title>
  </head>
  <body class="bg-[#1a1a2e] text-slate-100">
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
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
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
    @apply antialiased text-slate-100;
    font-family: 'Plus Jakarta Sans', sans-serif;
    background: linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #1A1A2E 100%);
    min-height: 100vh;
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
    "src/data/event.js": `export const EVENT = {
  title: 'TechConnect Summit 2025',
  date: 'Saturday, April 12, 2025',
  time: '9:00 AM – 6:00 PM PST',
  location: 'Moscone Center, San Francisco, CA',
  description: 'Join 2,000+ tech professionals for a day of keynotes, workshops, and networking.',
};

export const TICKETS = [
  { id: 'general', label: 'General Admission', price: 0, desc: 'Keynotes & expo floor', icon: '🎟️' },
  { id: 'vip', label: 'VIP All-Access', price: 299, desc: 'Front row + speaker dinners', icon: '⭐' },
  { id: 'workshop', label: 'Workshop Pass', price: 149, desc: '3 hands-on workshops', icon: '🛠️' },
];

export const generateConfirmId = () => 'EVT-' + Math.random().toString(36).slice(2, 8).toUpperCase();`,

    // --- LAYOUT COMPONENTS ---
    "src/components/layout/EventBanner.jsx": `import { Calendar, Clock, MapPin, Users, Sparkles } from 'lucide-react';
import { EVENT } from '../../data/event';

export default function EventBanner({ attendeeCount }) {
  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 mb-8 overflow-hidden relative group">
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/20 blur-3xl rounded-full transition-transform group-hover:scale-125 duration-1000" />
      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-6 border border-indigo-500/30">
          <Sparkles size={12} />
          Upcoming Event
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-6 leading-none">{EVENT.title}</h1>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-bold text-slate-400 mb-8 border-l-2 border-indigo-500 pl-6 py-2">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-indigo-400" />
            {EVENT.date}
          </div>
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-indigo-400" />
            {EVENT.time}
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-indigo-400" />
            {EVENT.location}
          </div>
        </div>
        <p className="text-slate-400 text-lg leading-relaxed max-w-2xl mb-8 font-medium">{EVENT.description}</p>
        <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-slate-900/50 rounded-2xl border border-white/5 shadow-2xl">
          <div className="flex -space-x-2">
            {[1,2,3].map(i => (
              <img key={i} src={\`https://i.pravatar.cc/40?u=\${i}\`} className="w-8 h-8 rounded-full border-2 border-[#1a1a2e]" />
            ))}
          </div>
          <p className="text-xs font-bold text-slate-300">
            <span className="text-white">{attendeeCount + 100}+</span> tech leaders already registered
          </p>
        </div>
      </div>
    </div>
  );
}`,

    // --- UI COMPONENTS ---
    "src/components/ui/BackLink.jsx": `import { ChevronLeft } from 'lucide-react';

export default function BackLink({ onClick }) {
  return (
    <button className="flex items-center gap-1.5 text-xs font-black text-slate-500 uppercase tracking-widest hover:text-indigo-400 transition-colors mb-8" onClick={onClick}>
      <ChevronLeft size={16} /> Back to Tickets
    </button>
  );
}`,

    "src/components/ui/QtyControl.jsx": `import { Minus, Plus } from 'lucide-react';

export default function QtyControl({ quantity, onDecrease, onIncrease, total }) {
  return (
    <div className="flex items-center justify-between p-6 bg-slate-900/50 rounded-2xl border border-white/5 mb-8">
      <div className="flex items-center gap-6">
        <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Quantity</span>
        <div className="flex items-center bg-[#1a1a2e] border border-white/10 rounded-xl p-1 gap-1">
          <button 
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all" 
            onClick={onDecrease}
          >
            <Minus size={16} strokeWidth={3} />
          </button>
          <span className="w-10 text-center font-black text-xl text-white">{quantity}</span>
          <button 
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all" 
            onClick={onIncrease}
          >
            <Plus size={16} strokeWidth={3} />
          </button>
        </div>
      </div>
      {total > 0 && (
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Subtotal</p>
          <p className="text-2xl font-black text-indigo-400 tracking-tighter leading-none">\${total}</p>
        </div>
      )}
    </div>
  );
}`,

    // --- EVENT COMPONENTS ---
    "src/components/event/TicketCard.jsx": `import { CheckCircle2, ArrowRight } from 'lucide-react';

export default function TicketCard({ ticket, isSelected, onSelect }) {
  return (
    <button
      className={\`flex items-center gap-5 p-6 border-2 rounded-[2rem] text-left transition-all duration-300 group \${
        isSelected ? 'bg-indigo-600 border-indigo-500 shadow-2xl shadow-indigo-600/30' : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10 shadow-sm'
      }\`}
      onClick={onSelect}
    >
      <div className={\`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-transform group-hover:scale-110 \${
        isSelected ? 'bg-white/20' : 'bg-slate-900'
      }\`}>
        {ticket.icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className={\`text-lg font-black leading-none mb-2 \${isSelected ? 'text-white' : 'text-slate-100'}\`}>{ticket.label}</h4>
        <p className={\`text-sm font-medium pr-4 line-clamp-1 \${isSelected ? 'text-indigo-200' : 'text-slate-400'}\`}>{ticket.desc}</p>
      </div>
      <div className="text-right flex flex-col items-end gap-1">
        <span className={\`text-xl font-black tracking-tighter \${isSelected ? 'text-white' : 'text-slate-100'}\`}>
          {ticket.price === 0 ? 'Free' : '$' + ticket.price}
        </span>
        {isSelected ? (
          <CheckCircle2 size={24} className="text-white animate-in zoom-in duration-300" />
        ) : (
          <ArrowRight size={18} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
        )}
      </div>
    </button>
  );
}`,

    "src/components/event/TicketList.jsx": `import { TICKETS } from '../../data/event';
import TicketCard from './TicketCard';

export default function TicketList({ selectedTicketId, onSelectTicket }) {
  return (
    <div className="flex flex-col gap-4 mb-8">
      {TICKETS.map(t => (
        <TicketCard
          key={t.id}
          ticket={t}
          isSelected={selectedTicketId === t.id}
          onSelect={() => onSelectTicket(t.id)}
        />
      ))}
    </div>
  );
}`,

    "src/components/event/RegistrationForm.jsx": `export default function RegistrationForm({ formData, onChange, onSubmit }) {
  const handleChange = (field) => (e) => {
    onChange({ ...formData, [field]: e.target.value });
  };

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">First Name *</label>
          <input
            required
            value={formData.firstName}
            onChange={handleChange('firstName')}
            placeholder="Jane"
            className="w-full h-14 bg-slate-900 border border-white/5 rounded-2xl px-5 text-slate-100 font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-700 shadow-inner shadow-black/20"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Last Name *</label>
          <input
            required
            value={formData.lastName}
            onChange={handleChange('lastName')}
            placeholder="Smith"
            className="w-full h-14 bg-slate-900 border border-white/5 rounded-2xl px-5 text-slate-100 font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-700 shadow-inner shadow-black/20"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Business Email *</label>
        <input
          type="email"
          required
          value={formData.email}
          onChange={handleChange('email')}
          placeholder="jane@company.com"
          className="w-full h-14 bg-slate-900 border border-white/5 rounded-2xl px-5 text-slate-100 font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-700 shadow-inner shadow-black/20"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Company / Organization</label>
        <input
          value={formData.company}
          onChange={handleChange('company')}
          placeholder="Acme Corp"
          className="w-full h-14 bg-slate-900 border border-white/5 rounded-2xl px-5 text-slate-100 font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-700 shadow-inner shadow-black/20"
        />
      </div>
      <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-indigo-600/30 hover:scale-[1.01] hover:bg-indigo-500 active:scale-95 transition-all">
        Complete Registration
      </button>
    </form>
  );
}`,

    "src/components/event/ETicket.jsx": `import { Calendar, MapPin, QrCode } from 'lucide-react';
import { EVENT } from '../../data/event';

export default function ETicket({ ticket, attendeeName, confirmId }) {
  return (
    <div className="w-full max-w-sm mx-auto overflow-hidden shadow-2xl animate-in zoom-in-95 duration-700">
      <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-8 flex justify-between items-start rounded-t-3xl border-b-2 border-dashed border-indigo-900/40 relative">
        <div className="absolute -left-3 -bottom-3 w-6 h-6 bg-[#1a1a2e] rounded-full" />
        <div className="absolute -right-3 -bottom-3 w-6 h-6 bg-[#1a1a2e] rounded-full" />
        
        <div className="text-left">
          <p className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em] mb-3">Admission Pass</p>
          <h4 className="text-xl font-black text-white leading-tight mb-4">{EVENT.title}</h4>
          <div className="space-y-1.5 opacity-90">
            <div className="flex items-center gap-2 text-[10px] font-bold text-white uppercase">
              <Calendar size={12} className="text-indigo-200" /> {EVENT.date}
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-white uppercase">
              <MapPin size={12} className="text-indigo-200" /> {EVENT.location}
            </div>
          </div>
        </div>
        <div className="text-4xl bg-white/20 p-3 rounded-2xl backdrop-blur-sm self-center">
          {ticket?.icon}
        </div>
      </div>
      
      <div className="bg-white p-8 rounded-b-3xl text-slate-900 flex justify-between items-end relative">
        <div className="text-left">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">Attendee</p>
          <p className="text-xl font-black tracking-tight mb-4">{attendeeName}</p>
          
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">Pass Type</p>
          <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest leading-none mb-4">{ticket?.label}</p>
          
          <code className="bg-slate-50 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 border border-slate-100">
            ID: {confirmId}
          </code>
        </div>
        <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center p-2 border border-slate-100">
          <QrCode size={64} strokeWidth={1.5} className="text-slate-900" />
        </div>
      </div>
    </div>
  );
}`,

    "src/components/event/SuccessView.jsx": `import { CheckCircle2, ChevronRight, Download, Share2 } from 'lucide-react';
import ETicket from './ETicket';

export default function SuccessView({ ticket, formData, confirmId, onReset }) {
  const attendeeName = \`\${formData.firstName} \` + \` \${formData.lastName}\`;

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-[3rem] p-12 text-center animate-in fade-in zoom-in duration-700 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-indigo-500" />
      <div className="flex justify-center mb-8">
        <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-500/30 scale-125">
          <CheckCircle2 size={40} strokeWidth={3} />
        </div>
      </div>
      <h2 className="text-4xl font-black text-white tracking-tight mb-4 leading-none">Registration Secured!</h2>
      <p className="text-slate-400 font-medium mb-12">A confirmation email with your digital pass has been <br />sent to <strong className="text-indigo-300 underline underline-offset-4">{formData.email}</strong></p>
      
      <div className="mb-12">
        <ETicket
          ticket={ticket}
          attendeeName={attendeeName}
          confirmId={confirmId}
        />
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
        <button className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/30">
          <Download size={18} /> Download Ticket
        </button>
        <button className="flex items-center gap-2 px-6 py-3.5 bg-slate-800 text-slate-300 rounded-2xl font-bold text-sm hover:text-white hover:bg-slate-700 transition-all">
          <Share2 size={18} /> Share Event
        </button>
      </div>

      <button className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] hover:text-indigo-400 transition-all flex items-center gap-2 mx-auto" onClick={onReset}>
        Register Another Person <ChevronRight size={14} />
      </button>
    </div>
  );
}`,

    "src/components/event/AttendeesList.jsx": `import { Users, User, ArrowRight } from 'lucide-react';
import { TICKETS } from '../../data/event';

export default function AttendeesList({ attendees }) {
  if (attendees.length === 0) return null;

  return (
    <div className="mt-12 bg-black/20 rounded-[2.5rem] p-10 border border-white/5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-8">
        <h3 className="flex items-center gap-3 text-lg font-black text-white tracking-tight">
          <div className="w-10 h-10 bg-indigo-500/20 text-indigo-300 rounded-xl flex items-center justify-center border border-indigo-500/20">
            <Users size={20} />
          </div>
          Attendee Roster
        </h3>
        <span className="px-4 py-1.5 bg-indigo-500/20 text-indigo-300 rounded-full text-[10px] font-black uppercase tracking-wider">{attendees.length} people</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {attendees.map(a => (
          <div key={a.id} className="flex items-center justify-between p-5 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-slate-400 border border-white/5">
                <User size={18} />
              </div>
              <div>
                <p className="font-bold text-slate-100 group-hover:text-white transition-colors capitalize">{a.firstName} {a.lastName}</p>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{a.company || 'Private Attendee'}</p>
              </div>
            </div>
            <div className="bg-indigo-500/10 text-indigo-400 text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-lg border border-indigo-500/10 whitespace-nowrap">
              {TICKETS.find(t => t.id === a.ticket)?.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}`,

    // --- VIEWS ---
    "src/views/TicketSelectView.jsx": `import { Ticket, Sparkles } from 'lucide-react';
import { TICKETS } from '../data/event';
import TicketList from '../components/event/TicketList';
import QtyControl from '../components/ui/QtyControl';

export default function TicketSelectView({
  selectedTicketId,
  quantity,
  onSelectTicket,
  onQuantityChange,
  onContinue
}) {
  const ticket = TICKETS.find(t => t.id === selectedTicketId);
  const total = ticket ? ticket.price * quantity : 0;

  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[3rem] p-10 md:p-12 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-700">
      <div className="flex items-center justify-between mb-10 border-b border-white/5 pb-8">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3 leading-none mb-1">
            Choose Your Pass
          </h2>
          <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Tiered event access</p>
        </div>
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/20">
          <Ticket size={24} strokeWidth={2.5} />
        </div>
      </div>

      <TicketList
        selectedTicketId={selectedTicketId}
        onSelectTicket={onSelectTicket}
      />

      {selectedTicketId && (
        <QtyControl
          quantity={quantity}
          onDecrease={() => onQuantityChange(Math.max(1, quantity - 1))}
          onIncrease={() => onQuantityChange(Math.min(10, quantity + 1))}
          total={total}
        />
      )}

      <button
        className="w-full py-5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-[2rem] font-black text-lg shadow-2xl shadow-indigo-600/30 hover:scale-[1.01] hover:shadow-indigo-600/50 active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100 uppercase tracking-widest flex items-center justify-center gap-3"
        disabled={!selectedTicketId}
        onClick={onContinue}
      >
        <Sparkles size={20} />
        Continue to Details
      </button>
    </div>
  );
}`,

    "src/views/DetailsView.jsx": `import { Ticket, ClipboardEdit, Sparkles } from 'lucide-react';
import { TICKETS } from '../data/event';
import BackLink from '../components/ui/BackLink';
import RegistrationForm from '../components/event/RegistrationForm';

export default function DetailsView({
  selectedTicketId,
  quantity,
  formData,
  onBack,
  onFormChange,
  onSubmit
}) {
  const ticket = TICKETS.find(t => t.id === selectedTicketId);
  const total = ticket ? ticket.price * quantity : 0;

  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[3rem] p-10 md:p-12 shadow-2xl animate-in fade-in slide-in-from-right-10 duration-700">
      <BackLink onClick={onBack} />
      
      <div className="flex items-center justify-between mb-10 border-b border-white/5 pb-8">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3 leading-none mb-1">
            Attendee Data
          </h2>
          <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Finalize Your Registration</p>
        </div>
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/20">
          <ClipboardEdit size={24} strokeWidth={2.5} />
        </div>
      </div>

      <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl p-6 mb-10 flex items-center justify-between animate-in slide-in-from-top duration-500">
        <div className="flex items-center gap-4">
          <div className="text-3xl bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/20">
            {ticket?.icon}
          </div>
          <div>
            <p className="font-black text-white text-lg tracking-tight leading-none mb-1">{ticket?.label}</p>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Quantity: {quantity} Pass{quantity > 1 ? 'es' : ''}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Due</p>
          <p className="text-2xl font-black text-emerald-400 tracking-tighter leading-none">{total === 0 ? 'Free' : '$' + total}</p>
        </div>
      </div>

      <RegistrationForm
        formData={formData}
        onChange={onFormChange}
        onSubmit={onSubmit}
      />
    </div>
  );
}`,

    // --- MAIN APP ---
    "src/App.jsx": `import { useState, useMemo } from 'react';
import { TICKETS, generateConfirmId } from './data/event';
import EventBanner from './components/layout/EventBanner';
import TicketSelectView from './views/TicketSelectView';
import DetailsView from './views/DetailsView';
import SuccessView from './components/event/SuccessView';
import AttendeesList from './components/event/AttendeesList';

function App() {
  const [step, setStep] = useState('event');
  const [ticketType, setTicketType] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', company: '' });
  const [attendees, setAttendees] = useState([]);
  const confirmId = useMemo(() => generateConfirmId(), [attendees.length]);

  const ticket = TICKETS.find(t => t.id === ticketType);

  const handleRegister = (e) => {
    e.preventDefault();
    setAttendees(prev => [{ ...form, ticket: ticketType, id: Date.now() }, ...prev]);
    setStep('success');
  };

  const handleReset = () => {
    setStep('event');
    setTicketType(null);
    setQuantity(1);
    setForm({ firstName: '', lastName: '', email: '', company: '' });
  };

  return (
    <div className="max-w-4xl mx-auto py-20 px-6 min-h-screen">
      <EventBanner attendeeCount={attendees.length} />

      <main className="mb-20">
        {step === 'event' && (
          <TicketSelectView
            selectedTicketId={ticketType}
            quantity={quantity}
            onSelectTicket={setTicketType}
            onQuantityChange={setQuantity}
            onContinue={() => setStep('details')}
          />
        )}

        {step === 'details' && (
          <DetailsView
            selectedTicketId={ticketType}
            quantity={quantity}
            formData={form}
            onBack={() => setStep('event')}
            onFormChange={setForm}
            onSubmit={handleRegister}
          />
        )}

        {step === 'success' && (
          <SuccessView
            ticket={ticket}
            formData={form}
            confirmId={confirmId}
            onReset={handleReset}
          />
        )}
      </main>

      <AttendeesList attendees={attendees} />
      
      <footer className="mt-32 text-center pb-10">
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">Powered by B-Master Event Grid</p>
      </footer>
    </div>
  );
}

export default App;`,
  }
};
