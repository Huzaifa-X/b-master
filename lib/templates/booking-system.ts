import { TemplateDefinition } from './index';

export const bookingSystemTemplate: TemplateDefinition = {
  id: "booking-system",
  name: "Booking System",
  description: "Personal meeting scheduler (Calendly clone) with Tailwind CSS",
  category: "booking",
  files: {
    "package.json": JSON.stringify(
      {
        name: "booking-system",
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
          "date-fns": "^3.6.0"
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
    <title>Meeting Scheduler</title>
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
  </React.StrictMode>,
)`,

    // --- DATA ---
    "src/data/host.js": `export const HOST_INFO = {
  name: "Sarah Jenkins",
  role: "Senior Product Designer",
  avatar: "https://i.pravatar.cc/150?u=sarahj",
  company: "DesignCo",
  meetingTypes: [
    { id: '15min', duration: 15, title: "15 Min Quick Sync", color: "bg-blue-600" },
    { id: '30min', duration: 30, title: "30 Min Introduction", color: "bg-emerald-500" },
    { id: '60min', duration: 60, title: "60 Min Deep Dive", color: "bg-purple-600" }
  ]
};

// Generate fake available slots for a given day
export const generateSlots = (date) => {
  const slots = [];
  let currentHour = 9;

  for (let i = 0; i < 6; i++) {
    const isHalf = Math.random() > 0.5 ? '30' : '00';
    const ampm = currentHour < 12 ? 'am' : 'pm';
    const displayHour = currentHour > 12 ? currentHour - 12 : currentHour;
    slots.push(\`\${displayHour}:\${isHalf} \${ampm}\`);
    currentHour++;
  }
  return slots;
};`,

    // --- LAYOUT COMPONENTS ---
    "src/components/layout/Header.jsx": `export default function Header() {
  return (
    <header className="h-16 flex items-center justify-between px-8 bg-white border-b border-slate-200">
      <div className="flex items-center gap-2 cursor-pointer">
        <span className="bg-blue-600 text-white w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm">M</span>
        <span className="font-bold text-lg tracking-tight">MeetSync</span>
      </div>
      <div className="flex gap-6">
        <a href="#" className="text-slate-500 hover:text-slate-900 text-sm font-semibold transition-colors">Solutions</a>
        <a href="#" className="text-slate-500 hover:text-slate-900 text-sm font-semibold transition-colors">Features</a>
        <a href="#" className="text-slate-500 hover:text-slate-900 text-sm font-semibold transition-colors">Pricing</a>
      </div>
    </header>
  );
}`,

    "src/components/layout/Footer.jsx": `export default function Footer() {
  return (
    <footer className="py-8 text-center text-slate-400 text-sm">
      Powered by MeetSync
    </footer>
  );
}`,

    // --- UI COMPONENTS ---
    "src/components/ui/BackButton.jsx": `import { ChevronLeft } from 'lucide-react';

export default function BackButton({ onClick }) {
  return (
    <button className="w-9 h-9 border border-slate-200 rounded-full flex items-center justify-center cursor-pointer mb-6 text-blue-600 hover:bg-blue-600 hover:border-blue-600 hover:text-white transition-all shadow-sm" onClick={onClick}>
      <ChevronLeft size={20} />
    </button>
  );
}`,

    "src/components/ui/MetaRow.jsx": `export default function MetaRow({ icon: Icon, children, highlight = false }) {
  return (
    <div className={\`flex items-center gap-2 \${highlight ? 'text-blue-600' : 'text-slate-500'} font-semibold text-sm mb-3\`}>
      <Icon size={16} />
      <span>{children}</span>
    </div>
  );
}`,

    // --- BOOKING COMPONENTS ---
    "src/components/booking/HostProfile.jsx": `import { HOST_INFO } from '../../data/host';

export default function HostProfile() {
  return (
    <div className="text-center p-12 border-b border-slate-100">
      <img src={HOST_INFO.avatar} alt="Profile" className="w-20 h-20 rounded-full mx-auto mb-4 border-2 border-white shadow-sm" />
      <h2 className="text-xl font-bold text-slate-900">{HOST_INFO.name}</h2>
      <p className="text-slate-500 text-sm font-medium">{HOST_INFO.role} @ {HOST_INFO.company}</p>
      <p className="max-w-[500px] mx-auto mt-4 text-slate-600 text-[15px] leading-relaxed">
        Welcome to my scheduling page. Please follow the instructions to add an event to my calendar.
      </p>
    </div>
  );
}`,

    "src/components/booking/MeetingTypeCard.jsx": `import { Clock, ChevronRight } from 'lucide-react';

export default function MeetingTypeCard({ type, onClick }) {
  return (
    <button className="flex items-center w-full p-6 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-all text-left relative group" onClick={onClick}>
      <div className={\`absolute left-0 top-0 bottom-0 w-1.5 \${type.color}\`} />
      <div className="flex-1 pl-4">
        <h3 className="text-[17px] font-bold text-slate-900 mb-1">{type.title}</h3>
        <div className="flex items-center gap-1.5 text-slate-500 text-sm font-semibold">
          <Clock size={16} />
          <span>{type.duration} min</span>
        </div>
      </div>
      <ChevronRight className="text-slate-300 group-hover:text-slate-600 transition-colors" />
    </button>
  );
}`,

    "src/components/booking/MeetingTypeList.jsx": `import { HOST_INFO } from '../../data/host';
import MeetingTypeCard from './MeetingTypeCard';

export default function MeetingTypeList({ onSelectType }) {
  return (
    <div className="flex flex-col">
      {HOST_INFO.meetingTypes.map(type => (
        <MeetingTypeCard
          key={type.id}
          type={type}
          onClick={() => onSelectType(type)}
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
  isToday
} from 'date-fns';

export default function Calendar({
  currentMonth,
  selectedDate,
  onMonthChange,
  onDateSelect
}) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => onMonthChange(addMonths(currentMonth, 1));
  const prevMonth = () => onMonthChange(subMonths(currentMonth, 1));

  return (
    <div className="flex-1 p-8 md:border-r border-slate-100">
      <h3 className="text-lg font-bold text-slate-900 mb-6">Select a Date & Time</h3>

      <div className="flex items-center justify-between mb-8">
        <button className="p-2 hover:bg-slate-50 rounded-full text-blue-600 transition-colors" onClick={prevMonth}>
          <ChevronLeft size={20} />
        </button>
        <span className="font-bold text-[15px] uppercase tracking-wide text-slate-700">{format(currentMonth, 'MMMM yyyy')}</span>
        <button className="p-2 hover:bg-slate-50 rounded-full text-blue-600 transition-colors" onClick={nextMonth}>
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-[11px] font-bold text-slate-400 uppercase mb-4">{day}</div>
        ))}

        {calendarDays.map((day, idx) => {
          const isSelected = isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));

          if (!isCurrentMonth) return <div key={idx} className="aspect-square" />;

          return (
            <button
              key={idx}
              className={\`aspect-square flex flex-col items-center justify-center rounded-full text-sm font-bold transition-all relative
                \${isPast ? 'text-slate-200 cursor-default' : 'text-blue-600 cursor-pointer hover:bg-blue-50'}
                \${isSelected ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
              \`}
              onClick={() => !isPast && onDateSelect(day)}
              disabled={isPast}
            >
              <span>{format(day, 'd')}</span>
              {isToday(day) && !isSelected && <div className="absolute bottom-1.5 w-1 h-1 bg-current rounded-full" />}
              {!isPast && !isSelected && <div className="mt-1 w-1 h-1 bg-slate-200 rounded-full" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}`,

    "src/components/booking/TimeSlots.jsx": `import { format } from 'date-fns';

export default function TimeSlots({
  selectedDate,
  availableSlots,
  selectedSlot,
  onSlotSelect,
  onConfirm
}) {
  if (!selectedDate) return null;

  return (
    <div className="w-full md:w-[250px] p-8 bg-slate-50/50">
      <p className="text-[17px] font-bold text-slate-900 mb-6">{format(selectedDate, 'EEEE, MMMM d')}</p>
      <div className="flex flex-col gap-2 max-h-[380px] overflow-y-auto pr-2 scrollbar-thin">
        {availableSlots.map((slot, idx) => (
          <div key={idx} className="flex gap-2">
            <button
              className={\`flex-1 p-3.5 border font-bold text-sm rounded-lg transition-all \${selectedSlot === slot ? 'bg-slate-600 border-slate-600 text-white' : 'bg-white border-blue-500 text-blue-600 hover:border-2 hover:p-[13px]'}\`}
              onClick={() => onSlotSelect(slot)}
            >
              {slot}
            </button>
            {selectedSlot === slot && (
              <button className="flex-1 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-all animate-in slide-in-from-right-2 duration-300" onClick={onConfirm}>
                Confirm
              </button>
            )}
          </div>
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
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-bold text-slate-700">Name *</label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={handleChange('name')}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all shadow-sm"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-bold text-slate-700">Email *</label>
        <input
          type="email"
          required
          value={formData.email}
          onChange={handleChange('email')}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all shadow-sm"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-bold text-slate-700">What is this meeting about?</label>
        <textarea
          rows={4}
          value={formData.notes}
          onChange={handleChange('notes')}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all shadow-sm resize-none"
        />
      </div>

      <button type="submit" className="mt-4 bg-blue-600 text-white py-3.5 px-6 rounded-full font-bold text-[15px] hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]">
        Schedule Event
      </button>
    </form>
  );
}`,

    "src/components/booking/SuccessView.jsx": `import { CheckCircle2, Calendar, Video, User } from 'lucide-react';
import { format } from 'date-fns';
import { HOST_INFO } from '../../data/host';

export default function SuccessView({ meetingType, selectedDate }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-700">
      <div className="mb-6">
        <CheckCircle2 size={64} className="text-emerald-500 mx-auto" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">You are scheduled</h2>
      <p className="text-slate-500 mb-10 max-w-[350px]">A calendar invitation has been sent to your email address.</p>

      <div className="w-full max-w-md bg-slate-50 border border-slate-100 rounded-2xl p-8 text-left shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-6">{meetingType.title}</h3>
        
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 text-slate-600 font-semibold text-sm">
            <User size={18} />
            <span>{HOST_INFO.name}</span>
          </div>
          <div className="flex items-center gap-3 text-blue-600 font-bold text-sm">
            <Calendar size={18} />
            <span>{format(selectedDate, 'h:mma')} - {format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-3 text-slate-600 font-semibold text-sm">
            <Video size={18} />
            <span>Web conferencing details to follow.</span>
          </div>
        </div>
      </div>
    </div>
  );
}`,

    // --- VIEWS ---
    "src/views/SelectTypeView.jsx": `import HostProfile from '../components/booking/HostProfile';
import MeetingTypeList from '../components/booking/MeetingTypeList';

export default function SelectTypeView({ onSelectType }) {
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <HostProfile />
      <MeetingTypeList onSelectType={onSelectType} />
    </div>
  );
}`,

    "src/views/SelectTimeView.jsx": `import { Clock, Video } from 'lucide-react';
import BackButton from '../components/ui/BackButton';
import MetaRow from '../components/ui/MetaRow';
import Calendar from '../components/booking/Calendar';
import TimeSlots from '../components/booking/TimeSlots';
import { HOST_INFO, generateSlots } from '../data/host';

export default function SelectTimeView({
  meetingType,
  currentMonth,
  selectedDate,
  selectedSlot,
  onBack,
  onMonthChange,
  onDateSelect,
  onSlotSelect,
  onConfirm
}) {
  const availableSlots = generateSlots(selectedDate);

  return (
    <div className="flex flex-col md:flex-row h-full animate-in fade-in duration-500">
      <div className="w-full md:w-[320px] p-8 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col">
        <BackButton onClick={onBack} />
        <div className="flex flex-col">
          <p className="text-slate-500 text-sm font-bold mb-1 uppercase tracking-tight">{HOST_INFO.name}</p>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">{meetingType.title}</h2>
          <MetaRow icon={Clock}>{meetingType.duration} min</MetaRow>
          <MetaRow icon={Video}>Google Meet or Zoom</MetaRow>
        </div>
      </div>

      <div className="flex flex-1 flex-col md:flex-row h-full">
        <Calendar
          currentMonth={currentMonth}
          selectedDate={selectedDate}
          onMonthChange={onMonthChange}
          onDateSelect={onDateSelect}
        />
        <TimeSlots
          selectedDate={selectedDate}
          availableSlots={availableSlots}
          selectedSlot={selectedSlot}
          onSlotSelect={onSlotSelect}
          onConfirm={onConfirm}
        />
      </div>
    </div>
  );
}`,

    "src/views/EnterDetailsView.jsx": `import { Clock, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import BackButton from '../components/ui/BackButton';
import MetaRow from '../components/ui/MetaRow';
import BookingForm from '../components/booking/BookingForm';
import { HOST_INFO } from '../data/host';

export default function EnterDetailsView({
  meetingType,
  selectedDate,
  formData,
  onBack,
  onFormChange,
  onSubmit
}) {
  return (
    <div className="flex flex-col md:flex-row h-full animate-in fade-in duration-500">
      <div className="w-full md:w-[320px] p-8 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col">
        <BackButton onClick={onBack} />
        <div className="flex flex-col">
          <p className="text-slate-500 text-sm font-bold mb-1 uppercase tracking-tight">{HOST_INFO.name}</p>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">{meetingType.title}</h2>
          <MetaRow icon={Clock}>{meetingType.duration} min</MetaRow>
          <MetaRow icon={Calendar} highlight>
            {format(selectedDate, 'h:mma')} - {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </MetaRow>
          <MetaRow icon={MapPin}>
            Web conferencing details provided upon confirmation.
          </MetaRow>
        </div>
      </div>

      <div className="flex-1 p-8 md:p-12 max-w-[600px]">
        <h3 className="text-xl font-bold text-slate-900 mb-8">Enter Details</h3>
        <BookingForm
          formData={formData}
          onChange={onFormChange}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  );
}`,

    // --- MAIN APP ---
    "src/App.jsx": `import { useState } from 'react';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import SelectTypeView from './views/SelectTypeView';
import SelectTimeView from './views/SelectTimeView';
import EnterDetailsView from './views/EnterDetailsView';
import SuccessView from './components/booking/SuccessView';

function App() {
  const [currentStep, setCurrentStep] = useState('select-type');
  const [selectedMeetingType, setSelectedMeetingType] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', notes: '' });

  const handleSelectType = (type) => {
    setSelectedMeetingType(type);
    setCurrentStep('select-time');
  };

  const handleSelectDate = (day) => {
    setSelectedDate(day);
    setSelectedSlot(null);
  };

  const handleConfirmTime = () => {
    if (selectedSlot) setCurrentStep('enter-details');
  };

  const handleBookMeeting = (e) => {
    e.preventDefault();
    setCurrentStep('success');
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50">
      <Header />

      <main className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[1000px] min-h-[500px] overflow-hidden">
          {currentStep === 'select-type' && (
            <SelectTypeView onSelectType={handleSelectType} />
          )}

          {currentStep === 'select-time' && (
            <SelectTimeView
              meetingType={selectedMeetingType}
              currentMonth={currentMonth}
              selectedDate={selectedDate}
              selectedSlot={selectedSlot}
              onBack={() => setCurrentStep('select-type')}
              onMonthChange={setCurrentMonth}
              onDateSelect={handleSelectDate}
              onSlotSelect={setSelectedSlot}
              onConfirm={handleConfirmTime}
            />
          )}

          {currentStep === 'enter-details' && (
            <EnterDetailsView
              meetingType={selectedMeetingType}
              selectedDate={selectedDate}
              formData={formData}
              onBack={() => setCurrentStep('select-time')}
              onFormChange={setFormData}
              onSubmit={handleBookMeeting}
            />
          )}

          {currentStep === 'success' && (
            <SuccessView
              meetingType={selectedMeetingType}
              selectedDate={selectedDate}
            />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default App`,
  }
};
