import { TemplateDefinition } from './index';

export const calendarBookingTemplate: TemplateDefinition = {
  id: "calendar-booking",
  name: "Calendar Booking",
  description: "Appointment scheduling with calendar & time slots using Tailwind CSS",
  category: "booking",
  files: {
    "package.json": JSON.stringify(
      {
        name: "calendar-booking",
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
          "date-fns": "^3.6.0",
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
    <title>Book an Appointment</title>
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
    @apply bg-slate-50 text-slate-900;
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
    "src/data/services.js": `export const HOST_INFO = {
  name: "Alex Johnson",
  role: "Product Designer",
  company: "BookMe",
  avatar: "https://i.pravatar.cc/80?u=alex"
};

export const SERVICES = [
  { id: '15min', label: '15-Min Quick Sync', duration: 15, color: 'bg-blue-500', desc: 'A quick chat to align on a topic' },
  { id: '30min', label: '30-Min Introduction', duration: 30, color: 'bg-emerald-500', desc: 'Get to know each other and discuss goals' },
  { id: '60min', label: '60-Min Deep Dive', duration: 60, color: 'bg-purple-500', desc: 'In-depth session with full agenda' },
];

export const generateSlots = () => {
  const times = [];
  for (let h = 9; h < 17; h++) {
    const ampm = h < 12 ? 'AM' : 'PM';
    const hour = h > 12 ? h - 12 : h;
    times.push(\`\${hour}:00 \${ampm}\`);
    times.push(\`\${hour}:30 \${ampm}\`);
  }
  return times.filter((_, i) => Math.random() > 0.3);
};`,

    // --- LAYOUT COMPONENTS ---
    "src/components/layout/Header.jsx": `import { HOST_INFO } from '../../data/services';

export default function Header() {
  return (
    <div className="flex items-center gap-4 p-8 border-b border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/50">
      <div className="flex-shrink-0">
        <img src={HOST_INFO.avatar} alt="Host" className="w-14 h-14 rounded-full border-2 border-blue-500 shadow-sm" />
      </div>
      <div>
        <h1 className="text-lg font-bold text-slate-900 leading-tight">{HOST_INFO.name}</h1>
        <p className="text-sm text-slate-500 font-medium">{HOST_INFO.role} · {HOST_INFO.company}</p>
      </div>
    </div>
  );
}`,

    // --- UI COMPONENTS ---
    "src/components/ui/BackButton.jsx": `import { ChevronLeft } from 'lucide-react';

export default function BackButton({ onClick }) {
  return (
    <button className="flex items-center gap-1.5 px-4 py-1.5 border border-slate-200 rounded-full text-sm font-semibold text-slate-500 hover:border-blue-500 hover:text-blue-600 transition-all mb-6 bg-white shadow-sm shadow-slate-100" onClick={onClick}>
      <ChevronLeft size={16} /> Back
    </button>
  );
}`,

    "src/components/ui/SlotButton.jsx": `export default function SlotButton({ slot, isActive, onSelect, onConfirm }) {
  return (
    <div className="flex flex-col gap-2">
      <button
        className={\`w-full p-4 border rounded-xl font-bold text-sm transition-all \${isActive ? 'bg-slate-600 border-slate-600 text-white shadow-md' : 'bg-white border-blue-500 text-blue-600 hover:border-2 hover:p-[15px]'}\`}
        onClick={onSelect}
      >
        {slot}
      </button>
      {isActive && (
        <button className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 animate-in slide-in-from-right-2" onClick={onConfirm}>
          Confirm
        </button>
      )}
    </div>
  );
}`,

    // --- BOOKING COMPONENTS ---
    "src/components/booking/ServiceCard.jsx": `import { ChevronRight, Clock } from 'lucide-react';

export default function ServiceCard({ service, onClick }) {
  return (
    <button className="flex items-center gap-4 p-5 rounded-xl border-2 border-slate-100 bg-white shadow-sm hover:border-blue-500 hover:shadow-md hover:-translate-y-0.5 transition-all text-left relative group overflow-hidden" onClick={onClick}>
      <div className={\`absolute left-0 top-0 bottom-0 w-1 \${service.color}\`} />
      <div className="flex-1 pl-2">
        <span className="block text-[17px] font-bold text-slate-900 mb-1">{service.label}</span>
        <span className="block text-sm text-slate-500 mb-2 line-clamp-1">{service.desc}</span>
        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
          <Clock size={14} /> {service.duration} min · Google Meet
        </span>
      </div>
      <ChevronRight size={20} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
    </button>
  );
}`,

    "src/components/booking/ServiceList.jsx": `import { SERVICES } from '../../data/services';
import ServiceCard from './ServiceCard';

export default function ServiceList({ onSelectService }) {
  return (
    <div className="flex flex-col gap-3">
      {SERVICES.map(svc => (
        <ServiceCard
          key={svc.id}
          service={svc}
          onClick={() => onSelectService(svc)}
        />
      ))}
    </div>
  );
}`,

    "src/components/booking/Calendar.jsx": `import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  startOfDay
} from 'date-fns';

export default function Calendar({
  currentMonth,
  selectedDate,
  onMonthChange,
  onDateSelect
}) {
  const today = startOfDay(new Date());
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const handleDateClick = (day) => {
    if (isBefore(day, today)) return;
    if (!isSameMonth(day, currentMonth)) return;
    onDateSelect(day);
  };

  return (
    <div className="flex-1 md:pr-10">
      <div className="flex items-center justify-between mb-8">
        <button className="p-2 border border-slate-200 rounded-full text-blue-600 hover:bg-blue-50 transition-colors" onClick={() => onMonthChange(subMonths(currentMonth, 1))}>
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-bold uppercase tracking-widest text-slate-700">{format(currentMonth, 'MMMM yyyy')}</span>
        <button className="p-2 border border-slate-200 rounded-full text-blue-600 hover:bg-blue-50 transition-colors" onClick={() => onMonthChange(addMonths(currentMonth, 1))}>
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-4">{d}</div>
        ))}
        {days.map((day, i) => {
          const isPast = isBefore(day, today);
          const isOtherMonth = !isSameMonth(day, currentMonth);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          
          if (isOtherMonth) return <div key={i} className="aspect-square" />;

          return (
            <button
              key={i}
              className={\`aspect-square flex flex-col items-center justify-center rounded-full text-[15px] font-bold transition-all relative
                \${isPast ? 'text-slate-200 cursor-default' : 'text-blue-600 hover:bg-blue-50 cursor-pointer'} 
                \${isSelected ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
              \`}
              onClick={() => handleDateClick(day)}
              disabled={isPast}
            >
              {format(day, 'd')}
              {isToday(day) && !isSelected && <div className="absolute bottom-2 w-1.5 h-1.5 bg-current rounded-full" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}`,

    "src/components/booking/TimeSlots.jsx": `import { format } from 'date-fns';
import SlotButton from '../ui/SlotButton';

export default function TimeSlots({
  selectedDate,
  availableSlots,
  selectedSlot,
  onSlotSelect,
  onConfirm
}) {
  if (!selectedDate) return null;

  return (
    <div className="w-full md:w-[280px] mt-10 md:mt-0 flex flex-col animate-in fade-in duration-500">
      <p className="text-lg font-bold text-slate-900 mb-6">{format(selectedDate, 'EEEE, MMMM d')}</p>
      <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-3 scrollbar-thin scrollbar-thumb-slate-200">
        {availableSlots.map((slot, i) => (
          <SlotButton
            key={i}
            slot={slot}
            isActive={selectedSlot === slot}
            onSelect={() => onSlotSelect(slot)}
            onConfirm={onConfirm}
          />
        ))}
      </div>
    </div>
  );
}`,

    "src/components/booking/BookingForm.jsx": `export default function BookingForm({ formData, onChange, onSubmit }) {
  const handleChange = (field) => (e) => {
    onChange({ ...formData, [field]: e.target.value });
  };

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      <h3 className="text-xl font-bold text-slate-900 mb-2">Enter Your Details</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-bold text-slate-700">Full Name *</label>
          <input
            required
            value={formData.name}
            onChange={handleChange('name')}
            placeholder="Jane Smith"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all font-medium text-slate-900 shadow-sm"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-bold text-slate-700">Email Address *</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={handleChange('email')}
            placeholder="jane@example.com"
            className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all font-medium text-slate-900 shadow-sm"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-bold text-slate-700">Anything else we should know?</label>
        <textarea
          rows={3}
          value={formData.notes}
          onChange={handleChange('notes')}
          placeholder="E.g. agenda topics, specific questions..."
          className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all font-medium text-slate-900 shadow-sm resize-none"
        />
      </div>

      <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]">
        Schedule Event
      </button>
    </form>
  );
}`,

    "src/components/booking/SuccessView.jsx": `import { CheckCircle2, Calendar, Video, User } from 'lucide-react';
import { format } from 'date-fns';
import { HOST_INFO } from '../../data/services';

export default function SuccessView({ service, selectedDate, selectedSlot, email, onReset }) {
  return (
    <div className="p-12 text-center animate-in fade-in zoom-in duration-500">
      <div className="flex justify-center mb-6">
        <CheckCircle2 size={72} className="text-emerald-500" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">You're Scheduled!</h2>
      <p className="text-slate-500 mb-10">A calendar invitation has been sent to <br/><strong className="text-slate-900">{email}</strong></p>

      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-8 text-left shadow-sm max-w-md mx-auto mb-10">
        <h3 className="text-lg font-bold text-slate-900 mb-6 border-b border-slate-200 pb-4">{service?.label}</h3>
        
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
            <User size={18} /> {HOST_INFO.name}
          </div>
          <div className="flex items-center gap-3 text-sm font-bold text-blue-600">
            <Calendar size={18} />
            {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')} · {selectedSlot}
          </div>
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
            <Video size={18} /> Web conferencing details in the invite
          </div>
        </div>
      </div>

      <button className="text-blue-600 font-bold hover:underline" onClick={onReset}>
        Book Another Appointment
      </button>
    </div>
  );
}`,

    // --- VIEWS ---
    "src/views/ServiceSelectView.jsx": `import ServiceList from '../components/booking/ServiceList';

export default function ServiceSelectView({ onSelectService }) {
  return (
    <div className="p-8 pb-12 animate-in fade-in duration-500">
      <h2 className="text-xl font-bold text-slate-900 mb-8 border-b border-slate-100 pb-4">Select a Meeting Type</h2>
      <ServiceList onSelectService={onSelectService} />
    </div>
  );
}`,

    "src/views/DateTimeSelectView.jsx": `import { useState, useEffect } from 'react';
import BackButton from '../components/ui/BackButton';
import Calendar from '../components/booking/Calendar';
import TimeSlots from '../components/booking/TimeSlots';
import { generateSlots } from '../data/services';

export default function DateTimeSelectView({
  onBack,
  currentMonth,
  selectedDate,
  selectedSlot,
  onMonthChange,
  onDateSelect,
  onSlotSelect,
  onConfirm
}) {
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    if (selectedDate) {
      setSlots(generateSlots());
    }
  }, [selectedDate]);

  return (
    <div className="p-8 animate-in fade-in duration-500">
      <BackButton onClick={onBack} />
      <div className="flex flex-col md:flex-row md:items-start divide-y md:divide-y-0 md:divide-x divide-slate-100">
        <Calendar
          currentMonth={currentMonth}
          selectedDate={selectedDate}
          onMonthChange={onMonthChange}
          onDateSelect={onDateSelect}
        />
        <div className="md:pl-10">
          <TimeSlots
            selectedDate={selectedDate}
            availableSlots={slots}
            selectedSlot={selectedSlot}
            onSlotSelect={onSlotSelect}
            onConfirm={onConfirm}
          />
        </div>
      </div>
    </div>
  );
}`,

    "src/views/DetailsView.jsx": `import { format } from 'date-fns';
import { Clock, Calendar, Video } from 'lucide-react';
import BackButton from '../components/ui/BackButton';
import BookingForm from '../components/booking/BookingForm';

export default function DetailsView({
  service,
  selectedDate,
  selectedSlot,
  formData,
  onBack,
  onFormChange,
  onSubmit
}) {
  return (
    <div className="p-8 animate-in fade-in duration-500">
      <BackButton onClick={onBack} />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-50 space-y-6">
            <h3 className="text-2xl font-extrabold text-blue-900 tracking-tight">{service?.label}</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 font-semibold text-blue-600/80">
                <Clock size={18} /> {service?.duration} min session
              </div>
              <div className="flex items-center gap-3 font-bold text-blue-700">
                <Calendar size={18} />
                <span className="leading-tight">
                  {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')} <br/>
                  <span className="text-xl">{selectedSlot}</span>
                </span>
              </div>
              <div className="flex items-center gap-3 font-semibold text-blue-600/80">
                <Video size={18} /> Google Meet (link in invite)
              </div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-3">
          <BookingForm
            formData={formData}
            onChange={onFormChange}
            onSubmit={onSubmit}
          />
        </div>
      </div>
    </div>
  );
}`,

    // --- MAIN APP ---
    "src/App.jsx": `import { useState } from 'react';
import Header from './components/layout/Header';
import ServiceSelectView from './views/ServiceSelectView';
import DateTimeSelectView from './views/DateTimeSelectView';
import DetailsView from './views/DetailsView';
import SuccessView from './components/booking/SuccessView';

function App() {
  const [step, setStep] = useState('service');
  const [service, setService] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', notes: '' });

  const handleSelectService = (svc) => {
    setService(svc);
    setStep('datetime');
  };

  const handleSelectDate = (day) => {
    setSelectedDate(day);
    setSelectedSlot(null);
  };

  const handleConfirmTime = () => {
    if (selectedSlot) setStep('details');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setStep('success');
  };

  const handleReset = () => {
    setStep('service');
    setService(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setForm({ name: '', email: '', notes: '' });
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-10 flex items-center justify-center">
      <div className="w-full max-w-[900px] bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden min-h-[600px] flex flex-col">
        <Header />

        <div className="flex-1">
          {step === 'service' && (
            <ServiceSelectView onSelectService={handleSelectService} />
          )}

          {step === 'datetime' && (
            <DateTimeSelectView
              onBack={() => setStep('service')}
              currentMonth={currentMonth}
              selectedDate={selectedDate}
              selectedSlot={selectedSlot}
              onMonthChange={setCurrentMonth}
              onDateSelect={handleSelectDate}
              onSlotSelect={setSelectedSlot}
              onConfirm={handleConfirmTime}
            />
          )}

          {step === 'details' && (
            <DetailsView
              service={service}
              selectedDate={selectedDate}
              selectedSlot={selectedSlot}
              formData={form}
              onBack={() => setStep('datetime')}
              onFormChange={setForm}
              onSubmit={handleSubmit}
            />
          )}

          {step === 'success' && (
            <SuccessView
              service={service}
              selectedDate={selectedDate}
              selectedSlot={selectedSlot}
              email={form.email}
              onReset={handleReset}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;`,
  }
};
